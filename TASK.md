# PRD: Rate Limit AI Endpoints (Convex)

## 1) Executive Summary

- Problem: Authenticated users can spam AI-backed endpoints (exercise creation + on-demand reports) causing runaway OpenAI spend and DB churn.
- Solution: Per-user fixed-window rate limits enforced in Convex via a dedicated `rateLimits` table + shared helper, covering 10 exercise creates/min and 5 AI reports/day; clear client errors; logging + alerting.
- User value: Prevents cost/abuse while keeping legitimate usage fast; communicates limits explicitly so users know when to retry.
- Success metrics: <0.1% of AI requests exceed budget after rollout; 100% of rate-limit hits logged; no increase in p95 latency >5ms for protected endpoints; false-positive blocks <2%.

## 2) User Context & Outcomes

- Personas: logged-in lifters adding exercises (AI classification) and requesting AI workout reports.
- Pain removed: spammers can’t burn budget; regular users see predictable, descriptive limits instead of silent failures.
- Desired outcomes: (a) bound per-user AI cost; (b) keep normal flow unblocked; (c) support transparent retry timing in UI copy.

## 3) Requirements

### Functional

- Enforce per-user rate limits:
  - `exercise:create` (Convex action) ≤10 requests per 60s window (env-overridable).
  - `aiReport:onDemand` (Convex action) ≤5 requests per 24h window (env-overridable).
- Scope: user-triggered actions only; cron/backfill/admin paths are exempt by default (opt-in flag available).
- On limit breach, return a structured error with retry-after metadata and UX-friendly copy suitable for UI toasts.
- Logging: each deny + first hit per window logs scope, userId hash, windowStart, count; Sentry breadcrumb on deny.
- Configurability: thresholds/window defined in one module with env overrides (e.g., `RATE_LIMIT_EXERCISE_PER_MIN`, `RATE_LIMIT_REPORTS_PER_DAY`); sane defaults for local/dev.

### Non-functional

- Atomic within a single mutation/action; no race-based double-counts.
- Additional latency per check <5ms P50 inside Convex action.
- Storage bounded: stale windows auto-cleaned/TTL so table doesn’t grow unbounded.
- Works under concurrent requests; deterministic outcome (no over-allow).
- Error messages avoid PII; ready for future localization without backend change.

### Infrastructure requirements

- Quality gates: update Convex schema, unit tests (convex-test), keep `pnpm lint`, `pnpm typecheck`, `pnpm test` green.
- Observability: Sentry error reporting already present—emit rate-limit errors with safe metadata; structured `console.log` for allow/deny.
- Design consistency: follow existing Convex module layout (`convex/lib/*`, actions under `convex/`); no UI strings hard-coded in backend.
- Security: only authenticated users can consume AI; no PII in logs; secrets remain in Convex env; avoid leaking raw user IDs in client errors.

## 4) Architecture Decision

### Chosen approach: Fixed-window per-scope rows in `rateLimits` table

- Helper `assertRateLimit(ctx, { userId, scope, windowMs, limit, exempt?: boolean })` encapsulates logic; actions call it before invoking OpenAI.
- Implementation: compute `windowStart = floor(Date.now()/windowMs)*windowMs`; fetch latest row for user+scope; if same window and count>=limit → throw; else patch/increment; else insert new row.
- TTL/cleanup: set `expiresAt = windowStart + windowMs * 30` for GC; index by `expiresAt` for maintenance (optional cron cleanup).
- Why: tiny interface (one helper), predictable math, O(1) lookups, minimal schema change, low migration risk.
- Per-IP/session throttling: deferred; monitor Sentry for abuse and add scope types if needed.

### Alternatives (scored: user value 40%, simplicity 30%, explicitness 20%, risk 10%)

| Approach                                       | Score/10 | Kept/Rejected | Rationale                                                                                   |
| ---------------------------------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------- |
| A) Fixed-window table per scope (chosen)       | 8.6      | Kept          | High user value, simple, explicit thresholds, low infra risk.                               |
| B) Event log + sliding window query            | 7.2      | Rejected      | Precise but heavier queries, larger storage, more code; overkill for coarse limits.         |
| C) External rate-limit service (Upstash/Redis) | 6.0      | Rejected      | Adds new dependency, env/config drift risk, extra latency; little benefit at current scale. |

### Module boundaries

- New deep module `convex/lib/rateLimit.ts` (or similar) hides storage shape; public surface: `assertRateLimit` and `recordUsage`.
- Data store `rateLimits` is internal; callers see only helper signature + error format.
- Actions (`exercises.createExercise`, `ai/reports.generateOnDemandReport`) depend on helper, not table internals.

## 5) Data & API Contracts

- **Table `rateLimits`**
  - Fields: `userId: string`, `scope: "exercise:create" | "aiReport:onDemand" | string`, `windowStartMs: number`, `windowMs: number`, `count: number`, `expiresAt: number`.
  - Indexes: `by_user_scope_window` (`userId`, `scope`, `windowStartMs`), `by_expires` (`expiresAt`) for cleanup.
- **Helper return/throw**
  - On allow: `{ remaining: limit - count, resetAt: windowStartMs + windowMs }`.
  - On deny: throw `Error("Rate limit exceeded: <scope> (<count>/<limit>), retry after <iso>")` (UX-friendly message, no raw userId).
- **Configuration**
  - Env overrides: `RATE_LIMIT_EXERCISE_PER_MIN`, `RATE_LIMIT_REPORTS_PER_DAY`, `RATE_LIMIT_ENABLED_SCOPES` (optional), with defaults baked into helper.
- **Action integration**
  - `createExercise` action: call helper before `classifyExercise`; include normalized name in logs (no PII).
  - `generateOnDemandReport` action: replace current `checkRateLimit` query with helper; keep dedupe logic intact.
  - Cron/backfill/admin: pass `exempt: true` (skips counting).
- **Cleanup**
  - Optional internal cron/mutation `rateLimits.pruneExpired` filtering by `by_expires`; not on critical path.

## 6) Implementation Phases

- Phase 0: Lock thresholds (env defaults) and exemptions (cron/backfill/admin true). ADR required (new table + policy).
- Phase 1: Add `rateLimits` table to `convex/schema.ts`; implement `convex/lib/rateLimit.ts` with env config parsing; unit tests for helper (convex-test).
- Phase 2: Wire `assertRateLimit` into `exercises.createExercise`; add tests for per-user minute window + reset.
- Phase 3: Wire into `ai/reports.generateOnDemandReport`; remove/retire old `ai/data.checkRateLimit`; update tests for daily cap.
- Phase 4: Observability/hardening—Sentry breadcrumb on deny, structured logs, doc updates (`README`, maybe `DESIGN_SYSTEM`/backend section).

## 7) Testing & Observability

- Strategy: convex-test unit coverage for helper edge cases + action integrations; Vitest for existing report tests; lint/typecheck gates.
- Telemetry: log allow/deny with scope/user hash/windowStart; send Sentry warning for denies (rate limit tag), redacting userId; Sentry is the single alerting surface (email/Slack configured there).
- Performance: measure added latency in tests (mock timer) to ensure <5ms overhead.
- **Test Scenarios**
  ### Happy Path
  - [ ] User creates exercise under limit; count increments; downstream AI still runs.
  - [ ] User generates on-demand report within daily quota; report saved.
  ### Edge Cases
  - [ ] Window reset after 60s permits new exercise burst.
  - [ ] Concurrent requests from same user respect limit (no over-allow).
  - [ ] Different users isolated (no shared counters).
  - [ ] Cron/backfill actions skip limit when flagged.
  ### Error Conditions
  - [ ] Exceed exercise limit returns rate-limit error with retry time.
  - [ ] Exceed report limit returns error; existing dedupe still works.
  - [ ] Missing `userId` (unauthenticated) still blocked before helper (no table writes).
  - [ ] Expired rows pruned; storage doesn’t grow unbounded.

## 8) Risks & Mitigations

| Risk                                 | Likelihood | Impact | Mitigation                                                      | Owner |
| ------------------------------------ | ---------- | ------ | --------------------------------------------------------------- | ----- |
| Race conditions allow >limit         | Low        | Medium | Single mutation per call; read-modify-write on latest row only. | Eng   |
| Table bloat from stale windows       | Med        | Low    | TTL via `expiresAt`; optional prune job.                        | Eng   |
| Cron/backfill accidentally throttled | Med        | High   | Scope guard; skip helper for internal cron paths; tests cover.  | Eng   |
| User confusion from error copy       | Med        | Medium | Friendly message + retry-after; surface in UI toast.            | PM    |
| Time drift affects windows           | Low        | Low    | Use server time only; ignore client timestamps.                 | Eng   |

## 9) Open Questions / Assumptions

- Per-IP/session throttling deferred; add if Sentry shows shared-account abuse.
- UI copy localization handled in frontend; backend supplies structured message + retry-after only.

ADR Required: Yes (new data model + policy). Place in `/docs/adr/` during implementation.
