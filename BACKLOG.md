# BACKLOG: Volume Workout Tracker

Last groomed: 2025-11-18
Analyzed by: 8 specialized perspectives (complexity-archaeologist, architecture-guardian, security-sentinel, performance-pathfinder, maintainability-maven, user-experience-advocate, product-visionary, design-systems-architect)

---

## Now (Sprint-Ready, <2 weeks)

### [Performance] Fix O(n) lookups in analytics queries

**Files**: convex/analyticsFocus.ts:113, convex/analyticsRecovery.ts:161
**Perspectives**: performance-pathfinder, complexity-archaeologist
**Impact**: `exercises.find()` in loop creates O(n×m) complexity. With 1000+ sets, adds 200-500ms latency to Focus Suggestions and Recovery Dashboard.
**Fix**: Build `Map<Id, Exercise>` before loop, use `exerciseById.get(set.exerciseId)`.
**Effort**: 30m | **Speedup**: 5-10x for large datasets
**Acceptance**: Analytics widgets load <100ms with 1000-set fixture.

### [Performance] Add listSetsForToday query

**File**: convex/sets.ts (new query), src/components/dashboard/Dashboard.tsx:35
**Perspectives**: performance-pathfinder, user-experience-advocate
**Impact**: Dashboard fetches ALL historical sets (500KB-5MB) then filters client-side for today. Users with 1000+ sets see multi-second load.
**Fix**: Add `listSetsForToday` query with date range filter at DB level using `by_user_performed` index.
**Effort**: 30m | **Speedup**: 10-50x payload reduction
**Acceptance**: Dashboard network payload <50KB; loads <400ms with 10k-set fixture.

### [Architecture] Consolidate PR detection to single source

**Files**: src/lib/pr-detection.ts:45-140, convex/lib/pr_detection.ts:33-128
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven
**Impact**: ~95 lines of identical PR detection algorithm duplicated. Changes require editing both files, risk of divergence.
**Fix**: Keep only backend version; client calls API for PR checks. Or extract to shared package.
**Effort**: 2h | **Impact**: HIGH
**Acceptance**: Single source of truth; grep finds checkForPR in one location only.

### [Architecture] Consolidate streak calculation

**Files**: src/lib/streak-calculator.ts:42-91, convex/lib/streak_calculator.ts:27-75
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven
**Impact**: ~50 lines duplicated with potential timezone discrepancy (backend notes UTC limitation).
**Fix**: Keep backend-only calculation; client queries for streak data instead of recalculating.
**Effort**: 1.5h | **Impact**: HIGH
**Acceptance**: Single streak calculation source; frontend imports from backend or queries.

### [Architecture] Consolidate muscle group constants

**Files**: convex/analyticsRecovery.ts:100-111,138-149, convex/analyticsFocus.ts:209-220
**Perspectives**: complexity-archaeologist, maintainability-maven
**Impact**: `allGroups` array appears 3x. Adding new muscle group requires 3+ file edits.
**Fix**: Export `ALL_MUSCLE_GROUPS` from `convex/lib/constants.ts`, import everywhere.
**Effort**: 30m | **Impact**: MEDIUM
**Acceptance**: grep finds allGroups defined once, imported elsewhere.

### [Design System] Fix SetCard brutalist styling

**File**: src/components/dashboard/set-card.tsx:59-65
**Perspectives**: design-systems-architect, user-experience-advocate
**Impact**: Core user-facing component uses generic Tailwind (rounded-lg, gray-500) instead of brutalist design system. Visual inconsistency in workout logging flow.
**Fix**: Replace with brutalist tokens: `bg-background`, `border-3 border-concrete-black`, sharp corners, semantic colors.
**Effort**: 1h | **Impact**: HIGH
**Acceptance**: SetCard visually matches other brutalist components.

### [Design System] Centralize formatDuration utility

**Files**: src/components/dashboard/set-card.tsx:37, exercise-set-group.tsx:49, quick-log-form.tsx:192, chronological-set-history.tsx:60
**Perspectives**: design-systems-architect, maintainability-maven
**Impact**: Same `formatDuration(seconds)` function copied 4+ times. DRY violation, risk of inconsistent formatting.
**Fix**: Add to `src/lib/date-utils.ts`, import everywhere.
**Effort**: 1h | **Impact**: MEDIUM
**Acceptance**: Single formatDuration definition; all components import from date-utils.

### [Design System] Fix FocusSuggestionsWidget colors

**File**: src/components/analytics/focus-suggestions-widget.tsx:21-37
**Perspectives**: design-systems-architect
**Impact**: Uses red-500/yellow-500/gray-500 instead of brutalist palette (danger-red, safety-orange, concrete-gray).
**Fix**: Update getPriorityColor to use design tokens.
**Effort**: 30m | **Impact**: MEDIUM
**Acceptance**: Widget uses only colors from BRUTALIST_COLORS.

### [Infrastructure] Automated CSP Testing

**Files**: src/tests/security/csp.test.ts (new)
**Perspectives**: security-sentinel, architecture-guardian
**Impact**: CSP configuration caused 2025-11-06 production outage. Manual verification is error-prone.
**Fix**: Vitest tests parsing CSP from next.config.ts and middleware.ts, validating all required domains present.
**Effort**: 3h | **Cost**: $0
**Acceptance**: Tests catch CSP misconfigurations in CI before merge.

### [Infrastructure] Configuration as Code for CSP

**Files**: src/config/security.ts (new), next.config.ts, src/middleware.ts
**Perspectives**: security-sentinel, architecture-guardian
**Impact**: CSP domains defined in two places can drift. Custom domain (`clerk.volume.fitness`) was missed in wildcard patterns.
**Fix**: Single source of truth `CSP_DOMAINS` object imported by both configs.
**Effort**: 4h | **Cost**: $0
**Acceptance**: CSP definition exists in one file only; both configs import it.

### [Infrastructure] Add pre-push git hook

**Files**: .husky/pre-push (new)
**Perspectives**: architecture-guardian
**Impact**: Type errors and broken tests only discovered in CI (5+ min wasted). No local validation before push.
**Fix**: Add pre-push hook running `tsc --noEmit --incremental` + `vitest --run`. Catches failures locally in <30s.
**Effort**: 20m | **Cost**: $0
**Acceptance**: Push fails locally if type errors or test failures exist.

### [Infrastructure] Parallelize CI pipeline

**Files**: .github/workflows/ci.yml
**Perspectives**: architecture-guardian
**Impact**: CI runs type check → lint → test → build sequentially. First three are independent, wasting 1-2 minutes.
**Fix**: Split into parallel jobs for type check, lint, test. Build depends on all three passing.
**Effort**: 15m | **Cost**: $0
**Acceptance**: CI completes 1-2 min faster; failures surface in parallel.

### [Observability] Add actual Convex connectivity check to health endpoint

**File**: src/app/api/health/route.ts
**Perspectives**: architecture-guardian, user-experience-advocate
**Impact**: Current health check only validates NEXT_PUBLIC_CONVEX_URL exists, not actual connectivity. False positives when Convex is down.
**Fix**: Add lightweight Convex query (e.g., ping mutation) with timeout. Return 503 if unreachable.
**Effort**: 30m | **Risk**: LOW
**Acceptance**: Health endpoint returns 503 when Convex is actually unreachable.

### [Testing] Add tests for malformed email patterns in PII sanitization

**File**: src/lib/sentry.test.ts
**Perspectives**: security-sentinel
**Impact**: Edge cases like `user@`, `@domain.com`, `user@@domain.com` may not be properly handled by email regex.
**Fix**: Add test cases for malformed patterns, ensure they're either properly redacted or passed through safely.
**Effort**: 30m | **Risk**: LOW
**Acceptance**: All edge cases documented with expected behavior.

### [Docs] Add curl example to health endpoint documentation

**File**: CLAUDE.md
**Perspectives**: maintainability-maven
**Impact**: Developers may not know how to test health endpoint locally. Missing example slows onboarding.
**Fix**: Add `curl localhost:3000/api/health | jq` example to health endpoint section.
**Effort**: 5m | **Risk**: LOW
**Acceptance**: Quick-copy command in docs.

### [Infrastructure] Fix Vercel build command for Convex

**Files**: package.json, Vercel project settings
**Perspectives**: architecture-guardian, security-sentinel
**Impact**: Build command is `next build` but should be `npx convex deploy && next build`. Convex functions must deploy before Next.js build to generate correct types.
**Fix**: Update build script or document manual Convex deploy workflow.
**Effort**: 5m | **Risk**: MEDIUM
**Acceptance**: Vercel builds succeed with fresh Convex types; no stale API errors.

---

## Next (This Quarter, <3 months)

### [Observability] Add structured logging with pino

**Scope**: src/lib/logger.ts (new), replace console.log across codebase
**Perspectives**: architecture-guardian, maintainability-maven
**Why**: No structured logging - can't query logs, no trace correlation, logs disappear after 30 days in Vercel.
**Approach**: Install pino, create logger utility with JSON output, log levels, request correlation IDs. Replace console.log usage.
**Effort**: 2h | **Impact**: MEDIUM

### [Observability] Investigate OpenTelemetry for distributed tracing

**Scope**: Research @vercel/otel or spectacle integration
**Perspectives**: performance-pathfinder, architecture-guardian
**Why**: No distributed tracing beyond Sentry. Cannot track request flow across frontend → backend → Convex.
**Approach**: Evaluate Vercel OTEL vs spectacle, test with Grafana Cloud free tier, assess value vs complexity.
**Effort**: 3h (research) | **Impact**: MEDIUM

### [Observability] Set up uptime monitoring service

**Scope**: External monitoring configuration
**Perspectives**: user-experience-advocate, architecture-guardian
**Why**: No external visibility into production availability. Users discover outages before team.
**Approach**: Sign up UptimeRobot/BetterUptime free tier, configure health endpoint monitoring, Slack alerts.
**Effort**: 15m | **Impact**: LOW

### [Observability] Create Grafana Cloud dashboard for traces

**Scope**: Grafana Cloud free tier setup
**Perspectives**: performance-pathfinder, architecture-guardian
**Why**: No trace visualization. Sentry performance tab limited for detailed analysis.
**Approach**: Set up Grafana Cloud free tier (10k series, 50GB traces), create latency percentile dashboards.
**Effort**: 2h | **Impact**: LOW

### [Testing] Expand QuickLogForm component tests

**File**: src/components/dashboard/quick-log-form.test.tsx
**Perspectives**: maintainability-maven, user-experience-advocate
**Why**: Current tests are smoke tests only (157 lines). Form validation, error states, PR detection display untested.
**Approach**: Add tests for validation errors, mutation failures, toast notifications, last set display.
**Effort**: 2h | **Impact**: MEDIUM

### [Testing] Add Dashboard component tests

**File**: src/components/dashboard/Dashboard.test.tsx (new)
**Perspectives**: maintainability-maven, user-experience-advocate
**Why**: Main user-facing component at 0% coverage. Loading states, data display, navigation untested.
**Approach**: Test loading skeleton, empty state, set display, exercise grouping.
**Effort**: 2h | **Impact**: MEDIUM

### [Testing] Integration tests for exercise creation flow

**Scope**: Component + hook + mocked Convex integration
**Perspectives**: architecture-guardian, maintainability-maven
**Why**: No tests verify complete user flows across component boundaries.
**Approach**: Test ExerciseManager create → toast → list update flow with mocked Convex.
**Effort**: 3h | **Impact**: MEDIUM

### [Testing] Integration tests for set logging flow

**Scope**: QuickLogForm → useQuickLogForm → Convex
**Perspectives**: architecture-guardian, maintainability-maven
**Why**: Core app flow untested end-to-end at component level.
**Approach**: Test form submission → mutation → PR detection → toast → history update.
**Effort**: 3h | **Impact**: MEDIUM

### [Testing] Add E2E tests to CI pipeline

**File**: .github/workflows/ci.yml
**Perspectives**: architecture-guardian
**Why**: E2E tests exist but not enforced. Regressions can merge without E2E passing.
**Approach**: Add Playwright job to CI, run on merge to main (not every PR for speed).
**Effort**: 1h | **Impact**: MEDIUM

### [Testing] Document testing strategy

**File**: CONTRIBUTING.md (new or update)
**Perspectives**: maintainability-maven
**Why**: No documentation on what to test, testing philosophy, or patterns to follow.
**Approach**: Document test pyramid, when to write E2E vs unit, mocking patterns, coverage expectations.
**Effort**: 1h | **Impact**: MEDIUM

### [Testing] Add Playwright authentication setup for Clerk

**Files**: e2e/auth-setup.ts (new), e2e/critical-flow.spec.ts
**Perspectives**: architecture-guardian, user-experience-advocate
**Why**: E2E tests requiring authentication (critical-flow) are marked fixme. Can't test authenticated user flows like workout logging.
**Approach**: Implement Clerk testing patterns from @clerk/testing, configure test user credentials, enable critical-flow spec.
**Effort**: 2-3h | **Impact**: HIGH
**Acceptance**: critical-flow.spec.ts passes; authenticated E2E flows testable.
**Reference**: PR #34 review feedback

### [Testing] Add data-testid attributes for reliable E2E selectors

**Files**: Multiple components (QuickLogForm, ExerciseSelector, SetCard, etc.)
**Perspectives**: maintainability-maven, architecture-guardian
**Why**: E2E tests use brittle text-based selectors ("Bench Press", "LOG SET"). Tests break when copy changes.
**Approach**: Add data-testid to interactive elements, update E2E tests to use testid selectors.
**Effort**: 2h | **Impact**: MEDIUM
**Acceptance**: E2E tests use data-testid selectors; no text-based selectors for buttons/inputs.
**Reference**: PR #34 review feedback

### [Docs] Add docstrings to test infrastructure

**Files**: src/test/setup.ts, src/test/utils.tsx, vitest.config.ts
**Perspectives**: maintainability-maven
**Why**: Test utilities have 0% docstring coverage. New developers can't understand test setup patterns.
**Approach**: Add JSDoc to exported functions (render, mocks) explaining purpose and usage.
**Effort**: 30m | **Impact**: LOW
**Acceptance**: Core test utilities documented with examples.
**Reference**: PR #34 review feedback

### [Testing] Remove duplicate progressive overload test entry

**File**: BACKLOG.md:362-367
**Perspectives**: maintainability-maven
**Why**: BACKLOG says "convex/analyticsProgressiveOverload.ts (no test file exists)" but it has 517 lines of tests!
**Approach**: Remove stale entry, celebrate existing coverage.
**Effort**: 5m | **Impact**: LOW

### [Performance] Create composite analytics query

**Scope**: convex/analytics.ts + analyticsFocus.ts + analyticsRecovery.ts + analyticsProgressiveOverload.ts
**Perspectives**: performance-pathfinder, complexity-archaeologist, architecture-guardian
**Why**: Analytics page fires 7 parallel queries, each fetching all user's sets independently. 7 database round-trips for same data.
**Approach**: Create `getAnalyticsDashboard` that fetches sets once, computes all metrics in single pass, returns composite object.
**Effort**: 3h | **Speedup**: 3-5x (single DB round-trip)

### [Performance] Stream dashboard data instead of loading entire history

**File**: src/components/dashboard/Dashboard.tsx:35; convex/sets.ts:31
**Perspectives**: performance-pathfinder, user-experience-advocate, complexity-archaeologist
**Why**: `useQuery(api.sets.listSets, {})` materializes every historical set on each render, then filters client-side. Users with 10k sets download >2 MB.
**Approach**: Add Convex query with pagination cursors; update dashboard to consume paginated feed.
**Effort**: 6h | **Impact**: Dashboard loads under 400ms with 10k-set fixture

### [Security] Rate-limit OpenAI muscle classification

**File**: convex/exercises.ts:22; convex/ai/openai.ts:328
**Perspectives**: security-sentinel, performance-pathfinder, product-visionary
**Why**: Authenticated users can script thousands of `createExercise` calls; each hits OpenAI, burning tokens (cost-based DoS).
**Approach**: Track per-user exercise creations, enforce daily quota before invoking `classifyExercise`.
**Effort**: 4h | **Risk**: HIGH

### [Architecture] Decompose AI report pipeline into layered modules

**Scope**: Refactor convex/ai/reports.ts (1,066 LOC across 17 exports)
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven, performance-pathfinder
**Why**: God module mixes rate limiting, cron orchestration, analytics munging, logging, and persistence; every touch amplifies risk.
**Approach**: Extract `reports-generate.ts`, `reports-queries.ts`, `reports-backfill.ts`; import from existing `streak_calculator.ts`.
**Effort**: 4h | **Impact**: 1066 lines → 4 focused 200-line modules

### [Architecture] Decompose QuickLogForm into focused components

**File**: src/components/dashboard/quick-log-form.tsx (531 lines)
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven
**Why**: Component handles form state, focus management, mode switching, PR detection, inline exercise creation, keyboard handling. Difficult to test individual behaviors.
**Approach**: Extract `ExerciseCombobox`, `SetValueInputs`, `LastSetIndicator`; keep QuickLogForm as orchestrator.
**Effort**: 4h | **Impact**: Better testability, maintainability

### [Architecture] Standardize auth error patterns

**Files**: All Convex mutation/query files
**Perspectives**: architecture-guardian, maintainability-maven, security-sentinel
**Why**: Mixed patterns - some return empty arrays, some throw errors. Developers unsure which to use; can't distinguish "no data" from "not authenticated".
**Approach**: Standardize on throwing errors for unauthenticated access; consider Convex middleware wrapper.
**Effort**: 1h | **Impact**: Consistent security model

### [UX] Add undo to all delete operations

**Files**: src/components/dashboard/set-card.tsx:51, exercise-set-group.tsx:65, chronological-set-history.tsx:76
**Perspectives**: user-experience-advocate
**Why**: QuickLogForm has undo toast for deletes, but everywhere else doesn't. Users can accidentally delete sets with no recovery.
**Approach**: Add undo toast pattern matching QuickLogForm implementation.
**Effort**: 2h | **Value**: HIGH - prevents accidental data loss

### [UX] Fix silent mutation errors in history page

**File**: src/app/(app)/history/page.tsx:47-49
**Perspectives**: user-experience-advocate
**Why**: When delete fails (network error), user sees no feedback. They think deletion worked but set remains.
**Approach**: Wrap in try-catch with `handleMutationError`.
**Effort**: 5m | **Value**: HIGH - prevents data loss confusion

### [UX] Create EmptyState component

**Scope**: Standardize 10+ empty state patterns across analytics widgets
**Perspectives**: design-systems-architect, user-experience-advocate
**Why**: Different text sizes, spacing, detail levels across empty states. Inconsistent UX messaging.
**Approach**: Extract `EmptyState` component with icon, title, description, optional action.
**Effort**: 3h | **Impact**: MEDIUM

### [UX] Create standardized skeleton components

**Scope**: 8+ different loading skeleton implementations
**Perspectives**: design-systems-architect, user-experience-advocate
**Why**: Each component implements own skeleton with varying styles. Inconsistent loading UX.
**Approach**: Create `CardSkeleton`, `ListSkeleton`, `FormSkeleton` using design tokens.
**Effort**: 5h | **Impact**: HIGH - consistent loading patterns

### [Design System] Extract tab + badge primitives

**Scope**: src/components/analytics/report-navigator.tsx:74, ai-insights-card.tsx:95
**Perspectives**: design-systems-architect, maintainability-maven
**Why**: Hard-coded `text-purple-600`/`text-blue-500` bypass tokens. Tab pattern duplicated.
**Approach**: Introduce shared `Tabs` and `Badge` components backed by Tailwind tokens.
**Effort**: 0.5d | **Impact**: Consistent theming

### [Product] Ship on-demand AI report trigger with usage feedback

**Scope**: Wire up `api.ai.reports.generateOnDemandReport` in UI
**Perspectives**: product-visionary, user-experience-advocate, security-sentinel
**Why**: Users wait for cron runs; backend already has quotas. Missing retention hook and premium upsell opportunity.
**Approach**: Add CTA in ReportNavigator, display quota meter, reuse toast patterns.
**Effort**: 1d | **Impact**: Increases engagement

### [Product] Rest timer with smart suggestions

**Scope**: New feature - timer between sets
**Perspectives**: product-visionary, user-experience-advocate
**Why**: Timer keeps app open between sets. AI can suggest rest based on exercise type/intensity.
**Approach**: Timer component with presets, AI suggestion, push notifications.
**Effort**: 3-4d | **Strategic Value**: HIGH - engagement and differentiation

### [Product] Notes/RPE on sets

**Scope**: Add notes field to sets schema
**Perspectives**: product-visionary, user-experience-advocate
**Why**: Table stakes feature for self-coaching. Better context for AI reports.
**Approach**: Add `notes` field, optional text input in QuickLogForm.
**Effort**: 1-2d | **Strategic Value**: MEDIUM

### [Performance] Reduce redundant analytics scans

**Scope**: convex/ai/reports.ts:76, convex/analytics.ts:315
**Perspectives**: performance-pathfinder, maintainability-maven
**Why**: Three full-table scans per report plus whole-history PR detection. Will thrash Convex as data grows.
**Approach**: Build shared materialized aggregates, reuse across analytics + AI.
**Effort**: 1.5d | **Impact**: Cuts report generation time ~60%

### [Maintainability] Fix excessive `any` types

**Files**: convex/exercises.ts:26,51, convex/ai/reports.ts (multiple), Dashboard.tsx:69,81
**Perspectives**: maintainability-maven
**Why**: Bypasses TypeScript, hides runtime errors. New developers can't understand data shapes.
**Approach**: Use proper Convex generated types, `Id<"exercises">` etc.
**Effort**: 2h | **Benefit**: HIGH - compile-time error catching

### [Maintainability] Document magic number thresholds

**Files**: convex/analyticsRecovery.ts:48-52, convex/analyticsProgressiveOverload.ts:34,50-52
**Perspectives**: maintainability-maven
**Why**: Recovery thresholds (2/7 days) and trend thresholds (6 workouts, 5%) unexplained. Affects UX significantly.
**Approach**: Add constants with JSDoc explaining rationale (e.g., muscle protein synthesis research).
**Effort**: 30m | **Benefit**: HIGH - informed tuning decisions

### [Infrastructure] Staging Environment Setup

**Scope**: Dedicated staging with production-like config
**Perspectives**: security-sentinel, architecture-guardian, user-experience-advocate
**Why**: Preview environments can't validate production-specific configs (custom domains, live integrations).
**Approach**: Vercel staging project, Convex staging deployment, mirror production domain patterns.
**Effort**: 1.5d | **Cost**: ~$20/month

### [Infrastructure] Add Gitleaks pre-commit hook

**Files**: .husky/pre-commit, .gitleaks.toml (new)
**Perspectives**: security-sentinel
**Why**: No secrets scanning currently. Risk of committing API keys, tokens, or credentials.
**Approach**: Add Gitleaks to pre-commit hook, configure to scan staged files only.
**Effort**: 30m | **Cost**: $0
**Acceptance**: Commit fails if secrets detected; `.env.local` patterns properly ignored.

### [Infrastructure] Add Trivy vulnerability scanning to CI

**Files**: .github/workflows/ci.yml
**Perspectives**: security-sentinel
**Why**: npm audit runs manually only. No automated CVE detection in CI.
**Approach**: Add Trivy action scanning dependencies, containers, misconfigs. Alert on HIGH/CRITICAL only.
**Effort**: 20m | **Cost**: $0
**Acceptance**: CI fails on HIGH/CRITICAL vulnerabilities; LOW/MEDIUM logged but don't block.

### [Infrastructure] Add Changesets for changelog automation

**Files**: .changeset/config.json (new), package.json scripts
**Perspectives**: architecture-guardian
**Why**: No CHANGELOG.md, no release tracking, manual version bumps. No visibility into what changed between deployments.
**Approach**: Init Changesets, add `pnpm changeset` workflow, generate changelog on version bump.
**Effort**: 1h | **Cost**: $0
**Acceptance**: PRs require changeset file; releases auto-generate CHANGELOG entries.

### [Infrastructure] Add env var validation script

**Files**: scripts/validate-env.sh (new)
**Perspectives**: architecture-guardian, security-sentinel
**Why**: Environment parity issues cause "works locally, fails in Vercel" bugs. No comparison between local and production vars.
**Approach**: Script comparing required vars across `.env.local`, Vercel preview, and Vercel production. Run in pre-push hook.
**Effort**: 30m | **Cost**: $0
**Acceptance**: Push warns if critical env vars missing from Vercel; lists discrepancies.

---

## Soon (Exploring, 3-6 months)

- **[Product] Routine templates & scheduling** – Pre-built workouts for new users, critical onboarding unlock. Foundation for premium content.
- **[Product] Social sharing (Phase 1)** – Export workout summary as shareable image. Viral growth starter.
- **[UX] Offline-first quick log** – Service Worker cache + optimistic queue. Table stakes for gym usage.
- **[UX] Search/filter in exercise list** – Power users with many exercises need search capability.
- **[Architecture] Domain service for PR detection** – Move shared logic to pure module for reuse and deterministic tests.
- **[Architecture] Create opaque ID types** – Decouple frontend from Convex `Id<>` types for backend flexibility.
- **[Infrastructure] Structured logging with Pino** – Replace console.log with structured context, levels, correlation IDs.
- **[Documentation] Component library JSDoc** – Document all public components with usage examples.
- **[Performance] Move exercise sorting to backend** – `sortExercisesByRecency` scans all sets on every render.
- **[Testing] Visual regression baseline** – Playwright screenshots for key pages, catch unintended UI changes.
- **[Testing] Accessibility audit with axe** – axe-playwright integration, WCAG compliance, keyboard navigation.
- **[Testing] Performance baseline with Lighthouse CI** – Track Core Web Vitals, catch performance regressions in CI.
- **[Testing] Contract tests for Convex schema** – Validate frontend types match backend schema, catch breaking changes.

---

## Later (Someday/Maybe, 6+ months)

- **[Platform] Native mobile companion** – React Native or PWA improvements
- **[Platform] Apple Watch / Wear OS** – Log sets without phone, 2x engagement
- **[Integration] Apple Health / Google Fit sync** – Data portability, ecosystem participation
- **[Product] Premium tier** – Gate advanced analytics, unlimited history, export
- **[Product] Social features (Full)** – Friends, feeds, challenges
- **[Product] Superset/circuit support** – Link exercises for compound movements
- **[Innovation] AI form coach via video** – Computer vision for form feedback
- **[Innovation] Predictive program optimization** – Auto-adjust volume based on recovery

---

## Learnings

**From 2025-11-18 grooming session:**

- **Code duplication pattern**: PR detection, streak calculation, formatDuration all duplicated between frontend and backend. Pattern: consolidate to backend-only calculations, have frontend query for results.

- **God module accumulation**: reports.ts (1066 lines), QuickLogForm (531 lines) grew when features were added tactically. Need strategic decomposition before adding more features.

- **Analytics query redundancy**: 7 parallel queries hitting same data on Analytics page. Need composite query pattern to batch related computations.

- **Design system drift**: Without strict enforcement, new components default to generic Tailwind. SetCard, FocusSuggestionsWidget bypassed brutalist tokens.

**From 2025-11-06 CSP production outage:**

- Custom domain configuration (`clerk.volume.fitness`) failed because CSP wildcards (`*.clerk.com`) don't match custom subdomain structures. Preview environments can't catch production-specific configs without explicit staging infrastructure.

**From AI reporting development:**

- Client dashboards must stay server-driven—pulling full tables erases Convex's real-time advantages as data grows.

**From 2025-11-18 testing audit:**

- **Backend tests are strong**: Convex functions well-tested (exercises.test.ts 450 lines, analytics.test.ts 565 lines). Backend-first testing pays off.

- **Component testing gap**: Only 5 of ~40 components have tests. But that's okay—test behavior in hooks/utilities, not React rendering. Integration tests more valuable than component unit tests.

- **Coverage thresholds unrealistic**: 70% threshold failing at 35.86% actual. Presentation components (layout, UI) shouldn't count toward coverage—exclude them.

- **E2E missing entirely**: Zero Playwright tests. Critical flows (auth, logging workout) untested end-to-end. Smoke tests catch surprising number of bugs.

- **PII handling untested**: sentry.ts at 8.76%, analytics.ts at 35.84%. Security-critical code should be test-first.

- **BACKLOG stale entry**: Progressive overload listed as "no tests" but has 517 lines of tests. Audit before trusting documentation.
