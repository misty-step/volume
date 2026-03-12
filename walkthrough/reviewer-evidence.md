# Paywall Bootstrap Walkthrough

## Title

Fix the authenticated mobile bootstrap path so `PaywallGate` does not collapse
auth-loading into an endless fullscreen spinner.

## Why Now

- Production mobile users could briefly see the workspace, then lose it to a
  fullscreen spinner with no recovery UI.
- The failure was mostly invisible to Sentry/PostHog because the gate only used
  `console.*`.

## Before

- [`src/components/subscription/paywall-gate.tsx`](../src/components/subscription/paywall-gate.tsx)
  queried subscription state before Clerk + Convex auth was ready.
- [`convex/users.ts`](../convex/users.ts) returned `null` for both
  unauthenticated access and missing user records.
- The gate treated both as the same loading path and could keep the user on a
  spinner indefinitely.

## What Changed

- Gate subscription queries behind explicit auth readiness.
- Treat user bootstrap as a distinct post-auth state.
- Surface timeout-backed recovery UI instead of an endless spinner.
- Emit typed analytics and Sentry reports for delayed bootstrap and checkout
  verification timeout.
- Add a mobile reload E2E regression and richer unit coverage for the gate
  state machine.

## After

- Authenticated mobile reload reaches the workspace instead of getting stuck in
  a fullscreen spinner.
- Abnormal bootstrap states emit durable telemetry.
- Regressions are covered by a unit-level state-machine suite and a mobile E2E.

## Evidence

- Incident write-up:
  [`INCIDENT-20260311T201508Z.md`](../INCIDENT-20260311T201508Z.md)
- Gate fix:
  [`src/components/subscription/paywall-gate.tsx`](../src/components/subscription/paywall-gate.tsx)
- Typed telemetry:
  [`src/lib/analytics.ts`](../src/lib/analytics.ts)
- Unit regression coverage:
  [`src/components/subscription/paywall-gate.test.tsx`](../src/components/subscription/paywall-gate.test.tsx)
- Mobile E2E regression:
  [`e2e/subscription-flow.spec.ts`](../e2e/subscription-flow.spec.ts)

## Verification

Commands run on this branch:

```bash
bun run test src/components/subscription/paywall-gate.test.tsx
bun run lint -- 'src/components/subscription/paywall-gate.tsx' \
  'src/components/subscription/paywall-gate.test.tsx' \
  'src/lib/analytics.ts' \
  'e2e/subscription-flow.spec.ts'
bun run typecheck
bun run test:e2e -- --grep 'mobile reload recovers to the workspace without a stuck paywall spinner'
```

Observed result:

- Unit suite passed.
- Lint passed on touched files.
- Typecheck passed.
- Mobile Playwright flow passed end to end after provisioning local Convex and
  Clerk E2E env.

## Persistent Check

`bun run test:e2e -- --grep 'mobile reload recovers to the workspace without a stuck paywall spinner'`

## Residual Risk

- This proves the affected mobile reload path, not the whole app.
- The broader coach workspace still depends on local E2E secrets being valid.
