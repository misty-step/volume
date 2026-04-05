#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="run"

usage() {
  cat <<'EOF'
Usage: ./scripts/setup.sh [--check]

Bootstrap the repository for local development.

Options:
  --check     Validate required local tooling with no file changes
  --help, -h  Show this message

Exit codes:
  0 = Success
  1 = Missing required tooling
  2 = Invalid arguments
EOF
}

log() {
  echo "$@"
}

log_error() {
  echo "$@" >&2
}

for arg in "$@"; do
  case "$arg" in
    --check)
      MODE="check"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log_error "Error: unknown argument '$arg'"
      usage >&2
      exit 2
      ;;
  esac
done

declare -a MISSING_REQUIRED_TOOLS=()
declare -a MISSING_OPTIONAL_TOOLS=()
declare -a PENDING_CORE_ENV=()
declare -a PENDING_FEATURE_ENV=()

require_tool() {
  local tool="$1"
  local purpose="$2"
  local install_hint="$3"

  if ! command -v "$tool" >/dev/null 2>&1; then
    MISSING_REQUIRED_TOOLS+=("  - $tool: $purpose. $install_hint")
  fi
}

recommend_tool() {
  local tool="$1"
  local purpose="$2"
  local install_hint="$3"

  if ! command -v "$tool" >/dev/null 2>&1; then
    MISSING_OPTIONAL_TOOLS+=("  - $tool: $purpose. $install_hint")
  fi
}

check_required_tools() {
  require_tool "bun" "Run installs and package scripts" "Install Bun from https://bun.sh/docs/installation"
  require_tool "bunx" "Run Convex and other repo-local CLIs" "Reinstall or repair your Bun installation so bunx is on PATH"
  require_tool "git" "Read repository hook configuration and work with this clone" "Install Git or Xcode Command Line Tools"

  recommend_tool "stripe" "Forward local billing webhooks during \`bun run dev\`" "Install via \`brew install stripe/stripe-cli/stripe\` and run \`stripe login\`"

  if ((${#MISSING_REQUIRED_TOOLS[@]} > 0)); then
    log_error "==> Missing required tools"
    printf '%s\n' "${MISSING_REQUIRED_TOOLS[@]}" >&2

    if ((${#MISSING_OPTIONAL_TOOLS[@]} > 0)); then
      log_error
      log_error "==> Optional tools not found"
      printf '%s\n' "${MISSING_OPTIONAL_TOOLS[@]}" >&2
    fi

    return 1
  fi

  return 0
}

print_optional_tool_warnings() {
  if ((${#MISSING_OPTIONAL_TOOLS[@]} == 0)); then
    return
  fi

  log
  log "==> Optional tools not found"
  printf '%s\n' "${MISSING_OPTIONAL_TOOLS[@]}"
}

env_value() {
  local env_file="$1"
  local key="$2"

  if [[ ! -f "$env_file" ]]; then
    return 1
  fi

  awk -F= -v target="$key" '
    $0 !~ /^[[:space:]]*#/ && $1 == target {
      sub(/^[^=]*=/, "", $0)
      print $0
      exit
    }
  ' "$env_file"
}

track_pending_env() {
  local env_file="$1"
  local key="$2"
  local placeholder="$3"
  local detail="$4"
  local bucket="$5"
  local value

  value="$(env_value "$env_file" "$key" || true)"

  if [[ -z "$value" || "$value" == "$placeholder" ]]; then
    if [[ "$bucket" == "core" ]]; then
      PENDING_CORE_ENV+=("  - $key: $detail")
    else
      PENDING_FEATURE_ENV+=("  - $key: $detail")
    fi
  fi
}

collect_pending_env() {
  local env_file="$1"

  PENDING_CORE_ENV=()
  PENDING_FEATURE_ENV=()

  track_pending_env \
    "$env_file" \
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    "pk_test_YOUR_PUBLISHABLE_KEY_HERE" \
    "Required for browser auth." \
    "core"
  track_pending_env \
    "$env_file" \
    "CLERK_SECRET_KEY" \
    "sk_test_YOUR_SECRET_KEY_HERE" \
    "Required for server auth." \
    "core"
  track_pending_env \
    "$env_file" \
    "CLERK_JWT_ISSUER_DOMAIN" \
    "https://your-clerk-domain.clerk.accounts.dev" \
    "Required before Convex can validate Clerk tokens." \
    "core"

  track_pending_env \
    "$env_file" \
    "OPENROUTER_API_KEY" \
    "sk-or-v1-YOUR_OPENROUTER_API_KEY_HERE" \
    "Required for coach features and for /api/health to report pass." \
    "feature"
  track_pending_env \
    "$env_file" \
    "STRIPE_SECRET_KEY" \
    "sk_test_your_secret_key_here" \
    "Required for checkout and customer portal routes." \
    "feature"
  track_pending_env \
    "$env_file" \
    "NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID" \
    "price_your_monthly_price_id" \
    "Required for pricing and checkout flows." \
    "feature"
  track_pending_env \
    "$env_file" \
    "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID" \
    "price_your_annual_price_id" \
    "Required for pricing and checkout flows." \
    "feature"
}

print_pending_env_summary() {
  local env_file="$1"

  collect_pending_env "$env_file"

  log
  log "==> Pending .env.local setup"

  if ((${#PENDING_CORE_ENV[@]} == 0)); then
    log "Core local auth config already looks filled in."
  else
    log "Required before the core local app flow is useful:"
    printf '%s\n' "${PENDING_CORE_ENV[@]}"
  fi

  if ((${#PENDING_FEATURE_ENV[@]} == 0)); then
    log "Coach and billing env values already look filled in."
  else
    log
    log "Required for coach, billing, and health-check parity:"
    printf '%s\n' "${PENDING_FEATURE_ENV[@]}"
  fi
}

print_hooks_note() {
  local local_hooks_path
  local global_hooks_path

  local_hooks_path="$(git config --local --get core.hooksPath || true)"
  global_hooks_path="$(git config --global --get core.hooksPath || true)"

  if [[ -n "$local_hooks_path" || -n "$global_hooks_path" ]]; then
    cat <<EOF

==> Git hooks note
Detected a custom git hooksPath configuration.
Lefthook may warn instead of installing repository hooks automatically.

Local hooksPath : ${local_hooks_path:-<unset>}
Global hooksPath: ${global_hooks_path:-<unset>}

If you want this repository to own its hooks, run one of:
  lefthook install --reset-hooks-path
  lefthook install --force
EOF
  fi
}

print_next_steps() {
  cat <<'EOF'

==> Canonical next steps
1. Fill in the pending `.env.local` values listed above.
2. Run `bunx convex dev` once to provision or sync your dev deployment. That command refreshes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.
3. Sync Clerk into Convex after you know your issuer domain:
   `bunx convex env set CLERK_JWT_ISSUER_DOMAIN "https://<your-dev>.clerk.accounts.dev"`
4. Sync OpenRouter into Convex if you want coach features and `/api/health` locally:
   `bunx convex env set OPENROUTER_API_KEY "sk-or-..."`
5. Start the app with `bun run dev`.
6. Optional: install Stripe CLI and run `stripe login` so `bun run dev` can forward local billing webhooks and set `STRIPE_WEBHOOK_SECRET` automatically.
EOF
}

check_required_tools || exit 1

if [[ "$MODE" == "check" ]]; then
  log "==> Required tools look good"
  print_optional_tool_warnings
  exit 0
fi

created_env_file=0
if [[ ! -f .env.local && -f .env.example ]]; then
  cp .env.example .env.local
  created_env_file=1
elif [[ ! -f .env.local ]]; then
  log_error "Warning: .env.example not found, so .env.local was not created."
fi

log "==> Installing dependencies"
bun install --frozen-lockfile

print_optional_tool_warnings
print_hooks_note

if [[ "$created_env_file" -eq 1 ]]; then
  log
  log "==> Created .env.local from .env.example"
fi

print_pending_env_summary ".env.local"
print_next_steps
