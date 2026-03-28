#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is required but was not found on PATH." >&2
  exit 1
fi

created_env_file=0
if [[ ! -f .env.local && -f .env.example ]]; then
  cp .env.example .env.local
  created_env_file=1
elif [[ ! -f .env.local ]]; then
  echo "Warning: .env.example not found, so .env.local was not created." >&2
fi

echo "==> Installing dependencies"
bun install --frozen-lockfile

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

if [[ "$created_env_file" -eq 1 ]]; then
  echo
  echo "==> Created .env.local from .env.example"
fi

cat <<'EOF'

==> Next steps
1. Fill in .env.local with Clerk, Convex, Stripe, and OpenRouter credentials.
2. Run `bunx convex dev` once to create/sync the local Convex environment.
3. Start the app with `bun run dev`.

Useful follow-up checks:
  bun run typecheck
  bun run lint
  bun run test:coverage
EOF
