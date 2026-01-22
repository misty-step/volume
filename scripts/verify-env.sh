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

# --- Configuration ---
# Define required env vars per service. Add new services here.
# Using simple arrays instead of associative arrays for portability.

CONVEX_REQUIRED_VARS=(
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "CLERK_JWT_ISSUER_DOMAIN"
  "OPENROUTER_API_KEY"
)

CONVEX_REQUIRED_DESCRIPTIONS=(
  "Stripe API key for payment processing"
  "Stripe webhook signature verification"
  "Clerk JWT issuer for auth validation"
  "OpenRouter API for AI features (Gemini 3 Flash)"
)

CONVEX_OPTIONAL_VARS=(
  "TEST_RESET_SECRET"
)

CONVEX_OPTIONAL_DESCRIPTIONS=(
  "Test data reset (optional, for E2E tests)"
)

# Convex deployment identifiers
CONVEX_DEV="dev:curious-salamander-943"
CONVEX_PROD="prod:whimsical-marten-631"

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
      echo "Verifies environment variables are set on Convex deployments."
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
  echo "$@" >&2
}

# Check if convex CLI is available
if ! command -v npx &> /dev/null; then
  log_error "Error: npx not found. Install Node.js and npm."
  exit 2
fi

# Get env vars from a Convex deployment
# Returns: newline-separated list of VAR_NAME=value
get_convex_env() {
  local deployment="$1"
  CONVEX_DEPLOYMENT="$deployment" npx convex env list 2>/dev/null || echo ""
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

# Header
log "Environment Variable Verification"
log "=================================="

# Check deployments
if [[ "$PROD_ONLY" == "false" ]]; then
  check_deployment "Development" "$CONVEX_DEV"
fi
check_deployment "Production" "$CONVEX_PROD"

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
  log "  CONVEX_DEPLOYMENT=<deployment> npx convex env set <VAR_NAME> \"<value>\""
  log ""
  log "Example:"
  log "  CONVEX_DEPLOYMENT=$CONVEX_PROD npx convex env set STRIPE_SECRET_KEY \"sk_live_...\""
  exit 1
fi
