#!/usr/bin/env bash
set -euo pipefail

# Deploy Observability Stack - 100% Automated Configuration
# Uses Sentry CLI + API to auto-discover all credentials
# Prerequisites: vercel CLI authenticated, ~/.secrets with SENTRY_MASTER_TOKEN

echo "==> Observability Stack - Fully Automated Deployment"
echo

# Check prerequisites
command -v vercel >/dev/null || { echo "Error: vercel CLI not found"; exit 1; }
vercel whoami >/dev/null || { echo "Error: not logged in to Vercel"; exit 1; }
[[ -f package.json ]] || { echo "Error: run from project root"; exit 1; }
[[ -f ~/.secrets ]] || { echo "Error: ~/.secrets not found"; exit 1; }

# Source secrets
source ~/.secrets
[[ -n "${SENTRY_MASTER_TOKEN:-}" ]] || { echo "Error: SENTRY_MASTER_TOKEN not in ~/.secrets"; exit 1; }

echo "Prerequisites verified"
echo

# Auto-discover Sentry configuration via API
echo "==> Discovering Sentry configuration..."

# Get organizations from API
ORGS_JSON=$(curl -s "https://sentry.io/api/0/organizations/" \
  -H "Authorization: Bearer $SENTRY_MASTER_TOKEN")

SENTRY_ORG=$(echo "$ORGS_JSON" | python3 -c "import json, sys; print(json.load(sys.stdin)[0]['slug'])")
echo "  Organization: $SENTRY_ORG"

# Get projects for this org
PROJECTS_JSON=$(curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/projects/" \
  -H "Authorization: Bearer $SENTRY_MASTER_TOKEN")

# Find 'volume' project or use first project
SENTRY_PROJECT=$(echo "$PROJECTS_JSON" | python3 -c "
import json, sys
projects = json.load(sys.stdin)
volume = next((p['slug'] for p in projects if p['slug'] == 'volume'), None)
print(volume if volume else projects[0]['slug'])
")
echo "  Project: $SENTRY_PROJECT"

# Get DSN from project keys
DSN_JSON=$(curl -s "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/keys/" \
  -H "Authorization: Bearer $SENTRY_MASTER_TOKEN")

SENTRY_DSN=$(echo "$DSN_JSON" | python3 -c "import json, sys; print(json.load(sys.stdin)[0]['dsn']['public'])")
echo "  DSN: ${SENTRY_DSN:0:50}..."
echo

# Set Vercel environment variables
echo "==> Configuring Vercel environment variables..."
echo

# Remove existing vars if they exist (ignore errors)
vercel env rm NEXT_PUBLIC_SENTRY_DSN production --yes 2>/dev/null || true
vercel env rm NEXT_PUBLIC_SENTRY_DSN preview --yes 2>/dev/null || true
vercel env rm NEXT_PUBLIC_SENTRY_DSN development --yes 2>/dev/null || true
vercel env rm SENTRY_AUTH_TOKEN production --yes 2>/dev/null || true
vercel env rm SENTRY_ORG production --yes 2>/dev/null || true
vercel env rm SENTRY_PROJECT production --yes 2>/dev/null || true

# Public DSN (all environments)
echo "$SENTRY_DSN" | vercel env add NEXT_PUBLIC_SENTRY_DSN production
echo "$SENTRY_DSN" | vercel env add NEXT_PUBLIC_SENTRY_DSN preview
echo "$SENTRY_DSN" | vercel env add NEXT_PUBLIC_SENTRY_DSN development

# Auth token (production only, sensitive)
echo "$SENTRY_MASTER_TOKEN" | vercel env add SENTRY_AUTH_TOKEN production --sensitive

# Org and project (production)
echo "$SENTRY_ORG" | vercel env add SENTRY_ORG production
echo "$SENTRY_PROJECT" | vercel env add SENTRY_PROJECT production

echo
echo "==> Configuration Complete! (100% automated via CLI)"
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
