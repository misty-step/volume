# Reviewer Evidence

## Merge Claim

This branch removes OpenRouter policy drift by centralizing the model portfolio,
routing defaults, headers, timeout, and env variable names in
`src/lib/openrouter/policy.ts`. Coach runtime, Convex runtime, release-note
generation, health metadata, and deploy-time env validation now consume that
shared contract.

## What Changed

- `src/lib/openrouter/policy.ts` is now the canonical OpenRouter contract.
- `src/lib/coach/server/runtime.ts` trims `COACH_AGENT_MODEL` and falls back to
  the canonical default instead of accepting whitespace as a model id.
- `convex/lib/openrouter.ts` and `scripts/generate-releases.ts` now reuse the
  same model portfolio, headers, timeout, and API-key lookup.
- `src/app/api/health/route.ts` now exposes the live runtime policy metadata so
  deployment health can report the active contract directly.
- `scripts/verify-env.sh` now loads the OpenRouter env variable names from the
  canonical policy and validates optional coach overrides instead of hardcoding
  them separately.

## Execution Evidence

1. Live branch health response shows the canonical portfolio and runtime config:
   [health-response.json](./health-response.json)
2. Regression proof for the affected lane:
   [verification.txt](./verification.txt)

## Before / After

- Before: ADR docs, coach runtime defaults, Convex runtime constants, and env
  validation could drift independently. A blank `COACH_AGENT_MODEL` override
  also produced an invalid runtime model id.
- After: one policy module defines the portfolio and runtime contract; all
  touched consumers read from it; health output reflects the same contract; and
  blank overrides fall back safely to the canonical default.

## Dogfood QA

Scoped local dogfood on `http://localhost:3001` found no branch-specific P0/P1
issues for this runtime/config lane.

- Verified `GET /api/health` in a live local Next.js session returned the
  canonical model metadata and `status: "pass"`.
- Opened the public landing page to confirm the app shell still rendered under
  the local branch.
- Console noise on the landing page came from stubbed local Clerk/Convex dev
  configuration and was not introduced by this diff.

## Persistent Verification

`bun run test --run src/lib/coach/server/runtime.test.ts convex/lib/openrouter.test.ts src/app/api/health/route.test.ts`
