#!/usr/bin/env bash
set -eo pipefail

# Stripe Webhook Forwarding for Local Development
#
# Automatically:
# 1. Gets webhook signing secret from Stripe CLI
# 2. Sets it in Convex dev environment
# 3. Forwards webhooks to local Convex deployment
#
# Requires: stripe CLI logged in (`stripe login`)

WEBHOOK_URL="https://curious-salamander-943.convex.site/stripe/webhook"

# Check if stripe CLI is available
if ! command -v stripe &> /dev/null; then
  echo "[Stripe] CLI not installed. Webhook forwarding disabled."
  echo "[Stripe] Install: brew install stripe/stripe-cli/stripe"
  # Keep process alive so concurrently doesn't fail
  tail -f /dev/null
fi

# Check if logged in
if ! stripe config --list &> /dev/null 2>&1; then
  echo "[Stripe] Not logged in. Run: stripe login"
  tail -f /dev/null
fi

echo "[Stripe] Setting up webhook forwarding..."

# Get webhook secret and set in Convex (suppress convex output)
WEBHOOK_SECRET=$(stripe listen --forward-to "$WEBHOOK_URL" --print-secret 2>/dev/null)
if [[ -n "$WEBHOOK_SECRET" ]]; then
  bunx convex env set STRIPE_WEBHOOK_SECRET "$WEBHOOK_SECRET" > /dev/null 2>&1
  echo "[Stripe] Webhook secret configured"
fi

# Start forwarding (this blocks and shows webhook events)
echo "[Stripe] Forwarding to $WEBHOOK_URL"
exec stripe listen --forward-to "$WEBHOOK_URL"
