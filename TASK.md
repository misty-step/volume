# PRD: Playwright + Clerk E2E

## Executive Summary

- Problem: No reliable end-to-end coverage; auth flows blocked because Clerk isn’t wired for tests. Critical flows (log set, create exercise, history) unguarded; regressions ship silently.
- Goal: Ship deterministic Playwright suite with Clerk-backed auth so `pnpm test:e2e` fails only on real bugs.
- Success metrics: (1) CI E2E job ≤ 6 min p95, (2) ≥ 95% stability over 2 weeks (no flaky reruns), (3) Authenticated critical-flow spec passes locally and in CI with zero manual setup beyond `.env.local` + Clerk test creds.

## User Context & Outcomes

- Primary users: Volume devs + reviewers; secondary: on-call SRE needing quick smoke on incidents.
- Outcome: Fast signal that auth + core logging flows work against real backend; confidence to deploy without manual QA.
- Impact: Catches auth/session/config regressions before main; reduces support pings when workouts fail to log.

## Requirements

### Functional

- Install and configure Playwright + @clerk/testing with reusable auth fixture and storage state for test user.
- Provide deterministic auth setup: global setup seeds/obtains Clerk test user, stores session for reuse across specs.
- Add smoke coverage for: landing loads, nav to sign-up, sign-in + sign-out, create exercise, log set, view history.
- Enable critical flow spec (previously fixme) using authenticated state; avoid brittle text selectors via data-testid.
- CLI UX: `pnpm test:e2e` works locally after `.env.local` is populated; CI uses same command.

### Non-functional

- Runtime: full suite ≤ 6 min CI, ≤ 3 min local on M3. Retries only on failure; parallel friendly.
- Reliability: Zero test data leakage between runs (unique user or cleanup per run).
- Security: Test-only credentials and reset endpoints gated from prod; no PII in logs/artifacts.
- Determinism: No network flakiness from third-party calls (disable analytics/Sentry during E2E).

### Infrastructure

- Quality gates: Husky pre-commit already runs lint-staged; ensure Playwright added to CI (merge to main) without slowing PR loop.
- Observability: Keep Playwright traces on-first-retry; upload traces/videos as CI artifacts; redact auth tokens.
- Design consistency: Add data-testid attributes without visual changes; follow brutalist naming conventions.
- Security/secrets: Required vars for tests (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `NEXT_PUBLIC_CONVEX_URL`, `CLERK_TEST_USER_EMAIL/PASSWORD` or Clerk API key) documented; never commit storageState with real cookies.

## Architecture Decision

### Selected approach

- Use Clerk testing helpers to create/ensure a dedicated test user and issue a session token in Playwright global setup; write storage state to `e2e/.auth/state.json`. Tests consume via `storageState`, avoiding UI login per spec. Add small helper module `e2e/auth-fixture.ts` exposing `authContext(page)` to hide Clerk internals (deep module).
- Start Next.js server via Playwright `webServer` (Convex already remote via `NEXT_PUBLIC_CONVEX_URL`); do not start `pnpm dev:convex` in CI to avoid deploy-key needs. Gate an optional test-only Convex cleanup mutation behind `NODE_ENV === "test"` + admin secret for deterministic data reset.
- Use data-testid selectors for stability; keep vocabulary aligned with domain (exercise, set, history).

### Alternatives (weighted rubric: value 40, simplicity 30, explicitness 20, risk 10)

| Option                                        | Summary                                                                | Value | Simplicity | Explicitness | Risk | Score | Rejection reason                                           |
| --------------------------------------------- | ---------------------------------------------------------------------- | ----- | ---------- | ------------ | ---- | ----- | ---------------------------------------------------------- |
| A (chosen): Clerk API session + storage state | API-seeded user, global setup saves storage; tests start authenticated | 38    | 26         | 18           | 8    | 90    | Best stability, fast runs, real auth exercised             |
| B: UI login per spec                          | Drive Clerk UI to sign in with fixture user                            | 30    | 24         | 14           | 7    | 75    | Slower, brittle to UI copy, higher flake                   |
| C: Test-only auth bypass flag                 | Skip Clerk, inject mock session in app                                 | 25    | 28         | 12           | 6    | 71    | Doesn’t test real auth, security risk, codepath divergence |

### Module boundaries & layering

- `playwright.config.ts`: tiny interface; owns server start, baseURL, storage path (no auth logic).
- `e2e/global-setup.ts`: hidden complexity—fetch/create user, mint session, write storage. Exposes only file path.
- `e2e/auth-fixture.ts`: deep module returning authenticated context/page; callers remain unaware of Clerk token mechanics.
- Specs stay focused on user vocab (exercise, set, history) not auth plumbing.

## Data & API Contracts

- Environment inputs: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `NEXT_PUBLIC_CONVEX_URL`; test auth bootstrap needs either (`CLERK_TEST_USER_EMAIL`, `CLERK_TEST_USER_PASSWORD`) or (`CLERK_API_KEY`, `CLERK_FRONTEND_API`) for API-driven session.
- Storage state file: `e2e/.auth/state.json` (ignored from git) containing Clerk cookies/localStorage; regenerated in global setup.
- Optional test-only Convex mutation `test/resetUserData` (guarded) accepting `{userId}` to wipe exercises/sets for deterministic runs; only callable when `NODE_ENV === "test"` and `X-TEST-SECRET` matches env.

## Implementation Phases

- MVP: Add Clerk test bootstrap + storage state; convert smoke.spec.ts to use auth fixture; unskip critical-flow to cover log-set path; ensure `pnpm test:e2e` green locally.
- Hardening: Replace brittle text selectors with data-testid; add create-exercise + history assertions; capture traces/videos in CI; add deterministic data reset hook; tune timeouts/workers for CI.
- Future: Add mobile viewport project, visual regression baseline, axe accessibility pass, synthetic uptime check using same auth fixture.

## Testing & Observability

- Tests: Playwright suites for smoke, auth, critical flow; assert key UI + server effects (toast, history entry). Keep retries=2 in CI, none locally. Parallel workers with isolated storage per project.
- Error tracking: Set `NEXT_PUBLIC_DISABLE_SENTRY=true` and `NEXT_PUBLIC_DISABLE_ANALYTICS=true` during E2E to avoid noisy events; keep Sentry DSN unset in CI job.
- Logging: If adding test-only Convex reset, log with structured fields (userId, runId) and redact secrets.
- Performance monitoring: Use Playwright traces (network + CPU) for slow-step diagnosis; budget per test ≤ 90s.
- Deployment tracking: CI uploads traces/videos on failure; link to workflow run in PR comment (optional stretch).
- Alerting: Minimal—CI failure is the alert. Add Slack hook later if flakes appear.

## Risks & Mitigations

| Risk                                    | Likelihood | Impact | Mitigation                                                                               | Owner |
| --------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------- | ----- |
| Clerk rate limits or missing test creds | Medium     | High   | Cache/reuse test user; document required env; fail fast with clear error in global setup | Eng   |
| Convex data coupling across runs        | Medium     | Medium | Use per-run user or test reset mutation guarded by env secret                            | Eng   |
| CI timeouts (pnpm dev spawning Convex)  | Medium     | Medium | Switch Playwright webServer to Next-only; rely on remote Convex URL                      | Eng   |
| Flaky selectors                         | Medium     | Medium | Add data-testid to critical UI controls; avoid text-based selectors                      | Eng   |
| Secrets leakage in artifacts            | Low        | High   | Strip storageState before upload; redact logs; disable analytics/Sentry in test env      | Eng   |

## Open Questions / Assumptions

1. Which Convex deployment should E2E target (dedicated test, dev, or seeded preview)?
2. Are we allowed to create/destroy Clerk test users via API in CI, or must we use a fixed fixture account?
3. Should Playwright run on every PR or only after merge to main (current CI runs on all pushes)?
4. OK to disable Sentry/analytics during E2E to avoid noise, or do we need a scrubbed DSN for monitoring?
5. Do we want data reset between specs (test-only Convex mutation) or is per-run new user sufficient?
6. Any mobile viewport/device we must support in E2E (desktop-only otherwise)?  
   Assumptions until answered: using dedicated test Convex deployment + API-provisioned Clerk test user; E2E runs on main merges with optional nightly; Sentry/analytics disabled in E2E.

## Recommendations (Carmack/Ousterhout)

- Convex target: dedicate an “e2e” deployment with seeded baseline; isolates runs, enables resets, avoids dev drift.
- Clerk test users: API-provision per run, cache if exists; static password user is a single point of failure.
- CI cadence: run smoke+auth+critical on every PR; keep suite lean (≤6 min). If runtime creeps, gate heavier cases to nightly/main.
- Telemetry during E2E: disable Sentry/analytics via env to cut noise and PII risk; don’t couple tests to telemetry paths.
- Data hygiene: prefer per-run namespaced user; add guarded `test/resetUserData` only if quotas/data volume demand.
- Mobile coverage: start desktop-only; add one mobile project later if we see mobile regressions or product requirement.
