# BACKLOG: Volume Workout Tracker

Last groomed: 2025-11-04
Analyzed by: 8 specialized perspectives

---

## Now (Sprint-Ready, <2 weeks)

### [Performance] Stream dashboard data instead of loading entire history

**File**: src/components/dashboard/Dashboard.tsx:35; convex/sets.ts:31
**Perspectives**: performance-pathfinder, user-experience-advocate, complexity-archaeologist
**Impact**: `useQuery(api.sets.listSets, {})` materializes every historical set on each render, then filters client-side (O(n) each render). Users with 10k sets download >2 MB and see multi-second hydration delays.
**Fix**: Add a Convex query (e.g., `listSetsForDay`) that filters by index on the server and exposes pagination cursors; update the dashboard to consume the paginated feed and keep a memoized exercise cache.
**Effort**: 6h | **Risk**: MEDIUM
**Acceptance**: Dashboard loads under 400 ms with a 10k-set fixture; network payload <200 KB; Vitest/Playwright smoke verifies undo + repeat flows.

### [Security] Rate-limit OpenAI muscle classification

**File**: convex/exercises.ts:22; convex/ai/openai.ts:328
**Perspectives**: security-sentinel, performance-pathfinder, product-visionary
**Impact**: Authenticated users can script thousands of `createExercise` calls; each hits OpenAI, burning tokens and risking account suspension (cost-based DoS).
**Fix**: Track per-user exercise creations (e.g., lightweight counter table) and enforce a daily quota before invoking `classifyExercise`; add friendly error messaging via `handleMutationError` and consider job queueing for bulk imports.
**Effort**: 4h | **Risk**: HIGH
**Acceptance**: Automated test proves requests beyond the quota fail with a clear message; OpenAI mock confirms we short-circuit before API when the limit is exceeded.

---

## Next (This Quarter, <3 months)

### [Architecture] Decompose AI report pipeline into layered modules

**Scope**: Refactor `convex/ai/reports.ts` (1,060 LOC across 17 exports) into focused files.
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven, performance-pathfinder
**Why**: Current god module mixes rate limiting, cron orchestration, analytics munging, logging, and persistence; every touch amplifies risk and slows reviews.
**Approach**: Introduce `metrics-collector`, `report-generator`, and `delivery-cron` modules with narrow interfaces; keep internal API thin; back with integration contract tests.
**Effort**: 2d | **Impact**: Unlocks parallel work, reduces diff churn, and positions us for alternative AI providers.

### [Performance] Reduce redundant analytics scans

**Scope**: `convex/ai/reports.ts:76`, `convex/analytics.ts:315`
**Perspectives**: performance-pathfinder, maintainability-maven
**Why**: Three full-table scans per report plus whole-history PR detection (>3× duplication) will thrash Convex as data grows.
**Approach**: Build shared materialized aggregates (per-day totals, cached PR map), reuse across analytics + AI, and add indexed range queries with performance benchmarks.
**Effort**: 1.5d | **Impact**: Cuts report generation time by ~60% and lowers Convex compute.

### [Product] Ship on-demand AI report trigger with usage feedback

**Scope**: Wire up `api.ai.reports.generateOnDemandReport` in UI.
**Perspectives**: product-visionary, user-experience-advocate, security-sentinel
**Why**: Users currently wait for cron runs; we miss a retention hook and premium upsell opportunity even though the backend already enforces quotas.
**Approach**: Add CTA inside `ReportNavigator`, display quota meter, reuse toast/celebration patterns, and ensure errors flow through `handleMutationError`.
**Effort**: 1d | **Impact**: Increases engagement and justifies future premium tier.

### [Design System] Extract tab + badge primitives

**Scope**: `src/components/analytics/report-navigator.tsx:74`, `src/components/analytics/ai-insights-card.tsx:95`
**Perspectives**: design-systems-architect, maintainability-maven
**Why**: Hard-coded `text-purple-600`/`text-blue-500` classes bypass tokens and duplicate the tab pattern, making future theming brittle.
**Approach**: Introduce shared `Tabs` and `Badge` components backed by Tailwind tokens (`--primary`, `--info`), document usage, and migrate analytics surfaces.
**Effort**: 0.5d | **Impact**: Consistent theming and faster future feature delivery.

---

## Soon (Exploring, 3-6 months)

- **[Product] Routine templates & scheduling** – reuse Convex actions so new users can pre-build workouts; critical onboarding unlock.
- **[UX] Offline-first quick log** – Service Worker cache + optimistic queue so gym logging succeeds without cell service.
- **[UX] Distinguish loading vs empty state for AI reports** – show skeleton while `getReportHistory` loads to prevent the misleading “No reports yet” flash.
- **[Architecture] Domain service for PR detection** – move shared logic out of hooks into a pure module for reuse and deterministic tests.
- **[Performance] Snapshot weekly metrics** – background job persists aggregates, keeping historical charts fast.

---

## Later (Someday/Maybe, 6+ months)

- **[Platform] Native mobile companion**
- **[Integration] Apple Health / Google Fit sync**
- **[Innovation] AI coach co-pilot program builder**

---

## Learnings

- The AI reporting seam spans performance, reliability, and UX; future changes need cross-functional review to avoid regressions.
- Client dashboards must stay server-driven—pulling full tables erases Convex’s real-time advantages as soon as volume grows.
- Debug tooling must be gated; leaving console leaks behind becomes a security liability once analytics surfaces ship.
