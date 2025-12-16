# Enhanced Analytics & History — Design

## Architecture Overview

**Selected Approach**: Client aggregation + targeted Convex queries (range/limit), wrapped in deep UI/hooks.
**Rationale**: Minimal new backend surface, reuses existing grouping/metrics libs, avoids unbounded `listSets(exerciseId)` reads during logging, keeps “load more days” semantics without schema migrations.

**Core Modules**

- `DailyTotalsBanner` — sticky “Today so far” totals, zero mental math
- `useDayPagedHistory` — “load more days” API; hides set-pagination + day-merge complexity
- `ExerciseDetailPage` — exercise-first pivot (7 sessions / 30d / all-time), numbers-only trends
- `ExerciseInsights` (lib) — converts raw sets → day sessions + trend stats (bodyweight + weighted + duration)
- `Convex Sets Queries` — narrow reads: today range, exercise range, recent sets (limit)

**Data Flow**
User → Dashboard (`/today`) → `api.sets.listSetsForDateRange(today)` → `DailyTotalsBanner` + `GroupedSetHistory`
User → History (`/history`) → `api.sets.listSetsPaginated` → `useDayPagedHistory` → day cards → exercise link
User → Exercise detail (`/history/exercise/:id`) → `api.sets.listSetsForExerciseDateRange(30d)` + `api.sets.getRecentSetsForExercise(limit)` + `api.sets.getExerciseAllTimeStats` → `ExerciseInsights` → UI

**Key Decisions**

1. Keep “Today” definition = device-local day boundary (matches `getTodayRange()` + current Dashboard behavior).
2. Add deep hook to present day-pagination UX while still using Convex’s set pagination (no schema change).
3. MVP trends = text metrics only (per `SPEC.md` non-goals: no charts).
4. All new Convex queries enforce `requireOwnership` to avoid IDOR (match existing `listSets` hardening).

## Module: DailyTotalsBanner

Responsibility: show sticky totals for _today_ (sets, reps, volume if weighted; duration if any).

Public Interface:

```tsx
type DailyTotals = {
  totalSets: number;
  totalReps: number;
  totalDurationSec: number;
  totalVolume: number; // converted to preferred unit
};

function DailyTotalsBanner(props: {
  todaysSets: Set[];
  preferredUnit: WeightUnit;
}): JSX.Element;
```

Internal Implementation:

- Compute totals from `todaysSets` (already server-filtered by `api.sets.listSetsForDateRange`).
- Format as compact header; sticky on mobile when form closed.
- Optional: animate number change (small scale/flash) on updates.

Dependencies:

- Reads: `todaysSets` from `Dashboard` query
- Uses: `convertWeight`, `normalizeWeightUnit`
- Observability: `trackEvent("Daily Totals Banner Viewed", …)` once per mount (see “Integration Points”)

Error Handling:

- `todaysSets === undefined` handled by existing Dashboard hydration guard (no banner render).

## Module: useDayPagedHistory

Responsibility: expose day-first history pagination + stable grouping, while fetching set pages.

Why needed:

- Today: History page groups by day client-side, but pagination is “25 sets”, not “N days”.
- Acceptance: “Load More loads more days, not more individual sets”.

Public Interface:

```ts
type DayGroup = {
  dayKey: string; // date.toDateString() (device-local)
  displayDate: string; // "Today" / "Yesterday" / weekday / "Jan 15"
  sets: Set[]; // newest-first within day
  totals: {
    setCount: number;
    reps: number;
    durationSec: number;
    volume: number;
  };
};

function useDayPagedHistory(opts: {
  initialDays: number; // e.g. 7
  pageSizeSets: number; // e.g. 50-150 (tune)
  preferredUnit: WeightUnit;
}): {
  dayGroups: DayGroup[];
  status: "loading" | "ready" | "loadingMore" | "done";
  loadMoreDays: (days: number) => Promise<void>;
};
```

Internal Implementation:

- Under the hood uses `usePaginatedQuery(api.sets.listSetsPaginated, …)` to fetch set pages.
- Maintains an accumulator:
  - `Map<dayKey, Set[]>` for merged days across pages (pages can split a day)
  - `orderedDayKeys: string[]` sorted newest→oldest (stable append)
- `loadMoreDays(n)` loops `loadMore(pageSizeSets)` until `dayGroups.length` increased by `n` or status `isDone`.

Core Algorithm (pseudocode):

```txt
state: dayMap, orderedDays
onNewPage(setsPage):
  for set in setsPage:
    dayKey = new Date(set.performedAt).toDateString()
    append set into dayMap[dayKey]
  recompute orderedDays (only when new dayKey appears)

loadMoreDays(targetNewDays):
  baseline = orderedDays.length
  while orderedDays.length < baseline + targetNewDays and canLoadMore:
    await loadMore(pageSizeSets)
```

Dependencies:

- Uses: `groupSetsByDay` (extended to support incremental merge) or new `mergeSetsIntoDayGroups()`
- Used by: `src/app/(app)/history/page.tsx`

Error Handling:

- Query errors bubble to `src/app/error.tsx` + Sentry via `reportError()`.

Perf Notes:

- `pageSizeSets` chosen so typical “7 more days” needs 1 fetch.
- Memory bounded by days shown; provide “collapse older days” later if needed.

## Module: History Page (Day-First)

Responsibility: day cards (collapsible), each day shows totals (incl volume) + exercise groups.

Changes vs today:

- Replace `groupSetsByDay(results)` with `useDayPagedHistory()` output.
- Day header includes `totalVolume` (Acceptance: date, total sets, total volume).
- “Load More” triggers `loadMoreDays(7)` (or similar), not `loadMore(25 sets)`.

Public Interface: page-level only.

UI Details:

- Day card header: `displayDate • {setCount} sets • {volume} {UNIT}` (volume only if >0)
- Expand reveals existing `ExerciseSetGroup` blocks (reuse).
- Exercise name becomes link to exercise detail page (Story 3).

## Module: ExerciseDetailPage

Responsibility: exercise-first pivot showing:

- chronological sessions grouped by day (default last 30 days)
- trend summary (7 sessions / 30 days / all time)
- bodyweight + weighted + duration support

Route:

- `src/app/(app)/history/exercise/[exerciseId]/page.tsx` (keeps “pivot from history” mental model)

Public Interface (UI composition):

```tsx
function ExerciseDetailPage(): JSX.Element;
```

Data Contracts (Convex):

```ts
// New: range-limited sets for this exercise (for 30d session list + 7-session computations)
api.sets.listSetsForExerciseDateRange({
  exerciseId: Id<"exercises">,
  startDate: number,
  endDate: number,
});

// New: last N sets for “recent performance” row (replaces unbounded listSets use)
api.sets.getRecentSetsForExercise({
  exerciseId: Id<"exercises">,
  limit: number, // default 5
});

// New: all-time stats without returning all sets
api.sets.getExerciseAllTimeStats({
  exerciseId: Id<"exercises">,
});
```

ExerciseInsights (lib) output:

```ts
type ExerciseTrendSummary = {
  windowLabel: "Last 7 sessions" | "Last 30 days" | "All time";
  setsPerSessionAvg?: number;
  repsPerSetAvg?: number;
  workingWeight?: number; // max or avg of “working sets” heuristic
  volumePerSessionAvg?: number;
  bestSet?: { reps?: number; weight?: number; performedAt: number };
  frequencyThisWeek?: number; // distinct days in current week
  frequencyLastWeek?: number;
};
```

Trend heuristics (MVP, explicit):

- “Session” == calendar day for that exercise (device-local).
- “Working weight” == max weight in session (simple, explainable).
- “Volume” == Σ(reps \* weight) for rep sets; bodyweight volume uses reps only.
- “Frequency” == distinct dayKeys containing ≥1 set for this exercise.

Set breakdown (weighted exercises, MVP):

- For selected window (default: most recent session):
  - Group sets by rounded weight (0.5 step for lbs, 0.5 for kg; configurable)
  - Show `135: 2 sets (avg 10 reps)`, etc.

## Core Algorithms

### Compute daily totals (banner)

```txt
input: todaysSets[], preferredUnit
totalSets = len(todaysSets)
totalReps = Σ(set.reps ?? 0)
totalDuration = Σ(set.duration ?? 0)
totalVolume = Σ( set.reps * convertWeight(set.weight, set.unit, preferredUnit) ) for sets with reps+weight
```

### Build exercise sessions (exercise detail)

```txt
input: sets[] (for one exercise), sorted desc
group by dayKey = new Date(performedAt).toDateString()
for each day group:
  sort sets desc
  compute totals + bestSet in day
sessions sorted newest→oldest
```

### Trend summary (7 sessions)

```txt
input: sessions[]
recent = first 7 sessions
previous = next 7 sessions (optional)
compute averages for sets/session, reps/set, volume/session, maxWeight/session
if previous exists:
  delta = recentAvg - prevAvg
  label “up/flat/down” using small threshold (e.g. ±5%)
```

## File Organization

New files (proposed):

- `src/components/dashboard/DailyTotalsBanner.tsx`
- `src/hooks/useDayPagedHistory.ts`
- `src/lib/exercise-insights.ts`
- `src/app/(app)/history/exercise/[exerciseId]/page.tsx`
- `src/app/(app)/history/exercise/[exerciseId]/ExerciseDetailClient.tsx` (if needed for hooks)

Modified files (proposed):

- `src/components/dashboard/Dashboard.tsx` (add banner; mobile sticky placement)
- `src/app/(app)/history/page.tsx` (switch to day-first pagination API)
- `src/components/dashboard/chronological-grouped-set-history.tsx` (day header adds volume; exercise name becomes link when in history context)
- `src/components/dashboard/exercise-set-group.tsx` (optionally accept `exerciseNameHref?: string`)
- `src/hooks/useLastSet.ts` (switch to new limited query)
- `convex/sets.ts` (add queries)
- `convex/sets.test.ts` (IDOR + date-range correctness for new queries)
- `src/lib/analytics.ts` (add new event names)

## Integration Points

### Convex

- New queries live in `convex/sets.ts` (or split into `convex/exerciseSets.ts` if file grows).
- Must call:
  - `requireAuth(ctx)` for authenticated-only queries OR return `[]` like existing patterns
  - `requireOwnership(exercise, identity.subject, "exercise")` to prevent IDOR

### Analytics / Observability

- Add typed events in `src/lib/analytics.ts`:
  - `"Daily Totals Banner Viewed"`: `{ userId?: string }`
  - `"History Load More Days"`: `{ days: number }`
  - `"Exercise Detail Viewed"`: `{ exerciseId: string }`
- Errors already route through `reportError()` + Sentry PII scrubbing (`src/lib/sentry.ts`).

### Env vars

- None new.

## State Management

- Server state: Convex queries (`useQuery`, `usePaginatedQuery`) are source of truth.
- Client derived state:
  - Day groups: derived + memoized in `useDayPagedHistory`
  - Trend summaries: derived in `ExerciseInsights` pure functions (easy unit tests)
- Persistence:
  - None required for MVP; optional later for “daily target 100 pushups” (localStorage).

## Error Handling Strategy

- Validation: keep in Convex (`validateReps/Weight/Duration/Unit` already).
- Auth:
  - Unauthed: match existing pattern (queries return empty; UI shows empty states).
- Not found / deleted exercise:
  - Exercise detail page: show “Exercise not found or deleted” with link back to `/history`.
- Unexpected:
  - Bubble to Next error boundary → `reportError()`; keep user flow resumable.

## Testing Strategy

Unit (Vitest):

- `src/lib/exercise-insights.test.ts`
  - sessions grouping (day boundaries)
  - bodyweight vs weighted vs duration aggregation
  - trend delta classification edge cases (no previous window)
  - weight-tier breakdown bucketing

Convex tests (`convex-test`):

- `convex/sets.test.ts`
  - `getRecentSetsForExercise` enforces ownership
  - `listSetsForExerciseDateRange` respects range + sorting
  - soft-deleted exercise behavior matches existing security stance

UI tests (Testing Library):

- `src/components/dashboard/DailyTotalsBanner.test.tsx` (renders correct totals)
- History page day-pagination hook tested via hook test or component harness (no flake; mock `usePaginatedQuery`)

E2E (Playwright):

- Pivot flow: `/history` expand day → click exercise → lands on detail page.

Coverage targets (new code):

- Core aggregation libs: 90%+ branches
- Hooks/UI glue: 70%+ branches

## Performance & Security Notes

- Avoid unbounded per-exercise fetch during logging:
  - Replace `useLastSet`’s `listSets(exerciseId)` with `getRecentSetsForExercise(limit)`.
- Keep day-pagination UX fast:
  - Tune `pageSizeSets` to minimize looped fetches.
- Security:
  - Every exercise-scoped query must `requireOwnership` (IDOR).
  - Never send PII in analytics event payloads (already sanitized).

## Alternative Architectures Considered

| Option                                                 | Pros                                          | Cons                                                            | Score (Simplicity/Depth/Explicitness/Robustness) | Verdict |
| ------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------- | -----------------------------------------------: | ------- |
| A. Client-only (reuse `listSets` unbounded)            | zero backend                                  | unbounded reads, slow on big histories                          |                                  18/30/12/4 = 64 | reject  |
| B. Targeted queries + client aggregation (selected)    | simple, scalable-enough, reuses existing libs | some client complexity (pagination merge)                       |                                  34/26/18/7 = 85 | win     |
| C. Server pre-aggregated “exercise insights” composite | 1 query, deep                                 | duplicates unit conversion + grouping logic; timezone ambiguity |                                  28/24/16/7 = 75 | later   |
| D. Materialized daily aggregates table                 | fastest reads                                 | schema + backfill + invariants, highest complexity              |                                  20/22/18/9 = 69 | later   |

## ADR Creation

Not required: no irreversible vendor/system choice; stays within existing Next.js + Convex + Clerk architecture.

## Open Questions / Assumptions

- “Session” definition: MVP treats session == day; do we later split multiple workouts/day (gap-based)?
- Volume for bodyweight: PRD uses reps; keep “volume” label for weighted only?
- Weight-tier bucketing: 0.5 step always, or infer from observed increments?
