# Enhanced Analytics & History

## Problem Statement

Users logging sets throughout the day can't see accumulated totals (e.g., "87 pushups so far today") without mental math. The history view shows individual sets chronologically but lacks grouping and trends, making it impossible to answer "how are my curls progressing week-over-week?"

## User Personas

### Primary: The Volume Chaser

- **Context**: Logs bodyweight exercises (pushups, pullups) in scattered sets throughout the day
- **Pain Point**: Can't see daily total without expanding each exercise group and adding manually
- **Goal**: Hit volume targets ("100 pushups today") and track weekly consistency
- **Success**: Glances at dashboard and immediately knows "I'm at 87/100 pushups"

### Secondary: The Progressive Lifter

- **Context**: Follows structured program with weighted exercises (curls, bench, squats)
- **Pain Point**: History is a flat list of sets; can't see if curls are getting stronger over weeks
- **Goal**: Verify progressive overload is happening (more weight or reps over time)
- **Success**: Opens exercise history and sees upward trend line for volume/weight

## User Stories & Acceptance Criteria

### Story 1: Daily Totals Banner

As a Volume Chaser, I want to see my daily totals at a glance so I can track progress toward my target.

**Acceptance Criteria**:

- [ ] Dashboard shows sticky banner with total reps, sets, and volume (if weighted)
- [ ] Banner updates in real-time when a new set is logged
- [ ] Per-exercise groups still show their individual totals (current behavior)
- [ ] Mobile: banner visible without scrolling when form modal is closed

### Story 2: Day-First History View

As any user, I want to see my workout history grouped by day so I can review what I did on specific dates.

**Acceptance Criteria**:

- [ ] History page shows collapsible day cards (most recent first)
- [ ] Each day card header shows: date, total sets, total volume
- [ ] Expanding a day reveals exercise groups with their daily totals
- [ ] "Load More" loads more days, not more individual sets

### Story 3: Exercise-First Pivot

As a Progressive Lifter, I want to tap an exercise and see its history across days so I can track trends.

**Acceptance Criteria**:

- [ ] Tapping exercise name in history opens exercise detail view
- [ ] Exercise detail shows chronological list of sessions (grouped by day)
- [ ] Shows trend summary: "Last 7 sessions", "Last 30 days", "All time"
- [ ] For weighted: shows working weight trend and volume load
- [ ] For bodyweight: shows daily volume and max single-set

### Story 4: Trend Metrics for Bodyweight Exercises

As a Volume Chaser, I want to see bodyweight exercise trends so I know if I'm improving.

**Acceptance Criteria**:

- [ ] Daily volume displayed: "87 reps on Monday, 92 on Tuesday"
- [ ] Sets per session: "4 sets avg" with recent comparison
- [ ] Max single-set PR: "Best set: 25 reps" with date
- [ ] Frequency: "3x this week" with week-over-week delta

### Story 5: Trend Metrics for Weighted Exercises

As a Progressive Lifter, I want to see weighted exercise trends to verify progressive overload.

**Acceptance Criteria**:

- [ ] Working weight trend: average or max weight over time
- [ ] Volume load (weight × reps) per session with trend
- [ ] Set breakdown: how many sets at each weight tier (warmup vs working)
- [ ] Clear visualization (numbers, not just charts)

## UX Flow

### Daily Totals Flow

```
Open app → See sticky banner "Today: 87 reps • 6 sets"
            ↓
Log new set → Banner animates update → "Today: 97 reps • 7 sets"
            ↓
Scroll to history → See per-exercise groups with individual totals
```

### History Pivot Flow

```
Tap "History" nav → See day cards (Dec 12, Dec 11, Dec 10...)
            ↓
Expand "Dec 11" → See exercise groups: "PUSHUPS: 3 sets • 75 reps"
            ↓
Tap "PUSHUPS" → Pivot to exercise detail view
            ↓
See: "Last 7 sessions" with volume trend
     "Best single-set: 28 reps (Dec 8)"
     "This week: 4x, Last week: 3x"
```

**Key Screens/States**:

1. **Dashboard**: Sticky daily totals banner + exercise groups (existing)
2. **History**: Day-first collapsible cards with totals per day
3. **Exercise Detail**: Single exercise history across all time with trends

## Success Metrics

| Metric                  | Current             | Target              | How Measured                   |
| ----------------------- | ------------------- | ------------------- | ------------------------------ |
| Daily banner views      | 0                   | 5+ per session      | Analytics: banner_viewed event |
| History page engagement | Low                 | 2x increase         | Time on page, scroll depth     |
| Exercise detail views   | N/A (doesn't exist) | 30% of active users | Clicks to exercise detail      |

## Business Constraints

- **Dependencies**: Existing `computeExerciseMetrics` and `groupSetsByExercise` logic
- **Performance**: History query must support pagination without loading all sets
- **Mobile-first**: Banner must work on mobile viewport without obscuring form

## Non-Goals (Explicit Scope Boundaries)

What we are NOT building in this iteration:

- **Charts/graphs** — Text-based metrics only; visual charts are post-MVP
- **AI coaching** ("You're at 127% of average") — Future premium feature
- **Week-over-week comparison widget** — Focus on single-exercise trends first
- **Custom date range selection** — Default timeframes only (7d, 30d, all)
- **Export/share** — Analytics are view-only for now

## Implementation Phases

### Phase 1: Daily Totals Banner (Story 1)

Ship first. This is the core value prop. ~4 hours.

### Phase 2: History Redesign (Stories 2 & 3)

Day-first grouping + exercise pivot. ~8 hours.

### Phase 3: Trend Metrics (Stories 4 & 5)

Text-based trends in exercise detail view. ~6 hours.

## Design Decisions (From Review)

1. **Animation**: Number flip (iOS calculator style) when banner updates. Satisfying, tactile.
2. **Caching**: Compute on render. Today's data only = fast. Cache when/if it gets slow.
3. **State**: URL params for exercise detail (`/history?exercise=pushups`). Back button works naturally.
4. **Query strategy**: Paginate by day (not sets). "Load More" fetches next 7 days.

## Open Questions for Architect

1. **Banner position**: Sticky at top of viewport, or above exercise groups but scrollable?
2. **Duration exercises**: Does "total reps" make sense for duration-based exercises (planks)? Show time instead?
3. **Empty states**: What shows in exercise detail for new exercises with <3 sessions?
