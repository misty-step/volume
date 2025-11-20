## Spec Analysis

**Modules**: EventCatalog, SanitizationEngine, ContextManager, TransportRouter (+ client/server adapters), InstrumentationHooks (Clerk + server/Convex), TelemetryTestkit, SelfTestSurfaces, docs/CI glue.
**Dependencies**: Existing `@vercel/analytics` client/server packages, `@sentry/nextjs`, Clerk `useUser`, Convex server APIs, Playwright runner, Husky + GitHub Actions workflows.
**Integration Points**: `src/lib/analytics.ts` barrel, Next.js layout/providers, Convex mutations/actions, `/test-analytics` page & `/api/test-error` route, CI pipeline (`pnpm test:telemetry`), scripts in `scripts/`.
**Migrations**: None (no DB/schema updates), but Convex functions gain wrappers only.

**Patterns to Follow**:

- Keep new modules under `src/lib/analytics/*` mirroring design structure.
- React hooks in `instrumentation/` use PascalCase filenames, colocated tests under `__tests__`.
- Tests colocated next to modules or under `__tests__` folder per repo convention.
- Use Brutalist tokens for any UI in `/test-analytics`.

**Risks/Unknowns**:

- Consent/opt-out requirements unresolved → design guards must be toggle-friendly (document TODO in code comments).
- Alert routing destination undefined → block enabling new Sentry alert until owner responds (note in docs).

**Infrastructure Assessment**:

- Quality gates: Husky + CI already run lint/type/test/build; need new `pnpm test:telemetry` wired in both.
- Observability: Sentry + Vercel analytics present; ensure new breadcrumbs/logging follow sanitizer rules.
- Design system: keep `/test-analytics` UI compliant with brutalist specs (3px borders, uppercase labels).
- Security: All new helpers respect PII redaction, guard server-only APIs, keep `/api/test-error` prod-disabled.

---

## Tasks

- [x] Scaffold analytics module tree & barrel

  ```
  Files:
  - src/lib/analytics/events.ts (new)
  - src/lib/analytics/sanitizer.ts (new)
  - src/lib/analytics/context.ts (new)
  - src/lib/analytics/router.ts (new)
  - src/lib/analytics/transports/{client.ts,server.ts,sentry.ts} (new)
  - src/lib/analytics/instrumentation/, testkit/, __tests__/ directories (empty index files)
  - src/lib/analytics.ts (convert to barrel re-export)

  Goal: Establish directory structure matching DESIGN.md so subsequent tasks drop implementations without churn.

  Approach:
  1. Create directories/files with placeholder exports + TODO comments summarizing future logic.
  2. Update `src/lib/analytics.ts` to re-export new modules (even if stubs) to minimize import churn.
  3. Ensure tsconfig path alias (`@/lib/analytics`) still resolves by adjusting exports.
  4. Add basic type scaffolding (interfaces per DESIGN.md) without implementation logic yet.

  Success Criteria:
  - [x] New files compile (no unused vars) and lint clean.
  - [x] All existing imports of `@/lib/analytics` still type-check (stubs may throw `NotImplemented`).

  Tests:
  - Typecheck to ensure barrel works.

  Dependencies: None.
  Estimate: 45m
  ```

- [x] Implement EventCatalog + lint script

  ```
  Files:
  - src/lib/analytics/events.ts
  - package.json (add script `lint:analytics-events`)
  - scripts/lint-analytics-events.ts (new, Node script if needed)
  - src/lib/analytics/__tests__/events.test.ts (new)

  Goal: Provide authoritative event definitions with metadata + guardrails ensuring docs stay in sync.

  Approach:
  1. Populate `AnalyticsEventDefinitions`, `EventMeta` per DESIGN.md table.
  2. Export helper types `AnalyticsEventName`, `AnalyticsEventProperties<Name>`.
  3. Create lightweight script verifying event names referenced in docs (stub uses JSON config for now).
  4. Write Vitest verifying definitions include required fields and metadata.

  Success Criteria:
  - [x] TypeScript enforces required props for catalog entries.
  - [x] Lint script fails when docs list missing event.
  - [x] Tests cover at least one valid + invalid lookup.

  Tests:
  - Unit: `events.test.ts` to assert metadata + schema shape.
  - Manual: run `pnpm lint:analytics-events`.

  Dependencies: Scaffold task.
  Estimate: 1h
  ```

- [x] Build SanitizationEngine with size/UTF guards

  ```
  Files:
  - src/lib/analytics/sanitizer.ts
  - src/lib/analytics/__tests__/sanitizer.test.ts

  Goal: Implement recursive sanitizer covering nested props, circular refs, UTF-8 validation, payload size guard.

  Approach:
  1. Implement `sanitizeString` regex + `[EMAIL_REDACTED]` idempotence.
  2. Implement `sanitizeProperties` per pseudocode (WeakSet, `[Circular]`, `[Unstringifiable Object]`, `[Unsupported:type]`).
  3. Introduce payload cap (config constant) and drop reason field.
  4. Write Vitest covering nested objects, arrays, invalid UTF, large payloads.

  Success Criteria:
  - [x] Tests prove sanitizer handles circular refs + emoji + oversize payloads.
  - [x] Function exports typed as returning `Record<string, string|number|boolean>`.

  Tests:
  - Unit: `sanitizer.test.ts` for all branches.

  Dependencies: Scaffold.
  Estimate: 1.5h
  ```

- [x] Extract ContextManager + Clerk hook

  ```
  Files:
  - src/lib/analytics/context.ts
  - src/lib/analytics/instrumentation/useAnalyticsUserContext.ts
  - src/lib/analytics/__tests__/context.test.ts
  - src/app/(app)/AnalyticsUserProvider.tsx (new helper component)
  - src/app/layout.tsx (wrap providers)

  Goal: Move user-context logic into dedicated module + React hook enforcing client-only usage and Sentry sync.

  Approach:
  1. Implement `setUserContext`, `clearUserContext`, `withUserContext`, `getUserContextForTests` with guards.
  2. Build hook using Clerk `useUser`, ensuring cleanup clears context.
  3. Add helper component inserted in layout to run hook in client boundary.
  4. Tests: server guard throws, client set/clear flows, metadata sanitization.

  Success Criteria:
  - [x] Layout renders hook only on client (`"use client"` boundary) and does not break SSR.
  - [x] Tests verify server guard message + Sentry `setUser` invoked (mocked).

  Tests:
  - Unit: context guard tests + hook behavior via React Testing Library.

  Dependencies: Sanitizer (for sanitizing metadata), scaffold.
  Estimate: 1.5h
  ```

- [ ] Implement TransportRouter + adapters

  ```
  Files:
  - src/lib/analytics/router.ts
  - src/lib/analytics/transports/client.ts
  - src/lib/analytics/transports/server.ts
  - src/lib/analytics/transports/sentry.ts
  - src/lib/analytics/__tests__/router.test.ts

  Goal: Provide runtime-aware `trackEvent`/`reportError` that sanitize, enrich, route to Vercel + Sentry with graceful failure handling.

  Approach:
  1. Implement enablement gates (`NEXT_PUBLIC_DISABLE_ANALYTICS`, NODE_ENV checks).
  2. Write client adapter using `@vercel/analytics/react` (lazy import) with error swallow.
  3. Write server adapter caching dynamic import of `@vercel/analytics/server`.
  4. Implement `reportError` via dedicated sentry transport using SanitizationEngine.
  5. Add breadcrumbs/log lines per DESIGN.
  6. Tests: mock adapters, assert sanitization + user context integration + error swallow.

  Success Criteria:
  - [ ] `trackEvent` works client + server (tested via environment mocking).
  - [ ] `reportError` redacts emails in context.
  - [ ] Breadcrumb logged on failures.

  Tests:
  - Unit: router tests simulating both runtimes.

  Dependencies: EventCatalog, Sanitizer, ContextManager.
  Estimate: 2h
  ```

- [ ] Ship server/Convex instrumentation wrappers

  ```
  Files:
  - src/lib/analytics/instrumentation/withServerAnalytics.ts
  - src/lib/analytics/instrumentation/instrumentConvex.ts
  - convex/** (wrap targeted mutations like sets/exercises)
  - src/lib/analytics/__tests__/instrumentation.server.test.ts

  Goal: Provide helpers for Next route handlers + Convex functions ensuring correlation IDs + fire-and-forget analytics.

  Approach:
  1. Implement `withServerAnalytics(handler, opts)` injecting `trackEvent` + `reportError` references.
  2. Implement Convex HOC using `ctx.scheduler` or `ctx.runMutation` as needed, capturing `ctx.requestId`.
  3. Wrap critical Convex mutations (set log, exercise create/delete) to emit events defined in catalog.
  4. Tests: mock Convex context to assert event called + userId from identity used.

  Success Criteria:
  - [ ] Targeted mutations/Next handlers compile with new helper.
  - [ ] Tests show no leakage when identity missing.

  Tests:
  - Unit/integration using `convex-test` or manual mocks per repo precedent.

  Dependencies: TransportRouter.
  Estimate: 1.5h
  ```

- [ ] Instrument UI flows via hook + components

  ```
  Files:
  - src/components/marketing/PageAnalyticsTracker.tsx (ensure new facade usage)
  - src/components/dashboard/** as needed for event emissions
  - src/lib/analytics/instrumentation docs (README/CLAUDE references later)
  - Add any missing `trackEvent` calls (exercise create/delete, set log/edit, sessions, auth events)

  Goal: Ensure five critical flows fire events using new facade + user context automatically.

  Approach:
  1. Review existing UI flows; replace direct `trackClient` usage with new exported functions.
  2. Add instrumentation to set logging forms, exercise CRUD, workout session start/end, auth transitions.
  3. Ensure events include correlation ID if available (pass from props or router).
  4. Keep marketing trackers updated; ensure marketing events unaffected.

  Success Criteria:
  - [ ] Each event defined in catalog has at least one call site.
  - [ ] No UI calls adapter APIs directly.

  Tests:
  - Component tests hitting instrumentation using TelemetryTestkit (next task) once ready.

  Dependencies: Router + hook.
  Estimate: 1.5h
  ```

- [ ] Build TelemetryTestkit utilities

  ```
  Files:
  - src/lib/analytics/testkit/{index.ts,mock.ts,expect.ts}
  - src/lib/analytics/__tests__/testkit.test.ts
  - Vitest setup (if needs auto-mock)

  Goal: Provide mocks/assert helpers for component/unit tests + Playwright stub integration.

  Approach:
  1. Implement mock capturing events + errors.
  2. Provide helper to swap router adapters with mock (expose via global for Playwright).
  3. Write tests verifying mock collects events + expect helper throws on mismatch.

  Success Criteria:
  - [ ] Tests demonstrate expect helper catches missing event.
  - [ ] Documentation comment explaining Playwright usage.

  Tests:
  - Unit: testkit tests.

  Dependencies: Router implementation.
  Estimate: 1h
  ```

- [ ] Upgrade `/test-analytics` + `/api/test-error` guards

  ```
  Files:
  - src/app/(app)/test-analytics/page.tsx & TestAnalyticsClient.tsx
  - src/app/api/test-error/route.ts
  - src/components/ui for status cards (if new component needed)
  - scripts/test-error-handling.sh (extend checks)

  Goal: Provide dev-only dashboard showing transport health and ensure `/api/test-error` 404s outside dev.

  Approach:
  1. Add brutalist status cards summarizing client/server/Sentry status (using existing design tokens).
  2. Add hook hitting `/api/test-error?type=report` + verifying sanitized payloads.
  3. Update API route to short-circuit in production/preview with 404.
  4. Extend script to verify router returns expected status codes.

  Success Criteria:
  - [ ] Visiting `/test-analytics` in dev shows statuses; preview/prod returns 404.
  - [ ] Script exits non-zero if endpoint accessible in prod env simulation.

  Tests:
  - Unit: add test ensuring route returns 404 when NODE_ENV=production.
  - Manual: run script.

  Dependencies: Router + instrumentation (for status data).
  Estimate: 1h
  ```

- [ ] Extend Playwright + Vitest coverage for telemetry

  ```
  Files:
  - e2e/critical-flow.spec.ts (add analytics assertions)
  - e2e/smoke.spec.ts (ensure gating)
  - playwright.config.ts (env var for stub)
  - src/lib/analytics/testkit/playwright.ts (if needed)

  Goal: Validate instrumentation end-to-end and ensure dev-only surfaces stay gated.

  Approach:
  1. Inject stub via `page.exposeFunction` or env flag to capture analytics calls.
  2. Add test steps verifying `Set Logged` event emitted when logging set.
  3. Add test confirming `/api/test-error` 404s in preview-simulated run.
  4. Document env var requirements in README.

  Success Criteria:
  - [ ] Playwright tests pass locally and fail if event missing.
  - [ ] CI Playwright run uses stub without leaking real analytics.

  Tests:
  - Playwright specs themselves.

  Dependencies: TelemetryTestkit + instrumentation tasks.
  Estimate: 1.5h
  ```

- [ ] Wire `pnpm test:telemetry` + CI thresholds

  ```
  Files:
  - package.json (script)
  - vitest.config.ts (coverage thresholds, optional threshold overrides)
  - .github/workflows/ci.yml (add step)
  - Husky/pre-push hook (if exists)

  Goal: Add telemetry-focused command and ensure CI enforces ≥85% coverage for analytics files.

  Approach:
  1. Create script `test:telemetry` running vitest subset (pattern on `src/lib/analytics` + testkit) plus Playwright tag if needed.
  2. Adjust vitest thresholds for analytics via per-file overrides or coverage file.
  3. Update CI workflow to run new script before global tests.
  4. Update Husky pre-push to include script.

  Success Criteria:
  - [ ] `pnpm test:telemetry` runs locally within minutes.
  - [ ] CI fails if analytics coverage dips below target.

  Tests:
  - Run script locally.

  Dependencies: Core unit/integration tests ready.
  Estimate: 45m
  ```

- [ ] Update docs + onboarding

  ```
  Files:
  - README.md
  - CLAUDE.md
  - TASK.md (if acceptance criteria update needed)
  - DESIGN.md (reference final decisions if drift)

  Goal: Document new telemetry workflow, privacy guarantees, commands so future devs know how to instrument flows.

  Approach:
  1. Add section to README on analytics facade usage + `pnpm test:telemetry`.
  2. Update CLAUDE.md observability stack + instrumentation instructions.
  3. Ensure TASK/DESIGN cross-reference final architecture or note deltas.

  Success Criteria:
  - [ ] Docs mention how to add events, run self-tests, and guard dev-only routes.
  - [ ] References to obsolete instructions removed (e.g., direct `trackClient`).

  Tests:
  - Proofread; optionally run markdown lint if configured.

  Dependencies: Implementation complete (needs final API shape).
  Estimate: 45m
  ```

- [ ] Quality gate & final verification checklist

  ```
  Files:
  - TODO (meta), but primarily commands: pnpm lint/typecheck/test/build/test:e2e/test:telemetry

  Goal: Ensure final PR meets all quality gates and observability requirements before merge.

  Approach:
  1. Run `scripts/doctor.sh` if instructed, ensure git clean.
  2. Execute `pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm test:telemetry`, `pnpm build`, `pnpm test:e2e`.
  3. Capture Sentry DSN/test-analytics screenshots for PR.

  Success Criteria:
  - [ ] All commands succeed locally.
  - [ ] Coverage report shows analytics files ≥85%.

  Tests:
  - Commands above.

  Dependencies: All coding tasks done.
  Estimate: 30m
  ```
