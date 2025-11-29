## TODO: Rate Limit AI Endpoints (Convex)

- [x] Add `rateLimits` table to schema

  ```
  Files:
  - convex/schema.ts

  Goal: Define `rateLimits` table with indexes `by_user_scope_window` and `by_expires` to persist windowed counters.

  Approach:
  1) Add table fields {userId, scope, windowStartMs, windowMs, count, expiresAt}.
  2) Add indexes as per DESIGN.md.
  3) Ensure optionality/typing matches Convex expectations; regenerate types via `pnpm convex dev` if needed.

  Success Criteria:
  - [ ] Schema typechecks.
  - [ ] Convex codegen reflects new table without errors.

  Tests:
  - Typecheck: `pnpm typecheck` (Convex types updated).

  Estimate: 30m
  ```

- [x] Implement rate limit helper (store + service + error + config)

  ```
  Files:
  - convex/lib/rateLimit.ts (new)

  Goal: Provide `assertRateLimit` with fixed-window logic, env-configurable limits, exemptions, structured logging, Sentry breadcrumb on deny.

  Approach:
  1) Define types (RateLimitScope, RateLimitConfig, RateLimitError).
  2) Implement storage helpers (fetch/upsert/increment) using `rateLimits` table.
  3) Implement `assertRateLimit` per pseudocode; include userId hashing for logs; add Sentry breadcrumb/tag on deny.
  4) Implement config reader for env overrides with sane defaults; export limits map.

  Success Criteria:
  - [ ] `assertRateLimit` returns remaining/resetAt on allow; throws RateLimitError on deny.
  - [ ] Logging uses hashed userId; no PII in messages.
  - [ ] Env overrides respected when set; defaults applied when absent.

  Tests:
  - Unit (convex-test): allow path, deny path, window reset, env override, exempt path.

  Depends: Add `rateLimits` table to schema.
  Estimate: 1h 30m
  ```

- [x] Gate `createExercise` action with per-minute limit

  ```
  Files:
  - convex/exercises.ts
  - convex/lib/rateLimit.ts (imports)

  Goal: Enforce `exercise:create` limit (default 10/min, env-overridable) before OpenAI classification.

  Approach:
  1) Import limits map + assertRateLimit.
  2) Invoke guard at start of action using authenticated userId.
  3) Keep existing validation/classification flow intact; ensure errors surface cleanly.

  Success Criteria:
  - [ ] 11th request in same minute throws RateLimitError with retry-after data.
  - [ ] Normal flow unchanged when under limit.

  Tests:
  - convex-test: fire 10 requests → succeed; 11th → rate-limit error; after advancing time past window → succeeds.

  Depends: Implement rate limit helper.
  Estimate: 45m
  ```

- [x] Gate `generateOnDemandReport` action; remove legacy check

  ```
  Files:
  - convex/ai/reports.ts
  - convex/ai/data.ts (delete or retire checkRateLimit)
  - convex/lib/rateLimit.ts (imports)

  Goal: Enforce `aiReport:onDemand` limit (default 5/day, env-overridable) and eliminate redundant `checkRateLimit`.

  Approach:
  1) Replace current rate-limit query with `assertRateLimit`.
  2) Remove/stop exporting `checkRateLimit` from ai/data.ts if unused.
  3) Keep dedupe logic in `generateReport` untouched.

  Success Criteria:
  - [ ] 6th request in same day throws RateLimitError with retry-after.
  - [ ] Existing dedupe still prevents duplicate reports.

  Tests:
  - Update/add convex-test in ai/reports.test.ts for daily cap and dedupe behavior.

  Depends: Implement rate limit helper.
  Estimate: 1h
  ```

- [x] Optional cleanup: add pruneExpired internal action

  ```
  Files:
  - convex/lib/rateLimit.ts (prune function) or convex/crons.ts

  Goal: Provide a maintenance hook to delete expired rate-limit rows using `by_expires` index.

  Approach:
  1) Implement internal mutation/action `pruneExpiredRateLimits` scanning by_expires < now (batched).
  2) Log deleted count; keep disabled by default unless invoked manually/cron.

  Success Criteria:
  - [ ] Function deletes only expired rows; no active window removed. (validation pending due to test runner issue)

  Tests:
  - convex-test: seed expired + active rows; prune removes expired, leaves active.

  Depends: Add `rateLimits` table; rate limit helper.
  Estimate: 30m
  ```

- [x] Documentation and ADR

  ```
  Files:
  - docs/adr/ADR-00xx-rate-limits.md (new, MADR Light)
  - README.md or DESIGN_SYSTEM.md (brief note on env vars & rate limits)

  Goal: Capture decision record and surface env/config + usage to developers.

  Approach:
  1) Write ADR referencing alternatives and chosen fixed-window design.
  2) Add short README section for new env vars and migration note (run `pnpm convex dev`).

  Success Criteria:
  - [ ] ADR status = proposed (or accepted once merged).
  - [ ] Env vars documented with defaults.

  Depends: Core design done (no code dependency).
  Estimate: 30m
  ```

- [ ] Quality gate & verification

  ```
  Files:
  - n/a (commands)

  Goal: Ensure patch meets standards and passes checks.

  Approach:
  1) Run `pnpm lint`, `pnpm typecheck`, `pnpm test` (or focused convex-test suite).
  2) Verify coverage for new helper ≥90% and overall patch ≥80%.
  3) Spot-check Sentry/log output format manually in tests or logs.

  Success Criteria:
  - [ ] All commands green.
  - [ ] Coverage thresholds met.
  - [ ] No PII in emitted logs during tests.

  Depends: All code tasks.
  Estimate: 30m
  ```

## Boundaries / Not Building

- No client-side UI changes or localization; frontend handles generic message + retry-after.
- No per-IP/session throttling unless future abuse observed.
- No external rate-limit service (Redis/Upstash) introduction.
