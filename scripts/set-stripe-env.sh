#!/usr/bin/env bash
set -eo pipefail

# Safe Stripe Environment Variable Setter
#
# Validates key type matches deployment before setting.
# Prevents live keys in dev or test keys in prod.
#
# Usage:
#   ./scripts/set-stripe-env.sh dev STRIPE_SECRET_KEY sk_test_xxx
#   ./scripts/set-stripe-env.sh prod STRIPE_SECRET_KEY sk_live_xxx
#   ./scripts/set-stripe-env.sh dev STRIPE_WEBHOOK_SECRET whsec_xxx

usage() {
  echo "Usage: $0 <dev|prod> <VAR_NAME> <value>"
  echo ""
  echo "Safely set Stripe environment variables with key validation."
  echo ""
  echo "Arguments:"
  echo "  dev|prod    Target deployment"
  echo "  VAR_NAME    Environment variable (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)"
  echo "  value       The value to set"
  echo ""
  echo "Validation:"
  echo "  - STRIPE_SECRET_KEY: prod requires sk_live_*, dev requires sk_test_*"
  echo "  - STRIPE_WEBHOOK_SECRET: no live/test validation (format doesn't distinguish)"
  echo ""
  echo "Examples:"
  echo "  $0 dev STRIPE_SECRET_KEY sk_test_51SV..."
  echo "  $0 prod STRIPE_SECRET_KEY sk_live_51SV..."
  echo "  $0 dev STRIPE_WEBHOOK_SECRET whsec_..."
  exit 1
}

[[ $# -ne 3 ]] && usage

ENV="$1"
VAR_NAME="$2"
VALUE="$3"

# Map env to deployment
case "$ENV" in
  dev)  DEPLOYMENT="dev:curious-salamander-943" ;;
  prod) DEPLOYMENT="prod:whimsical-marten-631" ;;
  *)    echo "Error: First argument must be 'dev' or 'prod'"; exit 1 ;;
esac

# Validate key type for STRIPE_SECRET_KEY
if [[ "$VAR_NAME" == "STRIPE_SECRET_KEY" ]]; then
  if [[ "$ENV" == "prod" ]]; then
    if [[ "$VALUE" != sk_live_* ]]; then
      echo "ERROR: Production requires live key (sk_live_*)"
      echo "       You provided: ${VALUE:0:12}..."
      echo ""
      echo "This is blocked to prevent test payments in production."
      echo "Use: $0 prod STRIPE_SECRET_KEY sk_live_..."
      exit 1
    fi
  else
    if [[ "$VALUE" == sk_live_* ]]; then
      echo "ERROR: Development should use test key (sk_test_*)"
      echo "       You provided: ${VALUE:0:12}..."
      echo ""
      echo "This is blocked to prevent real charges in development."
      echo "Use: $0 dev STRIPE_SECRET_KEY sk_test_..."
      exit 1
    fi
  fi
  echo "Key type validation: PASSED (${VALUE:0:8}... for $ENV)"
fi

# Trim whitespace (common source of bugs)
VALUE=$(printf '%s' "$VALUE" | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

echo "Setting $VAR_NAME on $ENV deployment ($DEPLOYMENT)..."
CONVEX_DEPLOYMENT="$DEPLOYMENT" bunx convex env set "$VAR_NAME" "$VALUE"

echo ""
echo "Success! Verifying..."
CONVEX_DEPLOYMENT="$DEPLOYMENT" bunx convex env list | grep "^$VAR_NAME=" | sed 's/=.*/=***/'
echo ""
echo "To verify full setup, run: ./scripts/verify-env.sh"
