# Work Log: Enhanced Analytics & History

## Progress

### Phase 1: Daily Totals Banner

- [ ] Add `listSetsForDateRange` query to Convex
- [ ] Build `DailyTotalsBanner` component
- [ ] Integrate banner into Dashboard
- [ ] Add analytics event

### Phase 2: Day-First History

- [ ] Add `listSetsPaginated` query if needed
- [ ] Build `useDayPagedHistory` hook
- [ ] Refactor History page to use day-first pagination
- [ ] Update exercise name to be clickable link

### Phase 3: Exercise Detail

- [ ] Add exercise-scoped queries (`getRecentSetsForExercise`, `listSetsForExerciseDateRange`, `getExerciseAllTimeStats`)
- [ ] Build `exercise-insights.ts` lib
- [ ] Build Exercise Detail page + client component
- [ ] Update `useLastSet` to use limited query

### Testing

- [ ] Convex query tests (ownership, date ranges)
- [ ] Exercise insights unit tests
- [ ] Banner component tests

## Decisions Made

- (none yet)

## Blockers

- (none yet)
