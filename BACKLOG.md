# BACKLOG: Volume Workout Tracker

_A comprehensive map of opportunities to improve product, codebase, and development experience._

**Last Groomed:** 2025-11-03
**Status:** Production Hotfix Complete - Deployment Process Improved
**Audit Method:** 7-perspective analysis (complexity, architecture, security, performance, maintainability, UX, product-vision)

**Summary**: Analyzed 89 findings across 7 specialized perspectives. Overall grade: **B+ (Very Good for MVP)**. Strong foundations with tactical debt accumulation. Recent PR #8 fixed 3 CRITICAL issues (IDOR, type duplication, O(n²) lookups). **Nov 3, 2025**: Resolved production exercise creation failure, documented deployment process.

---

## 🔴 Production Incident Learnings (Nov 3, 2025)

**Incident**: Exercise creation broken in production due to `setTimeout` constraint violation in Convex mutations.

**Root Cause**: `createExercise` mutation called `classifyExercise()` (OpenAI SDK), which uses `setTimeout` for HTTP timeouts/retries. Convex platform forbids `setTimeout` in mutations/queries.

**Resolution**: Path chosen after investigation → [to be documented after hotfix complete]

**Process Improvements Implemented**: See TODO.md Phase 0.5 (Process Fix)

---

### Future Enhancement: AI Classification via Action-Based Architecture

**Context**: Muscle group classification via OpenAI GPT-5-nano is desirable feature, but was implemented incorrectly (called from mutation instead of action).

**Proper Architecture** (for future restoration):

```typescript
// Action (can use setTimeout, HTTP calls, external APIs)
export const createExercise = action({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // 1. Validation
    const normalizedName = validateExerciseName(args.name);

    // 2. AI Classification (uses setTimeout - allowed in actions)
    let muscleGroups: string[] = ["Other"];
    try {
      muscleGroups = await classifyExercise(normalizedName);
      console.log(
        `Classified "${normalizedName}" → ${muscleGroups.join(", ")}`
      );
    } catch (error) {
      console.error(`Classification failed:`, error);
    }

    // 3. Database write (via internal mutation)
    const exerciseId = await ctx.runMutation(
      internal.exercises.createExerciseInternal,
      {
        userId: identity.subject,
        name: normalizedName,
        muscleGroups,
      }
    );

    return exerciseId;
  },
});

// Internal Mutation (database operations only, no external calls)
export const createExerciseInternal = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    muscleGroups: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicates...
    // Handle soft-delete restore...
    // Insert new exercise...
    return exerciseId;
  },
});
```

**Frontend Update Required**:

```typescript
// Change from:
const createExercise = useMutation(api.exercises.createExercise);

// To:
const createExercise = useAction(api.exercises.createExercise);
```

**Effort**: 4-6h (refactor + tests + frontend updates)
**Value**: Restores AI muscle group classification feature
**Priority**: HIGH (if Path B rollback was chosen) or COMPLETE (if Path A was chosen)

---

### Process Improvement: Deployment Workflow Documentation

**Gap Identified**: Uncommitted code deployed to production without review.

**Root Cause**: Unclear deployment process, possibly `convex dev` auto-syncing to production.

**Required Documentation** (see TODO.md Phase 0.5):

- Production deployment checklist
- Convex deployment model (dev vs prod)
- Git workflow (never deploy uncommitted code)
- Pre-deployment validation (typecheck, tests, build)

**Effort**: 2h (documentation + team alignment)
**Value**: **CRITICAL** - Prevents future production incidents
**Priority**: **IMMEDIATE**

---

### [INFRA] Vercel Analytics and Observability

## Analytics Dashboard Future Enhancements

_Post-V1 improvements for analytics dashboard identified during redesign planning (2025-10-31)_

---

### User-Customizable Widget Layout

**Effort**: 8-12h | **Value**: MEDIUM | **Priority**: LOW

**Current State**: Fixed, opinionated layout (no user customization)

**Enhancement**: Allow users to:

- Drag-and-drop widgets to reorder
- Show/hide specific widgets
- Save layout preferences to user profile
- Reset to default layout

**Implementation**:

- Use `react-grid-layout` or `dnd-kit` for drag-and-drop
- Store layout preferences in users table
- Add "Customize Layout" toggle in header

**Trade-offs**:

- ✅ Power users can optimize for their workflow
- ✅ Reduces cognitive load (hide unused widgets)
- ❌ Adds complexity to codebase (layout state management)
- ❌ Most users won't customize (80/20 rule)

**Decision**: Defer until user feedback requests it. Fixed layout is simpler and works for 90% of users.

---

### AI-Powered Focus Suggestions (V2)

**Effort**: 6-8h | **Value**: HIGH | **Priority**: MEDIUM

**Current State**: Rule-based suggestions (exercises not trained, muscle imbalances)

**Enhancement**: Use AI to generate personalized suggestions based on:

- Training history patterns
- Progressive overload trends
- Recovery status across muscle groups
- Personal goals (if we add goal tracking)
- Injury history (if we add injury tracking)

**Implementation**:

- Add new OpenAI prompt: "Analyze user's training data and suggest 3-5 focus areas"
- Include all relevant data (recovery status, progression, frequency)
- Cache suggestions (generate once per day with daily report)
- Cost: ~$0.005 per suggestion generation (GPT-5 mini)

**Benefits**: More sophisticated, personalized recommendations than rule-based logic

**Decision**: Implement after V1 ships, once we have real usage data to validate rule-based suggestions work

---

### Exercise Classification by User Tagging

**Effort**: 4-6h | **Value**: MEDIUM | **Priority**: LOW

**Current State**: Predefined muscle group mapping (hardcoded in `muscle-group-mapping.ts`)

**Enhancement**: Allow users to tag exercises with muscle groups:

- "Edit Exercise" → Add muscle group tags
- Custom muscle group names (beyond predefined 11)
- Override default mapping for edge cases

**Use Cases**:

- Uncommon exercise variations not in predefined map
- User has unique exercise names
- Bodybuilders want granular tracking (upper chest, lower chest, etc.)

**Implementation**:

- Add `muscleGroups: v.array(v.string())` to exercises table
- Update exercise creation/editing UI to include muscle group selector
- Fallback to predefined mapping if user hasn't tagged

**Trade-offs**:

- ✅ Handles 100% of exercises (not just common ones)
- ✅ User control over muscle group categorization
- ❌ Adds friction to exercise creation (more fields to fill)
- ❌ Most users won't use it (predefined mapping works for 90%+)

**Decision**: Defer to BACKLOG. Evaluate after V1 ships based on user feedback about unmapped exercises.

---

### Progressive Overload Sparklines (Alternative Visualization)

**Effort**: 2-3h | **Value**: LOW | **Priority**: LOW

**Current State**: Mini Recharts line charts (height: 80px, interactive tooltips)

**Enhancement**: Replace with inline sparklines (React Sparklines library):

- Smaller footprint (30-40px height)
- Non-interactive (pure visual indicator)
- Faster rendering (simpler SVG)
- More widgets visible without scrolling

**Trade-offs**:

- ✅ More compact, cleaner visual design
- ✅ Faster initial render (lighter library)
- ❌ Loss of interactivity (no hover tooltips)
- ❌ Harder to see exact values (need separate number display)

**Decision**: Keep Recharts for V1. Tooltips are valuable for power users. Revisit if performance becomes issue.

---

### Report History Browser

**Effort**: 3-4h | **Value**: MEDIUM | **Priority**: MEDIUM

**Current State**: Only latest report visible on analytics page

**Enhancement**: Add "View Past Reports" link that opens modal/page with:

- Paginated list of all historical reports
- Filter by report type (daily/weekly/monthly)
- Compare reports side-by-side
- Export report as PDF/markdown

**Implementation**:

- Already have `getReportHistory` query in `convex/ai/reports.ts`
- Create new `ReportHistoryModal` component with pagination
- Add filter UI for report type
- Use existing pagination logic (25 per page)

**Value**: Allows users to see progress over time, compare weekly summaries

**Decision**: Implement in next iteration (post-V1). Core value is current report, history is nice-to-have.

---

### Quarterly and Annual Reports

**Effort**: 2-3h | **Value**: MEDIUM | **Priority**: LOW

**Current State**: Daily, weekly, monthly reports only

**Enhancement**: Add quarterly (every 3 months) and annual (end of year) reports:

- Quarterly: Macro trends, quarter-over-quarter comparison
- Annual: Year in review, personal bests, total volume stats

**Implementation**:

- Add `reportType: "quarterly" | "annual"` to schema
- Add cron jobs for quarterly (1st day of Q1/Q2/Q3/Q4) and annual (Jan 1)
- Update AI prompt to generate appropriate content for timeframe

**Trade-offs**:

- ✅ Long-term motivation (seeing annual progress)
- ✅ Shareable content (year-in-review posts to social media)
- ❌ Low frequency (users may forget they exist)
- ❌ Minimal incremental value over monthly reports

**Decision**: Defer to BACKLOG. Focus on daily/weekly/monthly for V1. Add if users request it.

---

### Settings Page for Report Preferences

**Effort**: 6-8h | **Value**: HIGH | **Priority**: HIGH (post-V1)

**Current State**: No UI to toggle daily/weekly/monthly reports (schema supports it, no frontend)

**Enhancement**: Add settings page with report preferences:

- Toggle daily reports on/off (with paywall indicator)
- Toggle weekly reports on/off
- Toggle monthly reports on/off
- Choose report delivery time (e.g., 8am instead of midnight)
- Opt out of AI reports entirely

**Implementation**:

- Create `src/app/settings/page.tsx`
- Add form with toggle switches
- Call `updateUserPreferences` mutation (need to create)
- Show paywall message for premium features (daily reports)

**Value**: Essential for user control, reduces unwanted notifications

**Decision**: MUST implement before daily reports go live. Daily reports are opt-in, so users need UI to opt in.

**Priority**: HIGH (blocking for daily reports launch)

---

### Muscle Group Volume Trends Chart

**Effort**: 4-6h | **Value**: MEDIUM | **Priority**: LOW

**Current State**: Removed "Volume by Exercise" chart (comparing deadlifts to curls doesn't make sense)

**Enhancement**: Replace with "Volume by Muscle Group" chart:

- Bar chart showing volume per muscle group (last 30 days)
- Stacked bars for compound lifts (e.g., deadlift = Back + Hamstrings + Glutes)
- Identify imbalances visually (too much push vs pull)
- Trend over time (weekly muscle group volume)

**Implementation**:

- Query sets, map to muscle groups using existing mapping
- Aggregate volume per muscle group
- Use Recharts BarChart with stacked bars
- Color code by muscle group family (push = red, pull = blue, legs = green)

**Value**: Better than raw exercise comparison, shows training balance

**Decision**: Good candidate for future iteration. Defer until V1 ships and we validate muscle group mapping works.

---

## High-Value Improvements

_Changes that significantly improve user experience, developer velocity, or system reliability._

**Total Effort**: ~28h for all high-priority items

---

- support exercise durations
  - eg planks don't have reps, they have durations; dead hangs don't have reps, they have durations
- support cardio?
  - maybe different than exercise durations
  - running, swimming, etc
  - some of these have distance in addition to duration, some fit neatly into duration
  - maybe it's overcomplicated and we are fine without including distance here, just stick with reps vs duration + weight

### 8. [Testing] Add Unit Tests for Error Handler Production/Dev Branching

**File**: `src/lib/error-handler.ts`
**Perspectives**: maintainability-maven
**Severity**: **MEDIUM**
**Source**: PR #10 review feedback

**Missing Coverage**: error-handler.ts production vs development logging behavior not tested. No validation that sanitization works correctly in production builds.

**Test Cases Needed**:

```typescript
// NEW: src/lib/error-handler.test.ts
describe("handleMutationError", () => {
  describe("production logging", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });
    it("logs sanitized error message only");
    it("does not log full error object or stack traces");
  });

  describe("development logging", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });
    it("logs full error object with stack traces");
    it("logs context string for debugging");
  });
});
```

**Effort**: 1-2h (test infrastructure + assertions)
**Priority**: **MEDIUM** - Validates critical security behavior

---

### 8.5. [Testing] DST Transition Edge Case Coverage

**File**: `src/lib/date-utils.test.ts`
**Source**: PR #20 review feedback (Claude AI, 2025-10-29)
**Priority**: **LOW** - Deferred to future PR
**Effort**: 30 minutes

**Missing Test Case**: Daylight saving time transitions where clocks "spring forward" or "fall back"

Test scenario:

```typescript
it("handles DST transition correctly", () => {
  // March 10, 2024 2:00 AM → 3:00 AM (DST starts)
  vi.setSystemTime(new Date("2024-03-10T07:00:00Z")); // 2:00 AM EST
  const { start, end } = getTodayRange();
  // Verify range is still valid despite ambiguous/non-existent times
  expect(end - start).toBeGreaterThan(0);

  // Verify formatTimeAgo handles ambiguous times
  const timestamp = new Date("2024-03-10T06:30:00Z").getTime();
  expect(() => formatTimeAgo(timestamp, "compact")).not.toThrow();
});
```

**Value**: Edge case coverage, prevents DST bugs in time formatting
**Risk**: **VERY LOW** - JavaScript Date API handles DST automatically in most cases

---

### 9. [Testing] E2E Test Infrastructure with Playwright

**Context**: Post-MVP enhancement for regression prevention
**Priority**: **LOW** - Add only when patterns emerge
**Effort**: 6-8 hours initial setup + ongoing maintenance

**Recommendation**: Wait until production deployment shows which user flows need E2E coverage

**Setup**:

```bash
pnpm add -D @playwright/test
npx playwright install
```

**Critical Flows to Cover** (when implemented):

- Complete workout flow (create exercise → log sets → view history)
- Exercise management (create → edit → delete with sets)
- Weight unit switching persistence
- Mobile focus flow (exercise → reps → weight → submit)

**Benefits**: Catches regressions in critical user journeys
**Cost**: Slow test execution, flaky on portal components, high maintenance

**Decision Point**: Add E2E after 3+ production regressions slip through unit/integration tests

---

### 10. [Testing] Visual Regression Testing

**Tools**: Chromatic, Percy, or Playwright screenshots
**Priority**: **LOW** - Post-MVP
**Effort**: 4-6 hours setup

**Use Cases**:

- Component library visual changes
- Responsive layout verification
- Dark mode consistency
- Cross-browser rendering

**Recommendation**: Useful for team collaboration, overkill for solo MVP

---

### 11. [Testing] Performance Testing for Large Datasets

**File**: `tests/performance/large-history.spec.ts`
**Priority**: **MEDIUM** - Add when users report slowness
**Effort**: 2-3 hours

**Test Scenarios**:

- Render 1000+ sets in GroupedSetHistory
- Filter/search performance in ExerciseManager
- Dashboard stats calculation with 500+ exercises

**Approach**: Vitest benchmarks or Chrome DevTools profiling

---

### 11. [Performance] Client-Side Filtering Wasteful - Optimize Last Set Query

**File**: `src/components/dashboard/quick-log-form.tsx:76-85`
**Perspectives**: performance-pathfinder, user-experience-advocate
**Severity**: **MEDIUM**

**Issue**: Fetches ALL user sets then filters client-side to find last set for selected exercise.

**User Impact**:

- Currently (100 sets): ~5KB payload, <10ms ✓
- At 1,000 sets: ~50KB, 20-30ms
- At 10,000 sets: ~500KB, **100-200ms visible lag** ❌

**Optimization**: Backend already supports filtering by exerciseId:

```typescript
// Instead of:
const allSets = useQuery(api.sets.listSets, {});
const lastSet = useMemo(() => {
  const exerciseSets = allSets?.filter(
    (s) => s.exerciseId === selectedExerciseId
  );
  return exerciseSets?.[0] ?? null;
}, [selectedExerciseId, allSets]);

// Use:
const exerciseSets = useQuery(
  api.sets.listSets,
  selectedExerciseId ? { exerciseId: selectedExerciseId } : "skip"
);
const lastSet = exerciseSets?.[0] ?? null;
```

**Expected Speedup**: 500KB → <1KB payload, 200ms → <5ms at 10k sets (**40x improvement**)

**Effort**: 15m
**Priority**: **MEDIUM** - Scales better, prevents future lag

---

### 12. [UX] Undo Toast Auto-Dismisses Too Fast (3 Seconds)

**File**: `src/components/dashboard/undo-toast.tsx:14-18`
**Perspectives**: user-experience-advocate, performance-pathfinder
**Severity**: **HIGH**

**User Impact**: Power users logging sets rapidly (10-15s intervals) miss undo window. By the time they notice typo, toast is gone. **Frustrating data re-entry.**

**Industry Standard**: 5-7 seconds with hover-to-pause

**Fix**:

```typescript
const UNDO_TIMEOUT_MS = 6000; // 6 seconds (2x current, industry standard)

useEffect(() => {
  if (visible && !isPaused) {
    const timer = setTimeout(onDismiss, UNDO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }
}, [visible, isPaused, onDismiss]);

// Add hover/focus pause
<div
  onMouseEnter={() => setIsPaused(true)}
  onMouseLeave={() => setIsPaused(false)}
>
```

**Effort**: 1h
**Value**: **HIGH** - Prevents frustrating data re-entry, accessibility best practice

---

### 13. [UX] No Way to Edit Logged Sets - Must Delete and Re-Log

**Perspectives**: user-experience-advocate, product-visionary
**Severity**: **HIGH**

**Current UX**: User logs set with typo → Only option is delete and re-log → **Loses timestamp, frustrating flow.**

**User Impact**: Typos common on mobile numeric keyboard. Deleting to fix breaks flow during workout.

**Improved Experience**: Add "Edit" button next to "Delete":

- Click edit → fields become editable inline
- User corrects reps/weight
- Preserves original timestamp

**Implementation**:

1. Add `updateSet` mutation in `convex/sets.ts`
2. Add edit mode state to SetCard component
3. Inline editing UI (similar to exercise name editing pattern)

**Effort**: 3h
**Value**: **HIGH** - Fixes common frustration, reduces data loss

---

### 14. [Architecture] QuickLogForm Approaching God Object - 331 Lines, 9 Responsibilities

**File**: `src/components/dashboard/quick-log-form.tsx:1-332`
**Perspectives**: architecture-guardian, complexity-archaeologist
**Severity**: **MEDIUM-HIGH**

**Metrics**: 331 lines (threshold: >300 warning), 9 responsibilities:

1. Form state management
2. Data fetching (query allSets)
3. Last set calculation
4. Time formatting
5. Mutation execution
6. Focus orchestration (3 refs + RAF pattern)
7. Keyboard navigation
8. Inline exercise creator toggle
9. Imperative API (repeatSet via ref)

**Change Amplification Test**: "Add 'rest timer' feature - how many sections change?" → **4+ sections** (state, UI, focus flow, submission)

**Fix**: Extract hooks:

```typescript
// NEW: src/hooks/useSetForm.ts
function useSetForm(exercises) {
  // State + validation + submission logic
}

// NEW: src/hooks/useAutoFocus.ts
function useAutoFocus(selectedExerciseId) {
  // Focus orchestration with RAF pattern
}

// NEW: src/hooks/useLastSet.ts
function useLastSet(exerciseId) {
  // Query + formatting + "USE" button logic
}

// Simplified component (331 → 150 lines)
export function QuickLogForm({ exercises, onSetLogged }, ref) {
  const form = useSetForm(exercises);
  const focus = useAutoFocus(form.selectedExerciseId);
  const lastSet = useLastSet(form.selectedExerciseId);

  // Pure JSX, no logic
}
```

**Effort**: 5h (extract hooks + update tests)
**Impact**: **MEDIUM** - Easier testing, clearer responsibilities. **Only refactor when adding complex features** (multi-set entry, rest timers, plate calculator).

---

### 15. [Architecture] Missing Domain Service Layer - Tight Convex Coupling

**Files**: `quick-log-form.tsx:47`, `exercise-manager.tsx:35-36`, 6+ other components
**Perspectives**: architecture-guardian
**Severity**: **MEDIUM**
**Violations**: Dependency Inversion

**Issue**: 7+ components directly import Convex hooks (`useMutation(api.sets.logSet)`). No abstraction layer.

**Impact**:

- Cannot switch backend without editing 10+ components
- Cannot implement offline support (no interception point)
- Testing requires full Convex mock setup
- Coupling Score: 8/10 (very tight)

**Fix**: Introduce repository pattern:

```typescript
// NEW: src/data/repositories/exerciseRepository.ts
export function useExercises(includeDeleted?: boolean) {
  return useQuery(api.exercises.listExercises, { includeDeleted });
}

export function useCreateExercise() {
  const mutation = useMutation(api.exercises.createExercise);
  return async (name: string) => {
    try {
      return await mutation({ name });
    } catch (error) {
      handleMutationError(error, "Create Exercise");
      throw error;
    }
  };
}

// Components import from repository:
import {
  useExercises,
  useCreateExercise,
} from "@/data/repositories/exerciseRepository";
```

**Benefits**: Swap Convex by changing 2 files, centralized error handling, enables offline mode.

**Effort**: 6h (create repositories + update 7 components)
**Impact**: **MEDIUM-HIGH** - Decouples infrastructure, enables offline support, improves testability

---

## Technical Debt Worth Paying

_Refactorings and improvements that make future development easier and faster._

**Total Effort**: ~10h for all technical debt items

---

### 16. [Testing] Error Message Mapping Untested

**File**: `src/lib/error-handler.ts`
**Perspectives**: maintainability-maven
**Severity**: **MEDIUM**

**Issue**: `getUserFriendlyMessage()` maps technical errors to user-facing messages, but no tests verify mappings are correct.

**Risk**: Error message changes break UX, mapping logic could have bugs.

**Fix**:

```typescript
// NEW: src/lib/error-handler.test.ts
describe("getUserFriendlyMessage", () => {
  it("maps auth errors correctly");
  it("maps authorization errors");
  it("passes through validation errors");
  it("handles not found errors");
  it("provides generic fallback");
});
```

**Effort**: 1h
**Benefit**: **MEDIUM** - Prevent user-facing message bugs

---

### 17. [Code Quality] Module-Level Documentation Missing

**File**: `src/lib/dashboard-utils.ts`
**Perspectives**: maintainability-maven
**Severity**: **LOW**

**Issue**: 253-line file with 7 exported functions, no module overview.

**Fix**:

```typescript
/**
 * Dashboard Utilities
 *
 * Core calculation and formatting functions for workout dashboard.
 * Handles daily statistics, volume calculations, and data grouping.
 *
 * **Primary Functions**:
 * - calculateDailyStats: Aggregate today's workout totals
 * - calculateDailyStatsByExercise: Per-exercise breakdown
 *
 * **Utility Functions**:
 * - convertWeight: Convert between lbs and kg (1 kg = 2.20462 lbs)
 * - normalizeWeightUnit: Validate unit strings
 *
 * @module dashboard-utils
 */
```

**Effort**: 15m
**Benefit**: **MEDIUM** - Faster onboarding, clear module boundaries

---

### 18. [Code Quality] Hydration Mismatch Risk in WeightUnitContext

**File**: `src/contexts/WeightUnitContext.tsx:16-32`
**Perspectives**: complexity-archaeologist
**Severity**: **LOW**

**Issue**: Initializes state from localStorage during render (potential SSR mismatch).

**Fix**: Start with default, sync after hydration:

```typescript
const [unit, setUnit] = useState<WeightUnit>("lbs");
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  try {
    const stored = localStorage.getItem("weightUnit");
    if (stored === "kg" || stored === "lbs") setUnit(stored);
  } catch (error) {
    console.warn("Failed to read weight unit preference:", error);
  }
  setIsHydrated(true);
}, []);
```

**Effort**: 30m
**Benefit**: **LOW** - No hydration warnings

---

### 19. [Security] Audit Logging Missing for Security Events

**Files**: All mutation endpoints
**Perspectives**: security-sentinel
**Severity**: **MEDIUM**
**Category**: OWASP A09:2021 - Security Logging Failures

**Missing Logs**:

- Exercise deletion (no record of who deleted what)
- Set deletion (undo exists but no permanent audit)
- Authorization failures

**Impact**: Can't investigate security incidents, GDPR compliance risk.

**Fix**:

```typescript
// NEW: convex/lib/audit.ts
export async function auditLog(ctx, event) {
  await ctx.db.insert("audit_logs", {
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    userId: event.userId,
    timestamp: Date.now(),
    metadata: event.metadata,
  });
}

// Usage in mutations:
await auditLog(ctx, {
  action: "delete_exercise",
  resourceType: "exercise",
  resourceId: args.id,
  userId: identity.subject,
  metadata: { name: exercise.name },
});
```

**Effort**: 3h
**Risk**: **MEDIUM** - Forensics and compliance

---

### 20. [Maintainability] TypeScript `any` Type Usage

**File**: `src/components/dashboard/Dashboard.tsx:63`
**Perspectives**: maintainability-maven, architecture-guardian
**Severity**: **MEDIUM**

**Issue**: `any` type defeats TypeScript safety:

```typescript
const handleRepeatSet = (set: any) => {
  // ❌
  formRef.current?.repeatSet(set);
};
```

**Fix**:

```typescript
import { Set } from "@/types/domain";

const handleRepeatSet = (set: Set) => {
  // ✓
  formRef.current?.repeatSet(set);
};
```

**Effort**: 15m
**Benefit**: **HIGH** - Type safety prevents runtime errors

---

## Nice to Have

_Improvements that would be valuable but aren't urgent - optimizations, polish, quality-of-life._

---

### 20. [Tooling] Bundle Size Regression Tracking

**Perspectives**: performance-pathfinder
**Severity**: **LOW**
**Source**: Quality infrastructure audit (2025-10-12)

**Current State**: Bundle analyzer available via `@next/bundle-analyzer` but no automated regression detection.

**Missing**: Lighthouse CI or similar tool to fail builds if bundle size increases >10% without explanation.

**Value**: Prevents gradual bloat. Currently bundle size not tracked in CI, could grow 2x before noticed.

**Effort**: 2-3h (Lighthouse CI setup + GitHub Action)
**Priority**: **LOW** - No current performance issues, defer until bundle >1MB

---

### 21. [Tooling] Import Sorting Automation

**Perspectives**: maintainability-maven
**Severity**: **LOW**
**Source**: Quality infrastructure audit (2025-10-12)

**Current State**: No enforced import order. Over time, inconsistency accumulates (some files alphabetical, others grouped by type).

**Fix**: Add `eslint-plugin-simple-import-sort` to ESLint config, autofix on commit.

**Value**: Reduces diff noise, improves readability, prevents merge conflicts in import blocks.

**Effort**: 30 min (plugin install + config + one-time autofix across codebase)
**Priority**: **LOW** - Cosmetic, not blocking

---

### 22. [Tooling] Git Commit Message Linting

**Perspectives**: maintainability-maven
**Severity**: **LOW**
**Source**: Quality infrastructure audit (2025-10-12)

**Current State**: No commit message standards. Mix of "fix bug", "wip", "asdf", and proper conventional commits.

**Fix**: Add `@commitlint/cli` + `@commitlint/config-conventional` to husky pre-commit hook.

- Enforces format: `type(scope): subject` (e.g., `feat(exercises): add soft delete`)
- Types: feat, fix, docs, refactor, test, chore

**Value**: Clean git history, enables automated changelog generation, easier to scan `git log`.

**Effort**: 1h (install + configure + developer education)
**Priority**: **LOW** - Process improvement, not code quality

---

### 23. [Testing] Component Visual Regression Testing

**Perspectives**: user-experience-advocate
**Severity**: **LOW**
**Source**: Quality infrastructure audit (2025-10-12)

**Current State**: No screenshot diffing. UI changes could break visual design without detection.

**Tools**: Chromatic (commercial, integrates with Storybook) or Percy (free tier available).

**Value**: Catches unintended CSS changes, cross-browser rendering bugs, dark mode issues.

**Effort**: 4-6h (Storybook setup + story files + Chromatic integration)
**Priority**: **LOW** - MVP has stable UI, defer until frequent regressions occur

---

### 24. [Tooling] Pre-Commit TypeCheck (Trade-off)

**Perspectives**: maintainability-maven, user-experience-advocate
**Severity**: **LOW**
**Source**: Quality infrastructure audit (2025-10-12)

**Current State**: `lint-staged` runs ESLint only. TypeScript checked in CI but not pre-commit.

**Trade-off**:

- ✅ **Pro**: Catches type errors before push (faster feedback loop)
- ❌ **Con**: Slows commits by 2-3 seconds (tsc --noEmit takes time)

**Current Decision**: Skip for now. TypeScript in CI is sufficient, developer flow more important than marginal type safety gain.

**Reconsider If**: Type errors frequently merge and break main branch (hasn't happened yet).

**Effort**: 5 min (add to lint-staged config)
**Priority**: **LOW** - Deferred by design

---

### 21. [Accessibility] Add Visual Focus Indicator for Keyboard Navigation

**File**: `src/components/ui/terminal-panel.tsx:85`
**Perspectives**: user-experience-advocate
**Severity**: **LOW**
**Violations**: WCAG 2.4.7 (Focus Visible)
**Source**: PR #10 review feedback

**Current State**: Keyboard users can tab to collapsible panels but there's no explicit focus styling. When focused via keyboard, panel header should have visible focus ring.

**Fix**: Add focus-visible styles:

```css
/* Add to terminal-panel header div */
focus-visible:ring-2 focus-visible:ring-terminal-info focus-visible:ring-offset-2
```

**Effort**: 15m + cross-browser testing
**Priority**: **LOW** - Functional keyboard nav exists, this is visual polish

---

### 22. [Code Quality] ARIA Controls Mismatch When storageKey Undefined

**File**: `src/components/ui/terminal-panel.tsx:97,113`
**Perspectives**: user-experience-advocate
**Severity**: **LOW**
**Source**: PR #10 review feedback

**Current State**: When `collapsible=true` but `storageKey` undefined, `aria-controls` and `id` are both undefined, breaking ARIA relationship.

**Fix**: Generate fallback ID or require storageKey when collapsible:

```typescript
const panelId = storageKey || `panel-${useId()}`;
```

**Impact**: Edge case - all current usage provides storageKey

**Effort**: 30m
**Priority**: **LOW** - No real-world occurrence

---

### 23. [Security] Conditionally Apply HSTS Only in Production

**File**: `next.config.ts:32`
**Perspectives**: security-sentinel
**Severity**: **VERY LOW**
**Source**: PR #10 review feedback

**Current State**: HSTS header returned for all paths including localhost. Could theoretically break local dev by forcing HTTPS.

**Fix**:

```typescript
headers: [
  process.env.NODE_ENV === "production" && {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
].filter(Boolean),
```

**Impact**: Haven't experienced issues - browsers generally ignore HSTS on localhost

**Effort**: 10m
**Priority**: **VERY LOW** - Theoretical concern

---

### 24. [Performance] Extract CSP String to Constant (Micro-Optimization)

**File**: `next.config.ts:37-45`
**Perspectives**: performance-pathfinder
**Severity**: **VERY LOW**
**Source**: PR #10 review feedback

**Current State**: CSP string concatenation happens on every request (~100 bytes overhead per response).

**Fix**:

```typescript
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // ...
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      { headers: [{ key: "Content-Security-Policy", value: CSP_DIRECTIVES }] },
    ];
  },
};
```

**Impact**: Negligible - no measured performance issue

**Effort**: 5m
**Priority**: **VERY LOW** - Premature optimization

---

### 25. [UX] No Search/Filter for Exercises

**Perspectives**: user-experience-advocate, product-visionary
**Severity**: **MEDIUM**

**Current UX**: User with 50+ exercises must scroll through entire dropdown.

**Improved Experience**: Add search input above exercise selector (filters in real-time).

**Effort**: 2h
**Value**: **MEDIUM** - Quality of life for power users

---

### 26. [Mobile UX] Swipe Gestures for Quick Actions

**Perspectives**: user-experience-advocate, product-visionary
**Severity**: **LOW**
**Source**: Mobile UX enhancement brainstorm (2025-10-26)

**Current UX**: Delete/repeat actions require tapping small buttons on set cards.

**Enhanced Experience**:

- Swipe left on set card → reveal delete button (iOS Mail pattern)
- Swipe right on set card → quick repeat (log same set again)
- Haptic feedback on swipe threshold

**Implementation**:

- Library: `react-swipeable` or `framer-motion` drag gestures
- Add swipe handlers to SetCard component
- Animate reveal of action buttons on swipe
- Threshold detection (swipe must exceed 50% card width)

**Trade-offs**:

- ✅ Faster actions for mobile power users
- ✅ Reduces screen clutter (hide buttons until swipe)
- ❌ Adds gesture complexity (accidental swipes)
- ❌ Not discoverable (users may not find feature)

**Effort**: 4h (gesture detection + animation + testing)
**Priority**: **LOW** - Defer until user feedback requests it

---

### 27. [Mobile UX] Pull-to-Refresh on History Page

**Perspectives**: user-experience-advocate, product-visionary
**Severity**: **LOW**
**Source**: Mobile UX enhancement brainstorm (2025-10-26)

**Current UX**: History page refreshes automatically via Convex real-time, but no manual refresh option.

**Enhanced Experience**:

- Pull down on history page → spinner animation → refetch data
- Native mobile app pattern (familiar to users)
- Useful if user suspects stale data

**Implementation**:

- Library: `react-pull-to-refresh` or custom touch event handlers
- Add pull gesture detection to history page container
- Trigger Convex query refresh on pull complete
- Show loading spinner during refresh

**Trade-offs**:

- ✅ Familiar mobile pattern (feels native)
- ✅ User control over refresh (even though auto-refresh exists)
- ❌ Not needed if real-time sync works (already have this)
- ❌ Adds library dependency

**Effort**: 2h (library integration + testing)
**Priority**: **VERY LOW** - Convex real-time sync makes this redundant

---

### 28. [Mobile UX] Haptic Feedback for Actions

**Perspectives**: user-experience-advocate, product-visionary
**Severity**: **LOW**
**Source**: Mobile UX enhancement brainstorm (2025-10-26)

**Current UX**: Visual-only feedback on button press (scale/opacity).

**Enhanced Experience**:

- Light haptic on button press (success actions)
- Heavy haptic on destructive actions (delete)
- Celebration haptic pattern on PR achievement (triple pulse)

**Implementation**:

- Use Vibration API: `navigator.vibrate([duration])`
- Add to button onClick handlers
- Pattern library: light (20ms), medium (40ms), heavy (60ms), celebration ([20, 50, 20, 100])

**Trade-offs**:

- ✅ Native app feel (tactile feedback)
- ✅ Accessibility benefit (non-visual confirmation)
- ❌ Not all devices support vibration
- ❌ Users may find it annoying (need settings toggle)
- ❌ Battery drain on excessive use

**Effort**: 1h (API integration + pattern design)
**Priority**: **LOW** - Polish feature, not core value

**Recommendation**: Only implement if building "settings" page with haptic toggle

---

### 29. [Performance] Core Web Vitals Monitoring

**Perspectives**: performance-pathfinder, user-experience-advocate
**Severity**: **LOW**
**Source**: Mobile UX enhancement brainstorm (2025-10-26)

**Current State**: No performance monitoring in production. Don't know if users experience lag/jank.

**Monitoring Goals**:

- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1
- INP (Interaction to Next Paint) < 200ms

**Implementation Options**:

1. **Vercel Analytics** (built-in, free tier)
   - Automatic CWV tracking
   - Real user metrics (RUM)
   - Minimal setup (enable in vercel.json)
2. **web-vitals library** (custom implementation)
   - Install: `pnpm add web-vitals`
   - Send metrics to custom backend/log aggregator
   - Full control over data

**Integration**:

```typescript
// src/app/layout.tsx
import { onCLS, onFID, onLCP } from "web-vitals";

onCLS(console.log);
onFID(console.log);
onLCP(console.log);
```

**Trade-offs**:

- ✅ Data-driven performance optimization (know what to fix)
- ✅ Catch regressions before users complain
- ❌ Adds client-side JavaScript (ironic performance cost)
- ❌ Requires analytics infrastructure

**Effort**: 1-2h (Vercel Analytics) or 4h (custom web-vitals)
**Priority**: **LOW** - Defer until production traffic exists

**Decision Point**: Implement when daily active users > 100

---

### 22. [Performance] Missing React.memo on Table Rows

**File**: `src/components/dashboard/grouped-set-history.tsx:106-162`
**Perspectives**: performance-pathfinder
**Severity**: **LOW**

**User Impact**:

- Currently: Imperceptible
- At 500+ sets: 10-20ms re-render delay
- At 1000+ sets: 50ms+ visible lag

**Optimization**: Extract row builder to memoized component.

**Effort**: 1-2h
**Priority**: **LOW** - Future-proofing, only if metrics show need

---

### 23. [Performance] Missing Pagination on Sets Query

**File**: `convex/sets.ts:79-85`
**Perspectives**: performance-pathfinder
**Severity**: **LOW**

**Issue**: `.collect()` fetches all user sets without limit.

**User Impact**:

- Currently (MVP users, <100 sets): Non-issue ✓
- At 10,000 sets: ~500KB payload, **500ms+ query time** ❌

**Note**: History page already uses pagination (`listSetsPaginated`), but Dashboard uses unpaginated `listSets`.

**Optimization**: Add `take(100)` limit or use pagination when users accumulate 1000+ sets.

**Effort**: 15m (add limit) → 4-6h (full pagination)
**Priority**: **LOW** - Defer until user data grows

---

### 23.5. [Performance] Note: Repeated Sorting in exercise-grouping

**File**: `src/lib/exercise-grouping.ts:63-66`
**Source**: PR #20 review feedback (Claude AI, 2025-10-29)
**Priority**: **VERY LOW** - No action needed
**Effort**: 1-2 hours if ever needed

**Current Implementation**: Sorts sets within each exercise group (O(n log n) per group).

**Performance**: For typical workout volumes (<100 sets), this is imperceptible. Modern JavaScript sorting is highly optimized.

**Benchmark Need**: Only optimize if performance profiling shows >50ms spent in this function.

**Potential Optimization** (if ever needed): Maintain pre-sorted order during grouping loop to eliminate the separate sorting step.

**Decision**: No change required. This is a note for future reference only.

---

### 24. [Code Quality] Hardcoded Colors in UndoToast

**File**: `src/components/dashboard/undo-toast.tsx:27-30`
**Perspectives**: maintainability-maven
**Severity**: **LOW**

**Current**: `<CornerBracket color="#00ff00" />`
**Fix**: `<CornerBracket color="var(--terminal-success)" />`

**Effort**: 5m
**Benefit**: **LOW** - Respects theme changes

---

## Post-MVP Features

_Feature roadmap organized by strategic value and user impact._

---

### Phase 1: NOW (0-3 months) - Critical for Adoption

**Total Effort**: 18 days | **Impact**: 3-5x user retention, removes major adoption blockers

#### Personal Records (PRs) Tracking - **CRITICAL ADOPTION BLOCKER**

**Effort**: 3 days | **Value**: **HIGH** - Core motivation mechanic
**Perspectives**: product-visionary, user-experience-advocate

**Current**: No PR detection or celebration
**Competitive Gap**: **CRITICAL** - 100% of competitors have this (Strong, Hevy, FitNotes)

**Unlock Value**:

- PR celebration → immediate satisfaction → daily engagement
- "New PR!" badge with confetti → shareable moment
- PR timeline → long-term progress visualization
- Max weight/reps cards → profile bragging rights

**Implementation**:

```typescript
// convex/prs.ts (NEW)
export const checkForPR = query({
  handler: async (ctx, { exerciseId, userId }) => {
    const allSets = await ctx.db
      .query("sets")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", exerciseId))
      .collect();

    return {
      maxWeight: Math.max(...allSets.map((s) => s.weight || 0)),
      maxReps: Math.max(...allSets.map((s) => s.reps)),
      maxVolume: Math.max(...allSets.map((s) => (s.weight || 0) * s.reps)),
    };
  },
});

// On set log: compare against history, show celebration if PR
```

**Adoption Impact**: Removes major blocker - "Can I track PRs?" is top user question
**Retention Impact**: 2-3x - Users return to beat records (gamification)

---

#### Offline-First Architecture - **DEAL BREAKER FOR GYM USAGE**

**Effort**: 5 days | **Value**: **HIGH** - Enables gym usage
**Perspectives**: product-visionary, user-experience-advocate

**Current**: Web-only, requires internet connection
**Impact**: Gym basement dead zones (common problem) → **30-40% of users bounce**

**Use Cases Unlocked**:

- Log sets in gym basement (no signal)
- Airplane workouts (travelers)
- Instant response (no network latency)

**Implementation**:

- Add Dexie.js for IndexedDB
- Service Worker for asset caching
- Background sync queue (push to Convex when online)
- Optimistic UI updates (write-local, sync-later)

**User Flow**:

1. Log set → saves to IndexedDB immediately → UI updates
2. Background: Queue sync job
3. When online: Sync queue to Convex
4. Handle conflicts (last-write-wins)

**ROI**: **HIGH** - Enables primary use case (gym usage)
**Market Opportunity**: 40-50% of gym-goers report connectivity issues

---

#### Progress Charts & Analytics - **VISUAL MOTIVATION**

**Effort**: 4 days | **Value**: **HIGH** - "Am I progressing?"
**Perspectives**: product-visionary, user-experience-advocate

**Current**: Text tables only - no charts, no trends
**Missing**:

- Progress charts (line chart: reps/volume over time per exercise)
- Weekly/monthly summary views
- Volume heatmap (GitHub-style contribution graph)
- Streak tracking (consecutive workout days)

**Implementation**:

```typescript
// NEW: app/analytics/page.tsx
// Use Recharts library
- Line chart: Exercise performance over time (reps, weight, volume)
- Bar chart: Weekly volume by muscle group
- Heatmap: Workout frequency calendar
- Stats cards: Total volume, workout count, streak
```

**Market Validation**: 85%+ of fitness apps have charts
**Differentiation**: Terminal aesthetic charts (ASCII art hybrid?) could be unique

---

#### Routine Templates - **LOWERS BARRIER TO ENTRY**

**Effort**: 6 days | **Value**: **HIGH** - Structures workouts
**Perspectives**: product-visionary

**Current**: Users manually select exercises every session
**Competitors**: Strong (pre-built routines), Hevy (10,000+ community programs)

**Impact**:

- New users overwhelmed ("What should I do today?")
- Advanced users waste time recreating same workout
- No structure → inconsistent training → poor results

**Implementation**:

```typescript
// convex/schema.ts (NEW)
routines: defineTable({
  userId: v.string(),
  name: v.string(), // "Push Day A", "Legs", "5x5 Workout"
  exercises: v.array(v.object({
    exerciseId: v.id("exercises"),
    targetSets: v.number(),
    targetReps: v.number(),
    restSeconds: v.optional(v.number()),
  })),
  isPublic: v.boolean(), // For community sharing
}),

// UI: Start Workout → Select Routine → Guide through exercises
```

**Adoption Impact**: Lowers barrier (beginner-friendly)
**Retention Impact**: Structured programs = better results = retained users

---

### Phase 2: NEXT (3-6 months) - Differentiation & Monetization

**Total Effort**: 23 days | **Impact**: Revenue stream, unique brand identity

#### Premium Tier Launch

**Effort**: 8 days | **Value**: **HIGH** - Creates revenue stream

**Free Tier**:

- Unlimited exercises and sets
- 30-day history
- Basic stats (today's totals)

**Pro Tier ($5/mo or $50/yr)**:

- Unlimited history
- Progress charts (Recharts)
- PR tracking with timeline
- Data export (CSV/JSON)
- Routine templates (100+)
- Rest timer

**Expected Revenue** (1000 users):

- Pro: 100 users × $50/yr = $5,000/yr
- **Total**: $5,000/yr ARR (realistic MVP goal)

---

#### Command Palette + Keyboard Shortcuts - **UNIQUE DIFFERENTIATOR**

**Effort**: 3 days | **Value**: **MEDIUM-HIGH**
**Positioning**: "The developer's workout tracker"

**Features**:

- Command palette (cmd+k): "log set", "create exercise", "view stats"
- Keyboard shortcuts (j/k nav, enter to submit)
- Terminal aesthetic consistency

**Market Position**: No competitor has command-palette or keyboard-first interface
**Target Segment**: Tech-savvy fitness enthusiasts (GitHub/CLI users)
**Viral Potential**: High - tech Twitter loves terminal UIs

---

#### Rest Timer + Progressive Overload

**Effort**: 2 days | **Value**: **MEDIUM-HIGH**

**Features**:

- Auto-start timer after logging set
- Notification when rest complete
- Customizable per exercise
- Progressive overload suggestions ("Last time: 5x5, Try: 5x6")

**User Segment**: 70% of intermediate+ lifters use rest timers
**Competitive Gap**: Strong and Hevy both have rest timers

---

#### Routine Marketplace

**Effort**: 10 days | **Value**: **HIGH** - Network effects

**Features**:

- Browse by goal (strength, hypertrophy, endurance)
- Rating system (5 stars)
- Creator revenue share (70%)
- Import with one click

**Market Validation**: Hevy's routine library drives 40% of signups
**Network Effects**: More routines → more users → more routines

---

### Phase 3: LATER (6-12 months) - Platform & Ecosystem

**Total Effort**: 35 days

#### Coach/Client Sharing (B2B Opportunity)

**Effort**: 15 days | **Value**: **HIGH** - Opens B2B market

**Features**:

- Coaches assign routines to clients
- Clients log workouts → coach sees progress
- Messaging/feedback within app
- Team leaderboards

**Market Segment**: 20% of users are coaches/trainers
**Deal Size**: Teams pay 3-5x ($15-30/month per coach)
**ARR Impact**: $150-360/year per coach

---

#### Public API

**Effort**: 12 days | **Value**: **MEDIUM** - Platform enablement

**Features**:

- REST API for workout data
- Webhooks for integrations (Zapier, IFTTT)
- OAuth for third-party apps

**Enterprise Impact**: Required for 80% of enterprise deals

---

#### Health Platform Integrations

**Effort**: 8 days | **Value**: **MEDIUM**

**Features**:

- Apple Health / Google Fit integration
- Smartwatch complications (Apple Watch, Garmin)
- Heart rate monitoring during workouts

**Enterprise Impact**: Required for 60% of iOS users

---

### Phase 4: FUTURE (12+ months) - Innovation & Vertical Expansion

#### AI Workout Coaching

**Effort**: 20 days | **Value**: **MEDIUM** - Future-proofing

**Features**:

- Natural language logging ("bench press 3x8 at 185")
- Personalized program generation
- Form analysis (ambitious)

**Competitive Advantage**: No major competitor has AI coaching yet

---

#### Social Features

**Effort**: 12 days | **Value**: **MEDIUM-HIGH** - Growth driver

**Features**:

- Follow friends → see their PRs
- Leaderboards (gym, global, by exercise)
- Challenges ("100 pushups in 30 days")

**Viral Coefficient**: 1.5-2.0 (each user brings 1-2 friends)

---

#### Vertical Specialization

**Effort**: 10-12 days per vertical | **Value**: **MEDIUM**

**Powerlifting**: Wilks calculator, meet prep, attempt selection
**CrossFit**: WOD templates, benchmark tracking, leaderboards
**Bodybuilding**: Aesthetics tracking, posing, body measurements

**Market Sizing**:

- Powerlifting: 500K serious lifters in US
- CrossFit: 6M participants globally

---

## Completed & Archived

### ✅ Recently Completed (PR #8 - 2025-10-09)

**3 CRITICAL ISSUES FIXED**:

1. **IDOR vulnerability** → Ownership checks added to all mutations
2. **Type duplication** → Centralized to src/types/domain.ts (5 files → 1)
3. **O(n²) exercise lookups** → O(1) Map-based lookups (17-100x speedup)

**Implementation Details**:

- Soft delete architecture (prevents orphaned sets)
- `requireOwnership` helper (prevents unauthorized access)
- `exerciseMap` with useMemo (O(1) lookups)
- Domain types centralized (single source of truth)

**Actual Effort**: 25 minutes (faster than 1.5h estimate)
**Impact**: **HIGH** - Data integrity, security, performance

---

### ✅ Previously Completed (Last Month)

- **Landing page** (PR #6) - Terminal aesthetic hero
- **Vitest infrastructure** (PR #5) - Unit test setup
- **Enhanced input validation** (PR #4) - Integer reps, weight rounding
- **Sonner toast notifications** (PR #4) - Replaced most alert() calls
- **Centralized error handler** (PR #4) - handleMutationError utility
- **Weight unit system** (PR #3) - kg/lbs toggle
- **Mobile UX polish** (PR #3) - Responsive design, touch targets
- **Pre-commit hooks** - ESLint on commit
- **SSR hydration fixes** - Resolved theme issues
- **Undo toast** - Delete confirmation with undo

---

### Deferred (Valid Suggestions for Future)

- Make "USE" button more prominent in last set display
- Add global weight unit toggle to nav/settings
- Add visual hint for Enter key functionality
- Add TypeCheck to lint-staged (may slow commits)
- JSDoc comments for all exported functions

---

### Archived (Not Pursuing)

- Native app features - PWA sufficient for now
- Social features - Not v1 scope (moved to Phase 4)
- Advanced AI insights - Unclear value proposition

---

## Decision Framework

### Prioritization Criteria

1. **Security**: Vulnerabilities blocking production deployment
2. **Accessibility**: WCAG compliance, legal requirements
3. **User Value**: Solves real user problems, prevents data loss
4. **Product-Market Fit**: Features that drive adoption and retention
5. **Developer Velocity**: Makes future development faster
6. **Data Integrity**: Protects user data quality
7. **Risk**: Likelihood of failure/scope creep

### When to Implement

- **Immediate Concerns**: Before production (security, accessibility, critical UX)
- **High-Value Improvements**: Next 1-2 sprints (architecture, testing, performance)
- **Technical Debt**: When slowing down development or before major refactor
- **Nice to Have**: When metrics show need or user feedback
- **Post-MVP Features**: After gathering real user feedback

---

## Summary Statistics

**Total Issues Identified**: 89 findings from 7-perspective parallel audit

**By Priority**:

- **CRITICAL**: 2 remaining (rate limiting, security headers) + 2 accessibility (ARIA, keyboard)
- **HIGH**: 11 (architecture, testing, performance, critical UX)
- **MEDIUM**: 12 (technical debt, code quality, testing)
- **LOW**: 6 (polish, future-proofing)

**Cross-Validated Issues** (flagged by 3+ agents):

- Time formatting duplication (complexity + maintainability + architecture)
- Dashboard component complexity (architecture + complexity + maintainability)
- Untested business logic (maintainability + complexity)

**Recently Completed (PR #8 - 2025-10-09)**: ✅ **3 CRITICAL ISSUES FIXED**

- ✅ IDOR vulnerability → Ownership checks
- ✅ Type duplication → Centralized types
- ✅ O(n²) lookups → O(1) Map-based (17-100x faster)

**Estimated Effort to Address All Critical/High**:

- **Immediate Concerns**: 7h (security + accessibility)
- **High-Value Improvements**: 28h (architecture + testing + performance + UX)
- **Technical Debt**: 10h (testing + code quality)
- **Total**: ~45 hours of focused work

**Top 5 Quick Wins** (High Value, < 1 hour):

1. Replace alert() with handleMutationError (15m) - Professional UX
2. Optimize last set query (15m) - 40x speedup at scale
3. Document magic numbers (10m) - Self-documenting code
4. Fix TypeScript `any` usage (15m) - Type safety
5. Add ARIA live regions (30m) - Accessibility compliance

**Codebase Health Grade**: **B+ (Very Good for MVP)**

**Strengths**:

- Deep backend modules with excellent encapsulation
- Clean separation between Convex/frontend
- Strategic soft-delete pattern shows design maturity
- No god objects (yet)
- Recent PR #8 demonstrates proactive security mindset

**Weaknesses**:

- Tactical duplication in time formatting, weight display (change amplification risk)
- 253 lines untested business logic (dashboard-utils.ts)
- Missing rate limiting (DoS/cost exploitation risk)
- No security headers (defense in depth gap)

---

## Strategic Recommendations

### 1. Security First (Week 1)

**Immediate** (7h):

1. Implement rate limiting (3h) - Prevents DoS/cost exploitation
2. Add security headers (2h) - Defense in depth
3. Guard console logging (1h) - Prevent info disclosure
4. Replace alert() dialogs (15m) - Professional UX
5. Add ARIA live regions (30m) - Accessibility compliance
6. Add keyboard navigation (1h) - WCAG compliance

**Impact**: Production-ready security posture, accessibility compliance

---

### 2. Quality Foundation (Week 2)

**Critical** (8h):

1. Extract time formatting utility (1h) - Eliminates 3 duplications
2. Add dashboard-utils tests (4h) - 253 lines coverage
3. Split dashboard-utils module (3h) - Domain boundaries

**Impact**: Single source of truth, confident refactoring, clear architecture

---

### 3. Product Features (Months 1-3)

**Core Value** (18 days):

1. PR tracking (3d) - Core motivation mechanic
2. Offline support (5d) - Gym usage enabler
3. Progress charts (4d) - Visual motivation
4. Routine templates (6d) - Lowers barrier to entry

**Impact**: 3-5x user retention, removes major adoption blockers

---

### 4. Monetization (Months 3-6)

**Revenue Stream** (23 days):

1. Premium tier (8d) - $5/mo or $50/yr
2. Command palette (3d) - Unique differentiator
3. Rest timer (2d) - Competitive parity
4. Routine marketplace (10d) - Network effects

**Impact**: $5-10K ARR with 1000 users

---

## Feature Sequencing (What Unlocks What)

```
Foundation (NOW):
PR Tracking → Creates motivation loop
Offline Support → Enables gym usage
Charts → Visualizes progress
Routines → Structures workouts
    ↓
Monetization (NEXT):
Premium Tier → Requires charts + PRs + export
Marketplace → Requires routine system
Command Palette → Enhances power user experience
    ↓
Platform (LATER):
API → Requires stable data model
Coaching → Requires sharing infrastructure
Health Integrations → Requires solid core features
    ↓
Innovation (FUTURE):
AI Features → Requires large dataset
Social → Requires critical user mass
Verticals → Requires proven product-market fit
```

---

## Competitive Positioning

**Strong** (market leader): Comprehensive, mature, expensive ($30/yr)
→ **Volume Advantage**: Terminal aesthetic, developer appeal, lower price

**Hevy** (social-first): Community routines, friend following
→ **Volume Advantage**: Privacy-focused, no social pressure, simpler UX

**FitNotes** (power users): Spreadsheet-like, data export, offline
→ **Volume Advantage**: Modern stack (real-time), better mobile UX, API future

**Positioning Statement**: _"The developer's workout tracker - offline-first, keyboard-driven, privacy-focused, with powerful analytics. No social bloat, just data."_

---

**Remember**: The best feature is the one users actually need, not the one that's technically impressive.

_This backlog is a living document. Update priorities based on real-world usage, user feedback, and measured impact._

**Last Groomed**: 2025-10-31 - Analytics dashboard redesign planning
**Next Groom**: After analytics dashboard ships (PR merge)
