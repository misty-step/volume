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

# Step 1: Resolve organization slug
if [[ -n "${SENTRY_ORG_SLUG:-}" ]]; then
  # Honor explicit override
  SENTRY_ORG="$SENTRY_ORG_SLUG"
  echo "  Organization: $SENTRY_ORG (from SENTRY_ORG_SLUG)"
else
  # Auto-discover from API
  ORGS_JSON=$(curl -s "https://sentry.io/api/0/organizations/" \
    -H "Authorization: Bearer $SENTRY_MASTER_TOKEN")

  SENTRY_ORG=$(echo "$ORGS_JSON" | python3 -c "
import json, sys
try:
    orgs = json.load(sys.stdin)
    if not orgs or len(orgs) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    print(orgs[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1)

  if [[ "$SENTRY_ORG" == "__EMPTY__" ]]; then
    echo "Error: No Sentry organizations available for the provided token" >&2
    echo "Hint: Set SENTRY_ORG_SLUG environment variable to specify explicitly" >&2
    echo "      export SENTRY_ORG_SLUG='your-org-slug'" >&2
    exit 1
  elif [[ "$SENTRY_ORG" == "__ERROR__" ]]; then
    echo "Error: Failed to parse Sentry organizations API response" >&2
    echo "Hint: Verify SENTRY_MASTER_TOKEN has correct permissions" >&2
    exit 1
  fi

  echo "  Organization: $SENTRY_ORG (auto-discovered)"
fi

# Validate org slug resolved
[[ -n "$SENTRY_ORG" ]] || {
  echo "Error: SENTRY_ORG could not be resolved" >&2
  exit 1
}

# Step 2: Resolve project slug
if [[ -n "${SENTRY_PROJECT_SLUG:-}" ]]; then
  # Honor explicit override
  SENTRY_PROJECT="$SENTRY_PROJECT_SLUG"
  echo "  Project: $SENTRY_PROJECT (from SENTRY_PROJECT_SLUG)"
else
  # Auto-discover from API
  PROJECTS_JSON=$(curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/projects/" \
    -H "Authorization: Bearer $SENTRY_MASTER_TOKEN")

  SENTRY_PROJECT=$(echo "$PROJECTS_JSON" | python3 -c "
import json, sys
try:
    projects = json.load(sys.stdin)
    if not projects or len(projects) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    # Prefer 'volume' project if exists, otherwise first project
    volume = next((p['slug'] for p in projects if p['slug'] == 'volume'), None)
    print(volume if volume else projects[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1)

  if [[ "$SENTRY_PROJECT" == "__EMPTY__" ]]; then
    echo "Error: No Sentry projects found in organization '$SENTRY_ORG'" >&2
    echo "Hint: Create a project first at https://sentry.io/organizations/$SENTRY_ORG/projects/new/" >&2
    echo "      Or set SENTRY_PROJECT_SLUG environment variable explicitly" >&2
    echo "      export SENTRY_PROJECT_SLUG='your-project-slug'" >&2
    exit 1
  elif [[ "$SENTRY_PROJECT" == "__ERROR__" ]]; then
    echo "Error: Failed to parse Sentry projects API response" >&2
    echo "Hint: Verify organization slug '$SENTRY_ORG' is correct" >&2
    exit 1
  fi

  echo "  Project: $SENTRY_PROJECT (auto-discovered)"
fi

# Validate project slug resolved
[[ -n "$SENTRY_PROJECT" ]] || {
  echo "Error: SENTRY_PROJECT could not be resolved" >&2
  exit 1
}

# Step 3: Get DSN from project keys
DSN_JSON=$(curl -s "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/keys/" \
  -H "Authorization: Bearer $SENTRY_MASTER_TOKEN")

SENTRY_DSN=$(echo "$DSN_JSON" | python3 -c "
import json, sys
try:
    keys = json.load(sys.stdin)
    if not keys or len(keys) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    print(keys[0]['dsn']['public'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1)

if [[ "$SENTRY_DSN" == "__EMPTY__" ]]; then
  echo "Error: No DSN keys found for project '$SENTRY_PROJECT'" >&2
  echo "Hint: Create a client key at https://sentry.io/settings/$SENTRY_ORG/projects/$SENTRY_PROJECT/keys/" >&2
  exit 1
elif [[ "$SENTRY_DSN" == "__ERROR__" ]]; then
  echo "Error: Failed to parse Sentry project keys API response" >&2
  echo "Hint: Verify project slug '$SENTRY_PROJECT' exists in org '$SENTRY_ORG'" >&2
  exit 1
fi

# Validate DSN format (basic check)
[[ "$SENTRY_DSN" =~ ^https:// ]] || {
  echo "Error: Invalid DSN format: $SENTRY_DSN" >&2
  exit 1
}

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
