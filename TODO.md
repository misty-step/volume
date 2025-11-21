## Planning Report

Spec: PRD: Playwright + Clerk E2E (TASK.md, 2025-11-21)  
Tasks Generated: 10  
Total Estimate: 9h 15m  
Critical Path: 6h 15m

### Task Summary

| Phase            | Tasks | Estimate | Dependencies   |
| ---------------- | ----- | -------- | -------------- |
| Setup            | 2     | 1h       | None           |
| Auth Bootstrap   | 3     | 3h       | Setup          |
| Tests & UI Hooks | 3     | 3h 15m   | Auth Bootstrap |
| CI/Infra         | 2     | 2h       | Auth Bootstrap |

### Critical Path

1. Create auth storage scaffolding (0.5h) →
2. Global Clerk session bootstrap (1.5h) →
3. Playwright config wiring + env toggles (0.75h) →
4. Auth fixture for specs (0.75h) →
5. Update specs to use fixture + add create exercise/history coverage (1.75h)  
   Total: 6h 15m

### Risks

- Clerk API limits / missing creds: fail-fast in global setup; cache user when present.
- Data leakage across runs: prefer per-run user namespace; guarded Convex reset if needed.
- Runtime creep: keep suite ≤6 min by limiting projects/tests; trace only on retry.
- Selector flake: migrate to `data-testid`; avoid text selectors.

---

## TODO

- [x] Create Playwright auth scaffolding
  - Files: `.gitignore`, `e2e/.auth/` (folder, no tracked files)
  - Goal: Ensure storageState path exists and is ignored.
  - Approach: add `e2e/.auth` to .gitignore; create placeholder README in folder explaining generated content.
  - Success: `git status` clean after running tests; storageState not committed.
  - Tests: none (manual check).
  - Estimate: 30m

- [x] Implement Clerk global setup with API user provisioning
  - Files: `e2e/global-setup.ts`, `package.json` (add playwright globalConfig path if needed)
  - Goal: Create/ensure test user via Clerk API or test creds, mint session, write `e2e/.auth/state.json`.
  - Approach:
    1. Read env (`CLERK_API_KEY`/`CLERK_FRONTEND_API` or `CLERK_TEST_USER_EMAIL/PASSWORD`).
    2. Use `@clerk/testing` helper or REST to create-or-get user; issue session token.
    3. Launch Playwright context, set cookies/localStorage, save storageState.
    4. Fail fast with helpful error if env missing.
  - Success: `pnpm test:e2e --global-setup e2e/global-setup.ts` produces state file and signs in.
  - Tests: run `pnpm test:e2e --list` and a single test to confirm auth reuse.
  - Estimate: 1h 30m
  - Depends: Create Playwright auth scaffolding

- [ ] Wire Playwright config to storageState and test env toggles
  - Files: `playwright.config.ts`
  - Goal: Use saved storageState for all projects; disable telemetry during E2E; keep runtime under budget.
  - Approach: set `use.storageState: "e2e/.auth/state.json"`; add `expect.timeout` reductions if needed; set `env` for `NEXT_PUBLIC_DISABLE_SENTRY`, `NEXT_PUBLIC_DISABLE_ANALYTICS`; adjust `webServer` to Next-only (no Convex local); ensure retries=CI only, workers=1 in CI.
  - Success: `pnpm test:e2e` starts Next server, reuses auth, passes without contacting Sentry/analytics.
  - Tests: local run `pnpm test:e2e --reporter=line`.
  - Estimate: 45m
  - Depends: Implement Clerk global setup with API user provisioning

- [ ] Add auth fixture helper for specs
  - Files: `e2e/auth-fixture.ts`
  - Goal: Hide Clerk/session handling behind deep module; provide authenticated `page`/helpers.
  - Approach: export test fixture wrapping Playwright `test` with storageState loaded; expose helper to reset user data (calls guarded Convex endpoint when configured).
  - Success: Specs import from `./auth-fixture` and run without manual login code.
  - Tests: ensure existing smoke spec runs using fixture.
  - Estimate: 45m
  - Depends: Wire Playwright config to storageState and test env toggles

- [ ] Add guarded Convex test reset endpoint (optional but recommended)
  - Files: `convex/test/resetUserData.ts` (new), `convex/_generated/server.ts` import if needed, `src/app/api/health/route.ts`? (doc), `README.md` (usage)
  - Goal: Deterministic cleanup per-run, only in test env.
  - Approach: create internal action gated by `NODE_ENV === "test"` and `X-TEST-SECRET`; wipes exercises/sets for given userId. Document env `TEST_RESET_SECRET`.
  - Success: Calling endpoint with correct secret succeeds in dev/test; forbidden otherwise; not reachable in production build.
  - Tests: unit/integration where feasible; manual call via curl in dev.
  - Estimate: 1h
  - Depends: Wire Playwright config to storageState and test env toggles

- [ ] Add stable data-testid hooks to critical UI
  - Files: `src/components/dashboard/quick-log-form.tsx`, `src/components/dashboard/exercise-set-group.tsx`, `src/components/dashboard/set-card.tsx`, `src/components/dashboard/Dashboard.tsx` (if needed for selectors), any auth buttons in marketing page.
  - Goal: Replace brittle text selectors with testids for inputs/buttons/toasts used in E2E.
  - Approach: add `data-testid` to exercise combobox, weight/reps inputs, submit, success toast container, create-exercise CTA, history entries; follow brutalist naming (kebab-case).
  - Success: No visual changes; eslint/prettier clean.
  - Tests: run `pnpm lint`; E2E specs use only testids.
  - Estimate: 1h 15m
  - Depends: Add auth fixture helper for specs

- [ ] Update smoke and critical-flow specs to use fixture + expand coverage
  - Files: `e2e/smoke.spec.ts`, `e2e/critical-flow.spec.ts`
  - Goal: Authenticated flows exercised end-to-end with stable selectors; cover create exercise, log set, history view, sign-in/out.
  - Approach: import fixture; add beforeEach using authenticated page; switch selectors to testids; unskip critical flow; add assertions for history entry; include sign-out/in roundtrip.
  - Success: Specs pass locally using stored auth; no fixme tests remain.
  - Tests: `pnpm test:e2e --project=chromium --grep "Critical"`; full suite.
  - Estimate: 1h 30m
  - Depends: Add stable data-testid hooks to critical UI

- [ ] Document required env for E2E
  - Files: `README.md` (Testing section), `.env.example` (add test vars), `TASK.md` (append quickstart?), `e2e/README.md` (new)
  - Goal: One-copy-paste setup for dev/CI; clarify needed Clerk/Convex vars and optional reset secret.
  - Approach: add subsection “E2E (Playwright)”; list required vars; note storageState path; instructions to run `pnpm test:e2e`.
  - Success: New dev can run E2E following docs without guessing.
  - Tests: doc review; not code.
  - Estimate: 30m
  - Depends: Implement Clerk global setup with API user provisioning

- [ ] Enhance CI E2E job for stability & artifacts
  - Files: `.github/workflows/ci.yml`
  - Goal: Keep E2E on pushes/PRs with artifacts and proper env toggles.
  - Approach: inject env flags disabling telemetry; ensure `pnpm exec playwright install --with-deps chromium` before tests; upload traces/videos on failure; consider splitting job if runtime >6m.
  - Success: CI runs `pnpm test:e2e` once; artifacts available on failure; job under time budget.
  - Tests: trigger dry-run via `act` (optional) or rely on next CI run.
  - Estimate: 45m
  - Depends: Document required env for E2E; Wire Playwright config to storageState and test env toggles

- [ ] Post-implementation validation
  - Files: n/a (checklist)
  - Goal: Ensure quality gates and runtime budgets met.
  - Approach: run `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e`; measure runtime; verify storageState ignored; confirm Convex reset guarded.
  - Success: All commands pass; runtime ≤3m local; ≤6m CI; no secrets in repo.
  - Tests: commands above.
  - Estimate: 30m
  - Depends: all previous tasks

---

Out of scope (Backlog after MVP):

- Mobile viewport Playwright project.
- Visual regression baseline and axe run.
- Slack alert wiring for E2E failures.
