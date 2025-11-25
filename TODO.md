# TODO: Performance Optimization - Dashboard Hot Path & Analytics O(n) Fixes

**Context**: Users with 100-500 sets experiencing critical performance issues. Dashboard fetches entire workout history (500KB-5MB) to display today's sets (5-10KB). Analytics queries perform O(n×m) lookups with `exercises.find()` inside loops, resulting in up to 50,000 unnecessary iterations.

**Strategic Goal** (Ousterhout): Create deeper modules by moving data filtering server-side (information hiding), reducing client payload by 100x. Simplify analytics by eliminating quadratic complexity through proper data structures (Map instead of Array.find).

**Expected Impact**: Dashboard 10-50x faster (2s → 300ms), Analytics 20-50x faster (500ms → 50ms).

---

## Phase 1: Dashboard Hot Path Optimization (CRITICAL - 80% of traffic)

### Backend: Add Date-Filtered Query

- [x] **Add `listSetsForDateRange` query to `convex/sets.ts`**
  - Location: After `listSets` query (around line 113)
  - Create new query with args: `{ startDate: v.number(), endDate: v.number() }`
  - Use existing `by_user_performed` index with date range filters
  - Apply filters: `q.and(q.gte(q.field("performedAt"), args.startDate), q.lte(q.field("performedAt"), args.endDate))`
  - Maintain `order("desc")` for consistency with existing query
  - Add auth check: `await ctx.auth.getUserIdentity()` with early return `[]` if unauthenticated
  - Success criteria: Query returns only sets within date range, not entire history. Verify index is used (not full table scan).

- [x] **Write unit tests for `listSetsForDateRange` in `convex/sets.test.ts`**
  - Test case 1: Returns empty array for unauthenticated user
  - Test case 2: Returns only sets within specified date range (create 3 sets: yesterday, today, tomorrow; query for today only)
  - Test case 3: Returns sets in descending order by performedAt
  - Test case 4: Filters by userId (create sets for 2 users, verify isolation)
  - Test case 5: Handles edge case where startDate === endDate (single day query)
  - Test case 6: Returns empty array when no sets in range
  - Success criteria: All tests pass, coverage includes auth, date filtering, ordering, and user isolation.

### Frontend: Use Date-Filtered Query

- [x] **Update `Dashboard.tsx` to use `listSetsForDateRange` instead of `listSets`**
  - Location: Line 35 (replace `allSets` query)
  - Import `getTodayRange` from `@/lib/date-utils` (already imported line 23)
  - Calculate date range: `const { start, end } = getTodayRange();` (add before useQuery)
  - Replace query: `const todaysSets = useQuery(api.sets.listSetsForDateRange, { startDate: start, endDate: end });`
  - Remove client-side filtering logic (delete lines 64-71, the `useMemo` that filters `allSets`)
  - Update all downstream usages of `allSets` to use `todaysSets` directly
  - Verify `exerciseGroups` useMemo (line 74-77) now receives pre-filtered data
  - Success criteria: Dashboard only fetches today's sets from server. No client-side date filtering. Component renders correctly with filtered data.

- [x] **Verify `getTodayRange()` in `src/lib/date-utils.ts` returns timestamps**
  - Location: Likely exists in date-utils.ts (read file first)
  - Check return type: Should return `{ start: number, end: number }` (Unix timestamps in ms)
  - If returns Date objects, convert to `.getTime()` for Convex compatibility
  - Ensure start is midnight local time (00:00:00.000) and end is 23:59:59.999
  - Success criteria: Function returns numeric timestamps compatible with Convex performedAt field (number type).

- [x] **Update Dashboard component tests if they exist**
  - Search for `Dashboard.test.tsx` or similar test file
  - If exists: Update test mocks to use `listSetsForDateRange` instead of `listSets`
  - Mock `getTodayRange()` to return fixed timestamps for deterministic tests
  - Verify component still renders correctly with date-filtered query
  - Success criteria: Existing Dashboard tests pass with new query. No test failures from query change.
  - **Result**: No Dashboard tests exist (searched with Glob). N/A.

---

## Phase 2: Analytics O(n) Loop Optimization

### Fix analyticsFocus.ts O(n) Lookup

- [x] **Build exercise Map before loop in `getFocusSuggestions` (`convex/analyticsFocus.ts:107-114`)**
  - Location: After fetching exercises (line 63), before loop (line 80)
  - Add after line 74 (early return check): `const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex]));`
  - Replace line 113 `exercises.find((ex) => ex._id === set.exerciseId)` with `exerciseMap.get(set.exerciseId)`
  - Keep existing `if (!exercise) continue;` guard unchanged
  - Complexity reduction: O(n sets × m exercises) → O(n + m)
  - Success criteria: Loop uses Map.get() (O(1)) instead of Array.find() (O(n)). Logic unchanged, only performance improved.

- [x] **Verify analyticsFocus tests still pass after Map optimization**
  - Run existing tests: `pnpm test analyticsFocus.test.ts`
  - Ensure getFocusSuggestions returns same results with Map lookup
  - If tests fail, verify Map key/value structure matches original find() logic
  - Success criteria: All existing tests pass. No behavior changes, only performance improvement.

### Fix analyticsRecovery.ts O(n) Lookup

- [x] **Build exercise Map before loop in `getRecoveryStatus` (`convex/analyticsRecovery.ts:158-165`)**
  - Location: After fetching exercises (line 86), before processing sets (line 160)
  - Add after line 157 (metric initialization loop): `const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex]));`
  - Replace line 161 `exercises.find((ex) => ex._id === set.exerciseId)` with `exerciseMap.get(set.exerciseId)`
  - Keep existing `if (!exercise) continue;` guard unchanged
  - Complexity reduction: O(n sets × m exercises) → O(n + m)
  - Success criteria: Loop uses Map.get() (O(1)) instead of Array.find() (O(n)). Logic unchanged, only performance improved.

- [x] **Verify analyticsRecovery tests still pass after Map optimization**
  - Run existing tests: `pnpm test analyticsRecovery.test.ts`
  - Ensure getRecoveryStatus returns same muscle group data with Map lookup
  - If tests fail, verify Map contains exercises with muscleGroups field
  - Success criteria: All existing tests pass. Recovery calculations identical to before.

---

## Phase 3: Integration & Verification

### Type Safety & Schema Verification

- [ ] **Verify Convex schema supports date range filtering on `by_user_performed` index**
  - Location: `convex/schema.ts` (read to verify index structure)
  - Check that `by_user_performed` index includes `performedAt` field
  - Confirm index definition: `.withIndex("by_user_performed", ["userId", "performedAt"])`
  - No changes needed if index already optimal (it should be based on plan analysis)
  - Success criteria: Index supports efficient date range queries without full table scan.

- [ ] **Verify TypeScript types for new query parameters**
  - Run typecheck: `pnpm typecheck`
  - Ensure `startDate: v.number()` and `endDate: v.number()` infer correct types in Convex
  - Verify Dashboard.tsx passes numbers (not Date objects) to query
  - Fix any type errors from query signature changes
  - Success criteria: `pnpm typecheck` passes with no errors in Dashboard or sets query.

### End-to-End Testing

- [ ] **Manual testing: Dashboard with varying data sizes**
  - Test with 0 sets: Should show empty state, no errors
  - Test with 10 sets today: Should load instantly, show all 10 sets
  - Test with 100 sets total, 5 today: Should only fetch 5 sets, not 100
  - Test with 500 sets total, 20 today: Should load <500ms (use browser DevTools Network tab to verify payload size)
  - Verify no client-side filtering happening (check React DevTools Profiler)
  - Success criteria: Dashboard loads feel instant. Network payload reduced 10-100x. Only today's data transferred.

- [ ] **Manual testing: Analytics page with Map optimizations**
  - Navigate to `/analytics` page
  - Verify Focus Suggestions widget loads without lag
  - Verify Recovery Dashboard widget loads without lag
  - Check browser console for any errors from Map.get() returning undefined
  - Test with realistic data (50+ exercises, 200+ sets)
  - Success criteria: Analytics queries feel instant. No lag when opening analytics page. No console errors.

- [ ] **Run full test suite before deployment**
  - Execute: `pnpm test --run` (run all tests once, no watch mode)
  - Verify all existing tests pass (Dashboard, Analytics, sets query, exercises query)
  - If failures occur, diagnose whether from query changes or Map optimizations
  - Fix any broken tests (likely mock updates needed for new query signature)
  - Success criteria: `pnpm test --run` shows 100% pass rate. No new test failures introduced.

---

## Deployment Readiness

- [ ] **Pre-deployment verification checklist**
  - ✓ TypeScript compilation: `pnpm typecheck` passes
  - ✓ All tests pass: `pnpm test --run` succeeds
  - ✓ Linting clean: `pnpm lint` passes
  - ✓ Local manual testing: Dashboard and Analytics feel fast
  - ✓ No console errors in browser DevTools
  - ✓ Git status clean: All changes committed with clear commit messages
  - Success criteria: All quality gates pass. Ready for production deployment.

---

## Notes

**Performance Monitoring** (post-implementation):

- After deployment, monitor user feedback for speed improvements
- If users still report slowness, revisit measurement infrastructure from original plan
- Future optimization candidates in BACKLOG.md (getRecentPRs filtering, bundle splitting)

**Testing Philosophy**:

- Tests verify behavior unchanged, only performance improved
- Map optimizations are refactoring (same inputs → same outputs, just faster)
- Dashboard query change is feature enhancement (reduces data transfer)

**Strategic Improvements** (Ousterhout):

- Dashboard query: Deeper module (simple interface hiding filtering complexity)
- Analytics Map: Better data structure choice (O(1) vs O(n) for fundamental operation)
- Both changes: Information hiding principle (server handles filtering, client doesn't see entire dataset)
