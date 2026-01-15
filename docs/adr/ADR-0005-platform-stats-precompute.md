# ADR-0005: Pre-aggregated Platform Statistics

Date: 2026-01-13
Status: accepted

## Context and Problem Statement

The landing page displays social proof metrics: total sets logged, total lifters, sets this week. These require aggregating the entire `sets` table.

Challenge: Full table scans on every page load would be expensive and slow, especially as the dataset grows. The landing page is unauthenticated and high-traffic.

## Considered Options

### Option 1: Query on demand (not chosen)

- Pros: Always accurate; no cache invalidation.
- Cons: O(n) scan per page load; expensive at scale; slow response.

### Option 2: Pre-aggregate via cron job (chosen)

- Pros: O(1) read for page loads; one expensive scan per day; predictable cost.
- Cons: Stats up to 24h stale; requires cron configuration.

### Option 3: Incremental counters (not chosen)

- Pros: Real-time accuracy; O(1) read.
- Cons: Complex trigger logic; race conditions; counter drift risk; harder to debug.

### Option 4: External analytics service (not chosen)

- Pros: Battle-tested; scales independently.
- Cons: New dependency; data sync complexity; cost; overkill for simple counts.

## Decision Outcome

**Chosen**: Option 2 — Daily cron job computes stats and stores in single-document cache table.

### Why Pre-aggregation?

The key insight: landing page stats don't need real-time accuracy. Users don't care if the count is 10,423 vs 10,427. They care that the number is "impressively large" and "growing."

24-hour staleness is acceptable. Daily computation is simple and predictable.

### Cache Table Design

```typescript
platformStatsCache: {
  totalSets: v.number(),
  totalLifters: v.number(),
  setsThisWeek: v.number(),
  computedAt: v.number(),  // Unix timestamp
}
```

Single document table — only one row should exist. The cron job deletes old, inserts new.

### Minimum Threshold

Stats are hidden until `totalSets >= 100` to avoid embarrassing "3 sets logged" on new deployments:

```typescript
if (cached.totalSets < MIN_SETS_THRESHOLD) {
  return null;  // Hide section entirely
}
```

### Consequences

#### Good
- Landing page loads fast (single document read)
- Predictable Convex compute cost (one scan/day)
- Simple implementation (no distributed counters)

#### Bad
- Stats up to 24h stale
- Cron job must be configured correctly
- First deploy shows no stats until cron runs

#### Neutral
- Could reduce staleness by running cron more frequently if needed
- Could add manual refresh mutation for admin use

## Implementation Notes

- Cache table: `convex/schema.ts` (platformStatsCache)
- Compute mutation: `convex/platformStats.ts` (computePlatformStats)
- Public query: `convex/platformStats.ts` (getPlatformStats)
- Cron config: `convex/crons.ts` (daily schedule)
- UI component: `src/components/landing/PlatformStats.tsx`

## References

- convex/platformStats.ts (computation and query)
- convex/crons.ts (schedule configuration)
- convex/schema.ts (cache table definition)
