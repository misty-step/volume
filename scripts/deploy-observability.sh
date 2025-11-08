#!/usr/bin/env bash
set -euo pipefail

# Deploy Observability Stack - Automated Configuration
# Automates Vercel environment variable setup for Sentry integration
# Prerequisites: vercel CLI installed and authenticated

echo "==> Observability Stack - Automated Deployment"
echo

# Check prerequisites
command -v vercel >/dev/null || { echo "Error: vercel CLI not found"; exit 1; }
vercel whoami >/dev/null || { echo "Error: not logged in to Vercel"; exit 1; }
[[ -f package.json ]] || { echo "Error: run from project root"; exit 1; }

echo "Prerequisites verified"
echo

# Collect Sentry credentials
echo "Get credentials from: https://sentry.io/settings/projects/"
echo
read -p "SENTRY_DSN (https://...@sentry.io/...): " SENTRY_DSN
read -sp "SENTRY_AUTH_TOKEN (from Settings > Auth Tokens): " SENTRY_AUTH_TOKEN
echo
read -p "SENTRY_ORG (org slug): " SENTRY_ORG
read -p "SENTRY_PROJECT (project slug): " SENTRY_PROJECT
echo

# Set Vercel environment variables
echo "==> Configuring Vercel environment variables..."
echo

echo "$SENTRY_DSN" | vercel env add NEXT_PUBLIC_SENTRY_DSN production preview development
echo "$SENTRY_AUTH_TOKEN" | vercel env add SENTRY_AUTH_TOKEN production --sensitive
echo "$SENTRY_ORG" | vercel env add SENTRY_ORG production
echo "$SENTRY_PROJECT" | vercel env add SENTRY_PROJECT production

echo
echo "==> Configuration Complete!"
echo
echo "Vercel environment variables: ✓ (4/4)"
echo
echo "Manual step (1 minute):"
echo "  1. Open https://dashboard.convex.dev"
echo "  2. Go to: Settings → Integrations → Sentry"
echo "  3. Enter DSN: $SENTRY_DSN"
echo "  4. Click 'Enable Integration'"
echo
echo "Ready to deploy: git push origin feature/observability-stack"
echo
