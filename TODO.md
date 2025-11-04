# TODO: Analytics "War Room" Dashboard

**Branch**: `feature/analytics-ai-insights`
**Status**: 🔴 PRODUCTION HOTFIX IN PROGRESS
**Progress**: Phase 0 blocking Phase 9

## 📊 Current Status

All core features implemented and working:

- ✅ Full-width responsive dashboard layout (12-column grid)
- ✅ Progressive overload tracking with mini charts
- ✅ Muscle group recovery dashboard with 11 categories
- ✅ Focus suggestions (rule-based recommendations)
- ✅ Enhanced AI insights card (automated reports only)
- ✅ Timezone detection and sync (Clerk integration)
- ✅ Automated report generation (daily/weekly/monthly crons)
- ✅ Activity heatmap with proper tooltips
- ✅ Streak tracking and PR cards

**Remaining**: Manual testing, type safety verification, build checks

---

## 🔴 Phase 0: PRODUCTION HOTFIX - Exercise Creation Failure

**Critical Issue**: Exercise creation broken in production since ~4:03 PM (Nov 3, 2025)

**Root Cause**: `createExercise` mutation calls `classifyExercise()` (OpenAI SDK), which uses `setTimeout` for HTTP timeouts and retries. Convex mutations/queries **forbid** `setTimeout` (platform constraint).

**Error**: `Can't use setTimeout in queries and mutations. Please consider using an action.`

**Impact**: Users cannot create new exercises in production. Core app functionality broken.

**Deeper Issue**: 28 modified files + 4 new files uncommitted, yet production is running this code. Deployment process needs investigation and fix.

---

### 0.1 Investigation Phase (Understand Before Acting)

**Goal**: Measure scope and understand deployment model before choosing fix approach.

- [x] **Verify Convex deployment configuration**

  ```
  Investigation Results:
  - `.env.local` shows CONVEX_DEPLOYMENT=dev:curious-salamander-943
  - NEXT_PUBLIC_CONVEX_URL=https://curious-salamander-943.convex.cloud
  - Production deployment: prod:whimsical-marten-631
  - Dev deployment: dev:curious-salamander-943

  Conclusion: Dev and prod are SEPARATE deployments.
  - `pnpm convex dev` syncs to dev deployment ONLY
  - Production errors (whimsical-marten-631) came from explicit prod deployment
  - This means `pnpm convex deploy --prod` was run manually with uncommitted code
  ```

  - **Success criteria**: ✅ Confirmed separate deployments exist

- [x] **Audit uncommitted changes deployment path**

  ```
  Root Cause Identified:
  - `pnpm convex dev` deploys to dev:curious-salamander-943 ONLY
  - Production (prod:whimsical-marten-631) must be deployed via `pnpm convex deploy --prod`
  - Uncommitted code reached production because manual `pnpm convex deploy --prod` was run

  Process Gap:
  - No pre-deployment checks (git status clean, typecheck, tests)
  - No documentation of proper production deployment workflow
  - No CI/CD pipeline enforcing deployment from committed code

  Proper Workflow (should be):
  1. Commit all changes to git
  2. Push to GitHub
  3. Deploy to production from CI/CD OR manually from master branch
  4. Use `pnpm convex deploy --prod` ONLY from clean committed state
  ```

  - **Success criteria**: ✅ Process gap identified and documented

- [x] **Measure refactoring scope for action-based approach**

  ```
  Scope Analysis:

  Frontend Call Sites (2 files):
  - src/components/dashboard/inline-exercise-creator.tsx:39
  - src/components/dashboard/first-run-experience.tsx:29

  Backend Definition:
  - convex/exercises.ts:11 (mutation definition)

  Test Files (extensive but will auto-update):
  - convex/exercises.test.ts (26 calls)
  - convex/sets.test.ts (5 calls)
  - convex/analytics.test.ts (29 calls)
  - convex/analyticsRecovery.test.ts (27 calls)
  - convex/analyticsFocus.test.ts (28 calls)
  - convex/analyticsProgressiveOverload.test.ts (29 calls)

  DECISION: **2 frontend call sites = Path A (Simple Refactor)**

  Affected Files for Refactor:
  1. convex/exercises.ts - Convert mutation → action, add internal mutation
  2. src/components/dashboard/inline-exercise-creator.tsx - useMutation → useAction
  3. src/components/dashboard/first-run-experience.tsx - useMutation → useAction
  4. convex/exercises.test.ts - Update tests for action-based flow
  ```

  - **Success criteria**: ✅ Confirmed <10 call sites → proceed with Path A

- [x] **Review Convex actions documentation**

  ```
  Key Learnings from Convex Actions:

  Actions CAN:
  - Use setTimeout, setInterval (timers)
  - Make HTTP/HTTPS requests (fetch, axios, OpenAI SDK)
  - Call external APIs
  - Use any Node.js APIs
  - Run for up to 10 minutes

  Actions CANNOT:
  - Directly read from database (must use ctx.runQuery)
  - Directly write to database (must use ctx.runMutation)
  - Access ctx.db directly

  Action → Mutation Pattern:
  1. Action orchestrates external calls (AI classification)
  2. Action calls internal mutation for DB writes
  3. Internal mutations are not exposed to client (secure)

  Perfect for our use case:
  - createExercise action → calls OpenAI (setTimeout allowed)
  - createExercise action → calls createExerciseInternal mutation (DB write)
  ```

  - **Success criteria**: ✅ Understand action pattern for exercise creation

---

### 0.2 Decision Point (Choose Path Based on Evidence)

**IF call sites < 10**: Proceed with **Path A - Action Refactor** (do it right once)

**IF call sites >= 10**: Proceed with **Path B - Rollback + Staged Fix** (ship rollback, then proper fix)

---

### 0.3 Path A: Action-Based Exercise Creation (Simple Refactor)

**Only execute if Investigation Phase shows <10 call sites**

- [ ] **Create internal mutation for database operations**
  - File: `convex/exercises.ts`
  - Add `createExerciseInternal` as `internalMutation`
  - Move DB insert logic from `createExercise` mutation
  - Parameters: `{ userId: string, name: string, muscleGroups: string[] }`
  - Returns: `exerciseId`
  - **Success criteria**: Internal mutation handles all DB writes, no external API calls

- [ ] **Convert createExercise to action**
  - File: `convex/exercises.ts`
  - Change `export const createExercise = mutation({` to `action({`
  - Keep validation logic (`requireAuth`, `validateExerciseName`)
  - Call `classifyExercise()` for muscle groups (AI classification)
  - Call `ctx.runMutation(internal.exercises.createExerciseInternal, ...)` for DB write
  - Handle soft-delete restore logic via separate internal mutation call
  - **Success criteria**: Action orchestrates validation → AI → DB, no setTimeout errors

- [ ] **Add error handling for AI classification failures**
  - Wrap `classifyExercise()` in try-catch
  - On error: log to console, default to `muscleGroups: ["Other"]`
  - Ensure exercise creation succeeds even if AI fails
  - **Success criteria**: Exercise creation never fails due to OpenAI API issues

- [ ] **Update frontend to use action instead of mutation**
  - Search: `useMutation(api.exercises.createExercise)` → replace with `useAction(api.exercises.createExercise)`
  - Import: `import { useAction } from "convex/react"`
  - Test: Call action with same parameters, verify response handling
  - **Success criteria**: All call sites use `useAction`, UI behavior unchanged

- [ ] **Update exercise creation tests**
  - File: `convex/exercises.test.ts`
  - Convert mutation tests to action tests (use `ctx.runAction` instead of `ctx.runMutation`)
  - Mock `classifyExercise` return value for deterministic tests
  - Add test case: "creates exercise with fallback muscle groups when AI fails"
  - **Success criteria**: All exercise creation tests pass with action-based implementation

- [ ] **Test locally end-to-end**
  - Create exercise via UI → verify muscle groups populate via AI
  - Check dev logs for AI classification success
  - Test with duplicate name → verify proper error handling
  - Test with soft-deleted exercise restore → verify muscle groups preserved/added
  - **Success criteria**: Exercise creation works in dev without setTimeout errors

---

### 0.4 Path B: Rollback + Staged Fix (Large Scope)

**Only execute if Investigation Phase shows >=10 call sites**

- [ ] **Immediate rollback: Remove AI classification from mutation**
  - File: `convex/exercises.ts`
  - Remove `import { classifyExercise } from "./ai/openai"` (line 8)
  - Remove `classifyExercise()` call at line 81-90 (new exercise creation)
  - Remove `classifyExercise()` call at line 50-65 (soft-delete restore)
  - Set `muscleGroups: []` as default for all exercise creation
  - **Success criteria**: Exercise creation works in production, no AI classification temporarily

- [ ] **Verify rollback in production**
  - Deploy: `pnpm convex deploy --prod`
  - Test: Create exercise in production → should succeed with empty muscle groups
  - Check logs: `pnpm convex logs --prod --history 10` → verify no setTimeout errors
  - **Success criteria**: Exercise creation functional in production within 15 minutes

- [ ] **Document rollback in migration notes**
  - File: `convex/migrations/README.md` (create if doesn't exist)
  - Document: "2025-11-03: Temporarily disabled AI muscle group classification due to setTimeout constraint"
  - Note: "Will restore via action-based architecture in follow-up PR"
  - **Success criteria**: Future developers understand why muscle groups are empty

- [ ] **Create follow-up task for action-based refactor**
  - Create issue/ticket: "Restore AI muscle group classification via action-based architecture"
  - Reference: This TODO section (Path A tasks)
  - Priority: High (P1)
  - **Success criteria**: Work tracked, not forgotten

---

### 0.5 Process Fix (Prevent Future Occurrences)

**Execute regardless of path chosen**

- [ ] **Document production deployment workflow**
  - File: `CLAUDE.md` (project instructions)
  - Add section: "## Production Deployment Process"
  - Document: Proper command sequence (commit → push → CI/CD or manual `pnpm convex deploy --prod`)
  - Document: Never deploy uncommitted code to production
  - **Success criteria**: Clear deployment instructions in project docs

- [ ] **Add pre-deployment checklist**
  - File: `.github/DEPLOYMENT_CHECKLIST.md` (create)
  - Checklist items:
    - `git status` shows clean working directory (or all changes committed)
    - `pnpm typecheck` passes
    - `pnpm test --run` passes
    - `pnpm build` succeeds
    - Deploy from `master` branch only
  - **Success criteria**: Runbook exists for safe production deployments

- [ ] **Review Convex deployment model**
  - Understand: Does `convex dev` auto-deploy to production or separate deployment?
  - If separate: Good, continue using dev for testing
  - If shared: Configure separate dev deployment immediately
  - **Success criteria**: Dev and prod deployments are isolated

- [ ] **Add Convex deployment notes to README**
  - File: `README.md` or `CLAUDE.md`
  - Section: "Convex Deployments"
  - Note: Dev deployment URL, prod deployment URL
  - Note: How to switch between deployments
  - Command: `pnpm convex deploy --prod` for production
  - **Success criteria**: Team knows how to safely deploy Convex functions

---

### 0.6 Verification & Cleanup

- [ ] **Verify production exercise creation**
  - Test in production: Create 3 new exercises with different names
  - Verify: No setTimeout errors in logs (`pnpm convex logs --prod`)
  - Verify: Exercises save correctly with muscle groups (Path A) or empty array (Path B)
  - **Success criteria**: Exercise creation works reliably in production

- [ ] **Commit all working changes**
  - Review: `git status` - understand all 28 modified files
  - Stage: `git add convex/exercises.ts convex/ai/openai.ts` (hotfix files)
  - Commit: `git commit -m "fix(exercises): resolve setTimeout constraint in createExercise"`
  - Note: Hold off on committing other analytics changes until Phase 9 complete
  - **Success criteria**: Hotfix committed to feature branch, production stable

- [ ] **Update TODO.md progress**
  - Mark Phase 0 as COMPLETE
  - Update status to "Phase 9 - Final Integration & Testing"
  - **Success criteria**: TODO.md reflects current state

---

## ✅ Completed Phases (Archive)

### Phase 1: Layout Foundation & Quick Fixes

**Status**: ✅ COMPLETE | **Tasks**: 4/4

- Full-width analytics layout (`maxWidth={false}`)
- Activity heatmap duplicate legend removal
- VolumeChart component removal
- 12-column responsive grid implementation

**Key Commits**: 43cc944, 80a7b17

---

### Phase 2: Progressive Overload Widget

**Status**: ✅ COMPLETE | **Tasks**: 2/2

- Backend query (`analyticsProgressiveOverload.ts`) with trend detection
- Frontend widget with mini charts and trend indicators (↗️ ↔️ ↘️)

**Features**:

- Top 5 exercises by recent activity
- Last 10 workouts tracked per exercise
- 5% threshold for trend detection
- Recharts mini sparklines

---

### Phase 3: Muscle Group System & Recovery Dashboard

**Status**: ✅ COMPLETE | **Tasks**: 3/3

- Muscle group mapping system (11 categories with fuzzy matching)
- Recovery tracking backend query (`analyticsRecovery.ts`)
- Recovery dashboard widget with color-coded status

**Muscle Groups**: Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Core, Other

**Color Coding**:

- 0-2 days: Fresh (green)
- 3-4 days: Recovering (yellow)
- 5-7 days: Ready (orange)
- 8+ days: Overdue (red)
- Never trained: Gray

---

### Phase 4: Focus Suggestions Widget

**Status**: ✅ COMPLETE | **Tasks**: 2/2

- Backend query (`analyticsFocus.ts`) with rule-based recommendation engine
- Frontend widget with priority sorting and deep links

**Suggestion Types**:

- Neglected muscle groups (8+ days since last trained)
- Push/pull imbalance (33%+ difference in volume)
- 3-5 suggestions max, sorted by priority

---

### Phase 5: Enhanced AI Insights Card

**Status**: ✅ COMPLETE | **Tasks**: 2/2

- Removed manual report generation UI (automation only)
- Added report type badge (Daily/Weekly/Monthly)

**Design**: Automated cron-driven reports, no user controls

---

### Phase 6: Schema Changes for Users & Timezone

**Status**: ✅ COMPLETE | **Tasks**: 1/1

- Added `users` table with timezone and report preferences
- Fields: `clerkUserId`, `timezone`, `dailyReportsEnabled`, `weeklyReportsEnabled`, `monthlyReportsEnabled`
- Indexes: `by_clerk_id`, `by_daily_enabled`, `by_timezone`

---

### Phase 7: Client-Side Timezone Detection

**Status**: ✅ COMPLETE | **Tasks**: 2/2

- `useTimezoneSync` hook with Clerk auth guards
- Integration in `ConvexClientProvider`

**Auth Safety**: Only fires after `isLoaded=true` and `isSignedIn=true` to prevent race conditions

**Key Fix**: 6dad555 - Eliminated "Unauthorized" error on page load

---

### Phase 8: Automated Report Generation System

**Status**: ✅ COMPLETE | **Tasks**: 5/5

#### 8.1 Schema for Report Types

- Added `reportType` field to `aiReports` table
- Added compound index `by_user_type_date`
- Fixed Convex naming (renamed `muscle-group-mapping` → `muscle_group_mapping`)

#### 8.2 Report Generation Logic

- `calculateDateRange` helper (daily/weekly/monthly)
- Updated `generateReport` mutation with `reportType` parameter
- Backward compatible (defaults to "weekly")

#### 8.3 Daily Reports Cron

- Hourly cron with timezone-aware midnight detection
- `getEligibleUsersForDailyReports` query
- `generateDailyReports` action
- Distributes load across 24 hours

#### 8.4 Monthly Reports Cron

- Monthly cron (1st of month at midnight UTC)
- `getActiveUsersWithMonthlyReports` query
- `generateMonthlyReports` action

#### 8.5 Query Enhancement

- Added `reportType` filtering to `getLatestReport`
- Optional parameter for targeted report retrieval

**Cron Schedule**:

- **Daily**: Hourly at :00 (timezone-aware)
- **Weekly**: Sunday 9 PM UTC
- **Monthly**: 1st of month, midnight UTC

**Key Commits**: be38bfd, 11453ad, 64eb4cc, 016fc74, 0b3dc46

---

## 🎯 Active Tasks - Phase 9: Final Integration & Testing

### 9.1 Analytics Page Layout Finalization

**Status**: ✅ COMPLETE

- [x] Finalize grid layout with all widgets in correct order
- [x] All imports present
- [x] Loading state checks complete

**Final Layout**:

1. AI Insights (12 cols full width)
2. Focus Suggestions (4 cols) + Progressive Overload (8 cols)
3. Recovery Dashboard (6 cols) + Activity Heatmap (6 cols)
4. Streak Card (4 cols) + PR Card (8 cols)

---

### 9.2 Manual Testing Checklist

- [ ] **Responsive Layout Testing**
  - Mobile (360px): Single column stack, no horizontal scroll
  - Tablet (768px): 6-column layout, proper spacing
  - Desktop (1440px): 12-column grid, full width utilization
  - Ultra-wide (1920px+): Content spreads to edges, no awkward gaps

- [ ] **Progressive Overload Widget**
  - Create test user with 20+ sets across 3+ exercises
  - Verify mini charts render correctly
  - Test hover tooltips show dates and values
  - Verify trend indicators (↗️ ↔️ ↘️) match actual progression

- [ ] **Recovery Dashboard**
  - Balanced training: All muscle groups green/yellow
  - Imbalanced training: Some muscle groups red (8+ days)
  - Brand new user: All muscle groups gray (never trained)
  - Verify color coding matches days since last trained

- [ ] **Focus Suggestions**
  - Scenario: Haven't trained legs in 10 days → high priority suggestion
  - Scenario: Too much push, not enough pull → balance suggestion
  - Test deep link to log page works

- [ ] **AI Insights Card**
  - Verify no manual generation buttons visible
  - Check placeholder text for new users
  - Verify report type badge displays correctly (Daily/Weekly/Monthly)
  - Test with different report types

- [ ] **Timezone Detection**
  - Check browser console for timezone detection logs
  - Verify timezone saved to users table in Convex dashboard
  - Test with different timezones (mock system timezone if possible)
  - Verify no "Unauthorized" errors on page load

- [ ] **Activity Heatmap**
  - Verify only one legend visible (library default)
  - Test hover shows date and set count
  - Verify GitHub-style color scheme matches theme (light/dark)

- [ ] **Loading States**
  - Verify skeleton loaders render correctly for all widgets
  - Test all widgets handle undefined/null data gracefully
  - Ensure no console errors during loading

- [ ] **Empty States**
  - New user with no data: All empty states visible
  - User with minimal data: Partial empty states
  - Verify empty state messages are helpful and actionable

---

### 9.3 Type Safety Verification

- [ ] Run TypeScript type check: `pnpm typecheck`
  - Fix any type errors
  - Ensure all props properly typed
  - Verify no `any` types in new code
  - **Success Criteria**: Zero errors

---

### 9.4 Test Suite Execution

- [ ] Run full test suite: `pnpm test --run`
  - Verify all existing tests still pass
  - Verify all new backend query tests pass (progressive overload, recovery, focus)
  - Verify muscle group mapping tests pass
  - **Current**: 381 tests passing
  - **Success Criteria**: All tests pass

---

### 9.5 Production Build Verification

- [ ] Run production build: `pnpm build`
  - Ensure Next.js builds without errors
  - Verify bundle size is reasonable (no massive increases)
  - Check for any build warnings (ignore themeColor/viewport deprecation)
  - **Success Criteria**: Build completes successfully

---

## 📝 Reference & Notes

### Design Decisions

**Muscle Group Categories** (11 total):

- Upper: Chest, Back, Shoulders, Biceps, Triceps
- Lower: Quads, Hamstrings, Glutes, Calves
- Core: Core
- Fallback: Other

**Report Timing**:

- Daily: Opt-in only (default OFF) - future paywall feature
- Weekly: Enabled by default for active users
- Monthly: Opt-in only (default OFF)

**No Manual Generation**: All reports automated via cron jobs, no user controls

**Timezone Handling**:

- Client-side detection using `Intl.DateTimeFormat`
- Stored per-user in `users` table
- Hourly cron checks for midnight in each timezone

**Progressive Overload**:

- Top 5 exercises by recent activity
- Last 10 workouts tracked per exercise
- Trend threshold: 5% change between last 3 and previous 3 workouts

**Recovery Status Color Coding**:

- 0-2 days: Fresh (green) - recently trained
- 3-4 days: Recovering (yellow) - in recovery window
- 5-7 days: Ready (orange) - optimal training window
- 8+ days: Overdue (red) - neglected muscle group
- Never trained: Gray - no data

**Focus Suggestions**:

- Rule-based V1 (simple heuristics)
- 3-5 suggestions max
- Priority sorted (neglected > imbalance)
- Deep links to log page with exercise pre-selected

### Technical Notes

**Grid System**:

- Mobile: 1 column
- Tablet (md): 6 columns
- Desktop (lg): 12 columns
- Gap: 1rem (md), 1.5rem (lg)

**Convex Naming**:

- Files must use alphanumeric + underscores only (no hyphens)
- Example: `muscle_group_mapping.ts` not `muscle-group-mapping.ts`

**Auth Race Condition Fix**:

- Hook `useTimezoneSync` guards with `isLoaded` and `isSignedIn` checks
- Mutation `updateUserTimezone` returns early instead of throwing for unauthenticated
- Prevents "Unauthorized" errors during Clerk initialization

---

## 🎯 Success Criteria

When Phase 9 is complete:

1. ✅ All TypeScript checks pass (`pnpm typecheck`)
2. ✅ All tests pass (`pnpm test --run`)
3. ✅ Production build succeeds (`pnpm build`)
4. ✅ Manual testing checklist complete
5. ✅ No console errors on page load
6. ✅ Analytics dashboard is fully responsive (mobile → ultra-wide)
7. ✅ All widgets render correctly with real data
8. ✅ Empty states handled gracefully for new users
9. ✅ Cron jobs running successfully (check Convex logs)

---

**Feature Branch Ready for Merge**: When all Phase 9 tasks complete
