# DESIGN: Rate Limit AI Endpoints (Convex)

## Architecture Overview

**Selected Approach**: Fixed-window counters stored in Convex `rateLimits` table with a reusable `assertRateLimit` helper, env-driven thresholds, and explicit exemptions.
**Rationale**: Single-dependency solution; O(1) lookups; minimal schema change; deterministic behavior under concurrency; keeps interface tiny while hiding storage/cleanup details. Per-IP/session throttling deferred until Sentry signals abuse.

**Core Modules**

- RateLimitStore – owns persistence of counters/windows, TTL/cleanup.
- RateLimitService – public `assertRateLimit` API; config parsing; exemption logic; logging/Sentry breadcrumbs.
- ExerciseActionGuard – wraps `createExercise` action to enforce per-minute limits.
- ReportActionGuard – wraps `generateOnDemandReport` action to enforce daily limits and replace legacy `checkRateLimit`.
- Observability Hooks – structured logs + Sentry tags for allow/deny.

**Data Flow**
User action → Action handler → RateLimitService.assert → (pass) downstream AI/OpenAI + DB writes; (deny) structured error → client toast.

**Key Decisions**

1. Fixed-window vs sliding: fixed-window for simplicity and deterministic cost; coarse limits are acceptable.
2. Local Convex table vs external store: local table avoids new infra/secrets; latency minimal.
3. Exemption flag: cron/backfill/admin skip counting; prevents accidental throttling of batch jobs.

## Module Deep Dives

### Module: RateLimitStore (convex/lib/rateLimit.ts)

Responsibility: hide storage/index details for rate-limit counters.

Public Interface (TS-ish):

```typescript
type RateLimitScope = "exercise:create" | "aiReport:onDemand" | string;
type RateLimitRecord = {
  userId: string;
  scope: RateLimitScope;
  windowStartMs: number;
  windowMs: number;
  count: number;
  expiresAt: number;
};

async function fetchWindow(
  ctx,
  userId: string,
  scope: RateLimitScope,
  windowStartMs: number
): Promise<RateLimitRecord | null>;
async function upsertWindow(ctx, record: RateLimitRecord): Promise<void>;
async function incrementWindow(
  ctx,
  recordId,
  count: number
): Promise<RateLimitRecord>;
```

Internal Implementation:

- Uses `rateLimits` table with indexes `by_user_scope_window` and `by_expires`.
- `expiresAt = windowStartMs + windowMs * 30` to allow GC; prune via optional cron/internal mutation.
- Encapsulates DB access; no other modules touch the table directly.

Dependencies: Convex `ctx.db`.
Used by: RateLimitService.

### Module: RateLimitService (convex/lib/rateLimit.ts, same file)

Responsibility: enforce limits; parse config; emit telemetry.

Public Interface:

```typescript
type RateLimitConfig = {
  scope: RateLimitScope;
  windowMs: number;
  limit: number;
  exempt?: boolean;
};

type RateLimitResult = {
  remaining: number;
  resetAt: number;
};

async function assertRateLimit(
  ctx,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult>;
```

Behavior:

- If `exempt` true → skip counting, return `{remaining: Infinity, resetAt: now}`.
- Compute `windowStartMs = Math.floor(Date.now() / windowMs) * windowMs`.
- Fetch existing window; if count >= limit → throw `RateLimitError` with retryAfterMs, scope, limit, count.
- Else increment existing or insert new record; return remaining/resetAt.

Logging & Sentry:

- On first hit each window and on deny: `console.log` structured `{scope, userHash, windowStartMs, count, limit}`; user hash = stable hash of userId to avoid PII.
- On deny: Sentry breadcrumb/tag `rate_limit=true`, `scope`, `userHash`, `remaining=0`, `resetAt`.

Config Parsing:

- Defaults: exercises 10/min; reports 5/day.
- Env overrides: `RATE_LIMIT_EXERCISE_PER_MIN`, `RATE_LIMIT_REPORTS_PER_DAY`, optional `RATE_LIMIT_ENABLED_SCOPES` (csv).
- Helper `getLimits()` returns map by scope for actions to consume.

### Module: ExerciseActionGuard (convex/exercises.ts)

Responsibility: gate `createExercise` action.

Integration:

```typescript
const { limit, windowMs } = limits["exercise:create"];
await assertRateLimit(ctx, userId, {
  scope: "exercise:create",
  limit,
  windowMs,
});
```

Notes: call before OpenAI classification to avoid wasted cost; keep existing validation flow.

### Module: ReportActionGuard (convex/ai/reports.ts)

Responsibility: gate `generateOnDemandReport` action.

Integration:

```typescript
const { limit, windowMs } = limits["aiReport:onDemand"];
await assertRateLimit(ctx, userId, {
  scope: "aiReport:onDemand",
  limit,
  windowMs,
});
```

Notes: remove legacy `checkRateLimit` query; dedupe logic in `generateReport` untouched.

### Module: Observability Hooks

Responsibility: ensure rate-limit signals surface.

Implementation:

- Add Sentry breadcrumb/tag inside `assertRateLimit` on deny.
- Keep console logs structured; avoid raw userId (use hash).
- Optional `rateLimits.pruneExpired` internal action to log rows deleted.

## Core Algorithms (Pseudocode)

### assertRateLimit

1. If config.exempt → return `{remaining: Infinity, resetAt: now}`.
2. `now = Date.now(); windowStart = floor(now / windowMs) * windowMs; resetAt = windowStart + windowMs`.
3. `record = fetchWindow(userId, scope, windowStart)`.
4. If `record && record.count >= limit` → log + Sentry breadcrumb → throw RateLimitError `{scope, limit, count: record.count, retryAfterMs: resetAt - now}`.
5. If `record` exists → `record = incrementWindow(record._id, 1)`.
6. Else insert `{userId, scope, windowStartMs: windowStart, windowMs, count: 1, expiresAt: windowStart + windowMs * 30}`.
7. Return `{remaining: limit - record.count, resetAt}`.

### pruneExpired (optional)

1. Query `rateLimits` by `by_expires` where `expiresAt < now`.
2. Delete in small batches; log count.

## File Organization

```
convex/
  lib/
    rateLimit.ts          # Store + service + error class + config helpers
  schema.ts               # add rateLimits table + indexes
  exercises.ts            # call assertRateLimit in createExercise action
  ai/
    reports.ts            # replace checkRateLimit with assertRateLimit
    data.ts               # remove checkRateLimit helper if unused
  crons.ts (optional)     # pruneExpired hook if enabled
docs/adr/
  ADR-00xx-rate-limits.md # MADR Light (proposed → accepted)
```

## Integration Points

- **Database**: add `rateLimits` table to `schema.ts`; indexes `by_user_scope_window`, `by_expires`.
- **Env vars**: `RATE_LIMIT_EXERCISE_PER_MIN`, `RATE_LIMIT_REPORTS_PER_DAY`, `RATE_LIMIT_ENABLED_SCOPES` (csv). Owners: Eng. Defaults baked in.
- **External services**: none added; continues to use OpenAI.
- **Observability**: Sentry breadcrumb/tag on deny; structured logs; optional dashboard for deny counts by scope.
- **CI/Quality gates**: ensure `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage` include new files; husky/lint-staged already present.

## State Management

- Server-side only; counters keyed by `userId` + `scope` + `windowStart`.
- No client cache; client just consumes structured error for UX toast.
- Concurrency: per-call action; Convex mutation guarantees atomicity; record fetch/update happens within same action/mutation.

## Error Handling Strategy

- Custom `RateLimitError` (extends Error) with fields: `scope`, `limit`, `count`, `retryAfterMs`, `resetAt`.
- Actions catch? Prefer throw; client layer to map to toast. Keep message non-PII, friendly.
- Other errors propagate unchanged; rate-limit errors tagged for Sentry.

## Testing Strategy

- Unit (convex-test):
  - RateLimitService: allow, deny, window reset, concurrency (sequential), env overrides, exempt path.
  - Store: increment/insert, TTL calculations, isolation per user/scope.
- Integration:
  - `createExercise`: 10 requests in 60s deny on 11th; after window reset allow.
  - `generateOnDemandReport`: 5/day deny on 6th; dedupe still prevents double billing.
  - Exempt path: cron/backfill passes even after limit.
- Coverage targets: ≥80% patch; ≥90% for RateLimitService.
- Tooling: `pnpm test` (Vitest/convex-test); keep `pnpm lint`/`typecheck` green.

## Performance & Security Notes

- Latency budget: <5ms added per call (single indexed query + patch/insert).
- Storage: TTL keeps rows bounded; optional prune job.
- Security: per-user auth already enforced; no PII in logs; userId hashed for telemetry; secrets unchanged.
- Alerting: Sentry as single surface; configure project alert for rate_limit tag spike.

## Alternative Architectures Considered

| Option                          | Pros                                      | Cons                               | Verdict | Revisit Trigger                             |
| ------------------------------- | ----------------------------------------- | ---------------------------------- | ------- | ------------------------------------------- |
| Fixed-window in Convex (chosen) | Simple, cheap, deterministic, no new deps | Coarser fairness at window edges   | Adopt   | If abuse patterns need smoother fairness    |
| Sliding window via event log    | More accurate smoothing                   | Heavier queries/storage, more code | Skip    | If false positives on bursts become UX pain |
| External Redis/Upstash          | Battle-tested primitives                  | New infra, secrets, latency, cost  | Skip    | If multi-service sharing limits is required |

## ADR

- Create `docs/adr/ADR-00xx-rate-limits.md` (proposed) documenting fixed-window store vs alternatives; mark accepted after implementation.

## Open Items / Assumptions

- Per-IP/session throttling deferred; add scope type if Sentry shows shared-account abuse.
- UI localization handled client-side; backend provides structured message + retry-after.
