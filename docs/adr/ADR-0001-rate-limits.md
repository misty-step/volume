# ADR-0001: Fixed-Window Rate Limits in Convex

Date: 2025-11-29
Status: proposed

## Context and Problem Statement

Authenticated users can spam AI-backed endpoints (exercise creation and on-demand AI reports), driving OpenAI spend and DB churn. We need per-user rate limits in Convex without adding new infrastructure.

## Considered Options

### Option 1: Fixed-window counters in Convex (chosen)

- Pros: Simple O(1) lookups; minimal schema change; deterministic behavior; no new infra or secrets; easy to reason about.
- Cons: Coarser fairness at window edges; potential brief bursts at boundaries.

### Option 2: Sliding window via event log

- Pros: Smoother fairness; precise enforcement.
- Cons: Heavier queries/storage; more code; higher latency; overkill for coarse limits.

### Option 3: External Redis/Upstash rate limiting

- Pros: Battle-tested primitives; shared across services.
- Cons: New dependency and secrets; added latency; cost; config drift risk.

## Decision Outcome

**Chosen**: Option 1 — fixed-window counters stored in Convex `rateLimits` table with reusable `assertRateLimit` helper.

Rationale: Maximizes simplicity and explicitness while meeting cost-control goal. Avoids new infra and keeps interface tiny; can extend with additional scopes or per-IP if abuse surfaces.

### Consequences

**Good**

- Bounded AI cost per user; deterministic enforcement.
- Small surface area (one helper) simplifies adoption across actions.
- No external services or new ops burden.

**Bad**

- Window-boundary bursts possible; may need smoothing if abuse increases.
- Additional table requires occasional pruning (handled via expiresAt/prune helper).

**Neutral**

- Could swap to sliding window later with same schema by tracking finer-grained events.

## Implementation Notes

- Table: `rateLimits { userId, scope, windowStartMs, windowMs, count, expiresAt }` with indexes `by_user_scope_window`, `by_expires`.
- Helper: `assertRateLimit(ctx, userId, { scope, windowMs, limit, exempt? })` with hashed-user logging and Sentry breadcrumb on deny.
- Defaults: 10 exercise creates/min; 5 reports/day; env overrides `RATE_LIMIT_EXERCISE_PER_MIN`, `RATE_LIMIT_REPORTS_PER_DAY`.
- Exemptions: cron/backfill/admin may pass `exempt: true`.
- Pruning: optional `pruneExpiredRateLimits` using `by_expires`.

## References

- DESIGN.md (Rate Limit AI Endpoints)
- TASK.md (PRD) EOF
