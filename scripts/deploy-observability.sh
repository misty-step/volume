#!/usr/bin/env bash
set -euo pipefail

echo "==> Canary observability deployment"
echo

command -v vercel >/dev/null || { echo "Error: vercel CLI not found"; exit 1; }
vercel whoami >/dev/null || { echo "Error: not logged in to Vercel"; exit 1; }
[[ -f package.json ]] || { echo "Error: run from project root"; exit 1; }
[[ -f ~/.secrets ]] || { echo "Error: ~/.secrets not found"; exit 1; }

# shellcheck source=/dev/null
source ~/.secrets

CANARY_ENDPOINT_VALUE="${CANARY_ENDPOINT:-}"
CANARY_API_KEY_VALUE="${CANARY_API_KEY:-}"
PUBLIC_CANARY_ENDPOINT_VALUE="${NEXT_PUBLIC_CANARY_ENDPOINT:-$CANARY_ENDPOINT_VALUE}"
PUBLIC_CANARY_API_KEY_VALUE="${NEXT_PUBLIC_CANARY_API_KEY:-}"

[[ -n "$CANARY_ENDPOINT_VALUE" ]] || {
  echo "Error: CANARY_ENDPOINT not set in ~/.secrets" >&2
  exit 1
}

[[ -n "$CANARY_API_KEY_VALUE" ]] || {
  echo "Error: CANARY_API_KEY not set in ~/.secrets" >&2
  exit 1
}

[[ -n "$PUBLIC_CANARY_ENDPOINT_VALUE" ]] || {
  echo "Error: NEXT_PUBLIC_CANARY_ENDPOINT could not be resolved" >&2
  exit 1
}

[[ -n "$PUBLIC_CANARY_API_KEY_VALUE" ]] || {
  echo "Error: NEXT_PUBLIC_CANARY_API_KEY not set in ~/.secrets" >&2
  exit 1
}

[[ "$CANARY_ENDPOINT_VALUE" =~ ^https?:// ]] || {
  echo "Error: CANARY_ENDPOINT must start with http:// or https://" >&2
  exit 1
}

[[ "$PUBLIC_CANARY_ENDPOINT_VALUE" =~ ^https?:// ]] || {
  echo "Error: NEXT_PUBLIC_CANARY_ENDPOINT must start with http:// or https://" >&2
  exit 1
}

echo "Resolved Canary endpoint: $PUBLIC_CANARY_ENDPOINT_VALUE"
echo "Using explicit browser and server Canary keys"
echo

for env in production preview development; do
  vercel env rm NEXT_PUBLIC_SENTRY_DSN "$env" --yes 2>/dev/null || true
  vercel env rm SENTRY_DSN "$env" --yes 2>/dev/null || true
  vercel env rm SENTRY_AUTH_TOKEN "$env" --yes 2>/dev/null || true
  vercel env rm SENTRY_ORG "$env" --yes 2>/dev/null || true
  vercel env rm SENTRY_PROJECT "$env" --yes 2>/dev/null || true

  vercel env rm NEXT_PUBLIC_CANARY_ENDPOINT "$env" --yes 2>/dev/null || true
  vercel env rm NEXT_PUBLIC_CANARY_API_KEY "$env" --yes 2>/dev/null || true
  vercel env rm CANARY_ENDPOINT "$env" --yes 2>/dev/null || true
  vercel env rm CANARY_API_KEY "$env" --yes 2>/dev/null || true

  echo "$PUBLIC_CANARY_ENDPOINT_VALUE" | vercel env add NEXT_PUBLIC_CANARY_ENDPOINT "$env"
  echo "$PUBLIC_CANARY_API_KEY_VALUE" | vercel env add NEXT_PUBLIC_CANARY_API_KEY "$env"
  echo "$CANARY_ENDPOINT_VALUE" | vercel env add CANARY_ENDPOINT "$env"
  echo "$CANARY_API_KEY_VALUE" | vercel env add CANARY_API_KEY "$env" --sensitive
done

echo
echo "==> Canary configuration complete"
echo
echo "Configured Vercel env vars:"
echo "  - NEXT_PUBLIC_CANARY_ENDPOINT"
echo "  - NEXT_PUBLIC_CANARY_API_KEY"
echo "  - CANARY_ENDPOINT"
echo "  - CANARY_API_KEY"
echo
echo "Next step:"
echo "  Run ./scripts/verify-env.sh --prod-only and confirm /api/health reports errorTracking=pass with serverKeySource=dedicated."
