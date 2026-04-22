#!/usr/bin/env bash
set -eo pipefail

# Verify Environment Variables - Production Deployment Safety Check
#
# Deep module design: simple interface, handles all complexity internally.
# Run before any production deployment to catch missing configuration.
#
# Usage:
#   ./scripts/verify-env.sh              # Check all environments
#   ./scripts/verify-env.sh --prod-only  # Check only production
#   ./scripts/verify-env.sh --quiet      # Exit code only, no output
#
# Exit codes:
#   0 = All required env vars present
#   1 = Missing env vars (lists which ones)
#   2 = Tool not available (convex CLI, etc.)

OPENROUTER_API_KEY_VAR=""
OPENROUTER_COACH_MODEL_OVERRIDE_VAR=""
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

load_openrouter_policy() {
  local policy_lines
  if ! policy_lines=$(bun "$SCRIPT_DIR/print-openrouter-policy.ts" 2>/dev/null); then
    log_error "Error: Could not load canonical OpenRouter policy."
    exit 2
  fi

  while IFS='=' read -r key value; do
    case "$key" in
      OPENROUTER_API_KEY_VAR) OPENROUTER_API_KEY_VAR="$value" ;;
      OPENROUTER_COACH_MODEL_OVERRIDE_VAR) OPENROUTER_COACH_MODEL_OVERRIDE_VAR="$value" ;;
    esac
  done <<< "$policy_lines"

  if [[ -z "$OPENROUTER_API_KEY_VAR" || -z "$OPENROUTER_COACH_MODEL_OVERRIDE_VAR" ]]; then
    log_error "Error: Canonical OpenRouter policy returned incomplete config."
    exit 2
  fi
}

# --- Parse Arguments ---
PROD_ONLY=false
QUIET=false
for arg in "$@"; do
  case $arg in
    --prod-only) PROD_ONLY=true ;;
    --quiet) QUIET=true ;;
    --help|-h)
      echo "Usage: $0 [--prod-only] [--quiet]"
      echo ""
      echo "Verifies production-critical environment variables across Convex and Vercel."
      echo ""
      echo "Options:"
      echo "  --prod-only  Only check production deployment"
      echo "  --quiet      Suppress output, use exit code only"
      echo ""
      echo "Exit codes:"
      echo "  0 = All required env vars present"
      echo "  1 = Missing env vars"
      echo "  2 = Tool not available"
      exit 0
      ;;
  esac
done

# --- Helpers ---
log() {
  [[ "$QUIET" == "true" ]] || echo "$@"
}

log_error() {
  [[ "$QUIET" == "true" ]] || echo "$@" >&2
}

# Check if convex CLI is available
if ! command -v bun &> /dev/null || ! command -v bunx &> /dev/null; then
  log_error "Error: bun/bunx not found. Install Bun."
  exit 2
fi

if ! command -v vercel &> /dev/null; then
  log_error "Error: vercel CLI not found. Install Vercel CLI."
  exit 2
fi

if ! command -v jq &> /dev/null; then
  log_error "Error: jq not found. Install jq."
  exit 2
fi

load_openrouter_policy

# --- Configuration ---
# Define required env vars per service. Add new services here.
# Using simple arrays instead of associative arrays for portability.

CONVEX_REQUIRED_VARS=(
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "CLERK_JWT_ISSUER_DOMAIN"
  "$OPENROUTER_API_KEY_VAR"
)

CONVEX_REQUIRED_DESCRIPTIONS=(
  "Stripe API key for payment processing"
  "Stripe webhook signature verification"
  "Clerk JWT issuer for auth validation"
  "OpenRouter API for AI features"
)

CONVEX_OPTIONAL_VARS=(
  "TEST_RESET_SECRET"
)

CONVEX_OPTIONAL_DESCRIPTIONS=(
  "Test data reset (optional, for E2E tests)"
)

VERCEL_REQUIRED_VARS=(
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "CLERK_SECRET_KEY"
  "CLERK_JWT_ISSUER_DOMAIN"
  "STRIPE_SECRET_KEY"
  "NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID"
  "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID"
  "NEXT_PUBLIC_CANARY_ENDPOINT"
  "NEXT_PUBLIC_CANARY_API_KEY"
  "$OPENROUTER_API_KEY_VAR"
)

VERCEL_REQUIRED_DESCRIPTIONS=(
  "Clerk publishable key for browser auth"
  "Clerk secret key for server auth"
  "Clerk JWT issuer for auth validation"
  "Stripe API key for checkout and billing"
  "Stripe monthly price ID"
  "Stripe annual price ID"
  "Canary base URL for browser error capture"
  "Canary ingest-only key for browser error capture"
  "OpenRouter API for coach runtime"
)

VERCEL_OPTIONAL_VALUE_VALIDATED_VARS=(
  "$OPENROUTER_COACH_MODEL_OVERRIDE_VAR"
)

# `vercel env pull` exposes stable value data for public/runtime config here, but
# secret values are redacted in this workflow. Secret health is checked via
# production runtime probes below instead of pretending we can lint redacted data.
VERCEL_VALUE_VALIDATED_VARS=(
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "CLERK_JWT_ISSUER_DOMAIN"
  "NEXT_PUBLIC_CANARY_ENDPOINT"
  "NEXT_PUBLIC_CANARY_API_KEY"
  "NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID"
  "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID"
)

PRODUCTION_HEALTH_URL="https://volume.fitness/api/health"

# Convex deployment identifiers
CONVEX_DEV="dev:curious-salamander-943"
CONVEX_PROD="prod:whimsical-marten-631"

run_vercel() {
  if vercel "$@" 2>/dev/null; then
    return 0
  fi

  if command -v npx &> /dev/null && npx vercel "$@" 2>/dev/null; then
    return 0
  fi

  if command -v zsh &> /dev/null; then
    local cmd="vercel"
    local arg
    for arg in "$@"; do
      cmd+=" $(printf '%q' "$arg")"
    done
    zsh -lc "$cmd"
    return
  fi

  return 1
}

get_vercel_env_list() {
  run_vercel env ls 2>/dev/null || echo ""
}

is_value_validated_var() {
  local target="$1"
  local var
  for var in "${VERCEL_VALUE_VALIDATED_VARS[@]}"; do
    [[ "$var" == "$target" ]] && return 0
  done
  return 1
}

# Get env vars from a Convex deployment
# Returns: newline-separated list of VAR_NAME=value
get_convex_env() {
  local deployment="$1"
  # Use --prod flag for production, no flag for dev (project default)
  local prod_flag=""
  if [[ "$deployment" == *"prod:"* ]]; then
    prod_flag="--prod"
  fi
  bunx convex env list $prod_flag 2>/dev/null || echo ""
}

# Check if a var exists in env list
var_exists() {
  local var_name="$1"
  local env_list="$2"
  echo "$env_list" | grep -q "^${var_name}=" && return 0
  return 1
}

# Get value of a var from env list
get_env_value() {
  local var_name="$1"
  local env_list="$2"
  echo "$env_list" | grep "^${var_name}=" | cut -d'=' -f2-
}

unquote_env_value() {
  local value="$1"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

trim_env_value() {
  local value
  value=$(unquote_env_value "$1")
  printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

value_has_wrapped_whitespace() {
  local raw_value="$1"
  local unquoted_value
  local trimmed_value

  unquoted_value=$(unquote_env_value "$raw_value")
  trimmed_value=$(trim_env_value "$raw_value")

  [[ -n "$trimmed_value" && "$unquoted_value" != "$trimmed_value" ]]
}

value_has_literal_newline_escape() {
  local raw_value="$1"
  local unquoted_value
  unquoted_value=$(unquote_env_value "$raw_value")
  [[ "$unquoted_value" == *\\n* || "$unquoted_value" == *\\r* ]]
}

# Validate Stripe key type matches deployment environment
# Returns: 0 = valid, 1 = mismatch, 2 = can't validate (unknown format)
validate_stripe_key_type() {
  local deployment_type="$1"  # "dev" or "prod"
  local key_value="$2"

  local is_live=false
  local is_test=false

  [[ "$key_value" == sk_live_* ]] && is_live=true
  [[ "$key_value" == sk_test_* ]] && is_test=true

  # Can't validate unknown format (webhook secrets, etc.)
  [[ "$is_live" == "false" && "$is_test" == "false" ]] && return 2

  if [[ "$deployment_type" == "prod" ]]; then
    if [[ "$is_test" == "true" ]]; then
      log_error "    ERROR: Test key (sk_test_*) in PRODUCTION!"
      log_error "           Production requires live keys (sk_live_*)"
      return 1
    fi
  else
    if [[ "$is_live" == "true" ]]; then
      log_error "    ERROR: Live key (sk_live_*) in DEVELOPMENT!"
      log_error "           Development should use test keys (sk_test_*)"
      return 1
    fi
  fi

  return 0
}

get_vercel_env() {
  local environment="$1"
  local env_file
  env_file=$(mktemp)
  trap "rm -f '$env_file'" RETURN

  if ! run_vercel env pull "$env_file" --yes --environment "$environment" >/dev/null 2>&1; then
    echo ""
    return 1
  fi

  grep -E '^[A-Z0-9_]+=' "$env_file" || true
}

vercel_var_exists() {
  local var_name="$1"
  local env_list="$2"
  echo "$env_list" | grep -Eq "^[[:space:]]*${var_name}[[:space:]].*Production"
}

check_production_health() {
  local env_names="$1"
  local health_json
  if ! health_json=$(curl -sSL "$PRODUCTION_HEALTH_URL" 2>/dev/null); then
    log_error "    Error: Could not fetch production health endpoint"
    MISSING_VARS+=("Vercel:/api/health (UNREACHABLE)")
    return 1
  fi

  if ! echo "$health_json" | jq -e '.checks' >/dev/null; then
    log_error "    Error: Production health endpoint did not return check data"
    MISSING_VARS+=("Vercel:/api/health (INVALID PAYLOAD)")
    return 1
  fi

  if ! echo "$health_json" | jq -e '.status == "pass"' >/dev/null; then
    log "    [WARN] /api/health reports overall failure; checking component status"
  fi

  if ! echo "$health_json" | jq -e '.checks.clientRuntime.status == "pass"' >/dev/null; then
    log "    [INVALID] public client runtime env - browser bootstrap health failed"
    MISSING_VARS+=("Vercel:clientRuntime (HEALTH CHECK FAIL)")
    return 1
  fi

  if ! echo "$health_json" | jq -e '.checks.coachRuntime.status == "pass"' >/dev/null; then
    log "    [INVALID] $OPENROUTER_API_KEY_VAR - coach runtime health failed"
    MISSING_VARS+=("Vercel:${OPENROUTER_API_KEY_VAR} (HEALTH CHECK FAIL)")
    return 1
  fi

  if ! echo "$health_json" | jq -e '.checks.stripe.status == "pass"' >/dev/null; then
    log "    [INVALID] STRIPE_SECRET_KEY - stripe health failed"
    MISSING_VARS+=("Vercel:STRIPE_SECRET_KEY (HEALTH CHECK FAIL)")
    return 1
  fi

  if ! echo "$health_json" | jq -e '.checks.errorTracking.status == "pass"' >/dev/null; then
    log "    [INVALID] runtime error-tracking health failed"
    MISSING_VARS+=("Vercel:ERROR_TRACKING (HEALTH CHECK FAIL)")
    return 1
  fi

  log "    [OK] /api/health"
}

# --- Main Logic ---
MISSING_COUNT=0
declare -a MISSING_VARS=()

check_deployment() {
  local name="$1"
  local deployment="$2"

  log ""
  log "==> Checking $name ($deployment)"

  local env_list
  env_list=$(get_convex_env "$deployment")

  if [[ -z "$env_list" ]]; then
    log_error "    Error: Could not fetch env vars (check deployment ID)"
    MISSING_COUNT=$((MISSING_COUNT + ${#CONVEX_REQUIRED_VARS[@]}))
    return
  fi

  local missing_here=0
  local i

  # Determine deployment type from name
  local deploy_type="dev"
  [[ "$name" == *"Production"* ]] && deploy_type="prod"

  # Check required vars
  for i in "${!CONVEX_REQUIRED_VARS[@]}"; do
    local var="${CONVEX_REQUIRED_VARS[$i]}"
    local desc="${CONVEX_REQUIRED_DESCRIPTIONS[$i]}"
    if var_exists "$var" "$env_list"; then
      # Additional validation for Stripe secret key
      if [[ "$var" == "STRIPE_SECRET_KEY" ]]; then
        local key_value
        key_value=$(get_env_value "$var" "$env_list")
        if ! validate_stripe_key_type "$deploy_type" "$key_value"; then
          log "    [WRONG TYPE] $var - key type doesn't match environment"
          MISSING_VARS+=("$name:$var (WRONG KEY TYPE)")
          missing_here=$((missing_here + 1))
        else
          log "    [OK] $var"
        fi
      else
        log "    [OK] $var"
      fi
    else
      log "    [MISSING] $var - $desc"
      MISSING_VARS+=("$name:$var")
      missing_here=$((missing_here + 1))
    fi
  done

  MISSING_COUNT=$((MISSING_COUNT + missing_here))

  # Check optional vars (info only, don't count as missing)
  for i in "${!CONVEX_OPTIONAL_VARS[@]}"; do
    local var="${CONVEX_OPTIONAL_VARS[$i]}"
    local desc="${CONVEX_OPTIONAL_DESCRIPTIONS[$i]}"
    if var_exists "$var" "$env_list"; then
      log "    [OK] $var (optional)"
    else
      log "    [--] $var - $desc (optional, not set)"
    fi
  done
}

check_vercel_environment() {
  local environment="$1"
  local display_name
  local first_char="${environment%"${environment#?}"}"
  local rest="${environment#?}"
  display_name="$(printf '%s' "$first_char" | tr '[:lower:]' '[:upper:]')$rest"

  log ""
  log "==> Checking Vercel $display_name runtime"

  local env_names
  env_names=$(get_vercel_env_list)
  if [[ -z "$env_names" ]]; then
    log_error "    Error: Could not fetch Vercel env names"
    MISSING_COUNT=$((MISSING_COUNT + ${#VERCEL_REQUIRED_VARS[@]}))
    return
  fi

  local env_list
  if ! env_list=$(get_vercel_env "$environment"); then
    log_error "    Error: Could not pull Vercel env values"
    MISSING_COUNT=$((MISSING_COUNT + ${#VERCEL_VALUE_VALIDATED_VARS[@]}))
    return
  fi

  local missing_here=0
  local i

  for i in "${!VERCEL_REQUIRED_VARS[@]}"; do
    local var="${VERCEL_REQUIRED_VARS[$i]}"
    local desc="${VERCEL_REQUIRED_DESCRIPTIONS[$i]}"

    if ! vercel_var_exists "$var" "$env_names"; then
      log "    [MISSING] $var - $desc"
      MISSING_VARS+=("Vercel:${var}")
      missing_here=$((missing_here + 1))
      continue
    fi

    if ! is_value_validated_var "$var"; then
      log "    [OK] $var"
    fi
  done

  for var in "${VERCEL_VALUE_VALIDATED_VARS[@]}"; do
    local raw_value
    raw_value=$(get_env_value "$var" "$env_list")
    local trimmed_value
    trimmed_value=$(trim_env_value "$raw_value")

    if [[ -z "$trimmed_value" ]]; then
      log "    [BLANK] $var - value missing in pulled Vercel env"
      MISSING_VARS+=("Vercel:${var} (BLANK)")
      missing_here=$((missing_here + 1))
      continue
    fi

    if value_has_wrapped_whitespace "$raw_value"; then
      log "    [INVALID] $var - leading/trailing whitespace"
      MISSING_VARS+=("Vercel:${var} (LEADING/TRAILING WHITESPACE)")
      missing_here=$((missing_here + 1))
      continue
    fi

    if value_has_literal_newline_escape "$raw_value"; then
      log "    [INVALID] $var - literal newline escape sequence"
      MISSING_VARS+=("Vercel:${var} (LITERAL NEWLINE ESCAPE)")
      missing_here=$((missing_here + 1))
      continue
    fi

    log "    [OK] $var"
  done

  for var in "${VERCEL_OPTIONAL_VALUE_VALIDATED_VARS[@]}"; do
    if ! vercel_var_exists "$var" "$env_names"; then
      log "    [--] $var - optional coach model override not set"
      continue
    fi

    local raw_value
    raw_value=$(get_env_value "$var" "$env_list")
    local trimmed_value
    trimmed_value=$(trim_env_value "$raw_value")

    if [[ -z "$trimmed_value" ]]; then
      log "    [BLANK] $var - optional override is blank"
      MISSING_VARS+=("Vercel:${var} (BLANK OVERRIDE)")
      missing_here=$((missing_here + 1))
      continue
    fi

    if value_has_wrapped_whitespace "$raw_value"; then
      log "    [INVALID] $var - leading/trailing whitespace"
      MISSING_VARS+=("Vercel:${var} (LEADING/TRAILING WHITESPACE)")
      missing_here=$((missing_here + 1))
      continue
    fi

    if value_has_literal_newline_escape "$raw_value"; then
      log "    [INVALID] $var - literal newline escape sequence"
      MISSING_VARS+=("Vercel:${var} (LITERAL NEWLINE ESCAPE)")
      missing_here=$((missing_here + 1))
      continue
    fi

    log "    [OK] $var (optional override)"
  done

  if ! check_production_health "$env_names"; then
    missing_here=$((missing_here + 1))
  fi

  MISSING_COUNT=$((MISSING_COUNT + missing_here))
}

# Header
log "Environment Variable Verification"
log "=================================="

# Check deployments
if [[ "$PROD_ONLY" == "false" ]]; then
  check_deployment "Development" "$CONVEX_DEV"
fi
check_deployment "Production" "$CONVEX_PROD"
check_vercel_environment "production"

# Summary
log ""
log "=================================="
if [[ $MISSING_COUNT -eq 0 ]]; then
  log "[PASS] All required environment variables are set"
  exit 0
else
  log_error "[FAIL] Missing $MISSING_COUNT required environment variable(s):"
  for missing in "${MISSING_VARS[@]}"; do
    log_error "  - $missing"
  done
  log ""
  log "To set a missing variable:"
  log "  CONVEX_DEPLOYMENT=<deployment> bunx convex env set <VAR_NAME> \"<value>\""
  log "  vercel env add <VAR_NAME> production"
  log ""
  log "Example:"
  log "  CONVEX_DEPLOYMENT=$CONVEX_PROD bunx convex env set STRIPE_SECRET_KEY \"sk_live_...\""
  log "  vercel env add ${OPENROUTER_API_KEY_VAR} production < secret.txt"
  exit 1
fi
