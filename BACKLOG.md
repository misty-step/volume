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

### [Infrastructure] Production Safety & Pre-Deployment Validation

**Scope**: Multi-layered strategy to prevent production failures from configuration mismatches, untested changes, and environment inconsistencies.
**Perspectives**: security-sentinel, architecture-guardian, user-experience-advocate, maintainability-maven
**Why**: 2025-11-06 production outage (CSP blocking Clerk auth) revealed gaps in our deployment validation. Custom domain `clerk.volume.fitness` wasn't covered by CSP wildcards (`*.clerk.com`), causing complete auth failure. Need systematic safeguards to make production surprises impossible.

**Root Cause Analysis**: Configuration changes (CSP headers, environment variables, custom domains) can silently break production without early detection. Preview environments don't validate production-specific configs like custom domains, live API keys, or production service integrations.

**Multi-Strategy Approach**:

#### Phase 1: Quick Wins (Sprint-Ready, 1-2 weeks)

**1. Automated CSP Testing**

- **Files**: `src/tests/security/csp.test.ts` (new)
- **Implementation**: Vitest tests that parse CSP from `next.config.ts` and `src/middleware.ts`, validate all required domains present:

  ```typescript
  describe("CSP Configuration", () => {
    it("allows all Clerk domains", () => {
      const csp = parseCSPFromConfig();
      expect(csp.scriptSrc).toContain("https://*.clerk.com");
      expect(csp.scriptSrc).toContain("https://clerk.volume.fitness");
      expect(csp.scriptSrc).toContain("https://*.clerk.accounts.dev");
    });

    it("CSP consistency between next.config and middleware", () => {
      const staticCSP = parseCSPFromNextConfig();
      const dynamicCSP = parseCSPFromMiddleware();
      expect(staticCSP.scriptSrc).toEqual(dynamicCSP.scriptSrc);
    });
  });
  ```

- **Effort**: 3h | **Value**: Catches CSP misconfigurations in CI before merge

**2. Configuration as Code**

- **Files**: `src/config/security.ts` (new), `next.config.ts`, `src/middleware.ts`
- **Implementation**: Single source of truth for CSP directives:

  ```typescript
  // src/config/security.ts
  export const CSP_DOMAINS = {
    clerk: [
      "https://*.clerk.com",
      "https://clerk.volume.fitness",
      "https://*.clerk.accounts.dev",
    ],
    convex: ["https://*.convex.cloud", "wss://*.convex.cloud"],
    // ... other domains
  } as const;

  export function buildCSP(): CSPDirectives {
    return {
      scriptSrc: ["self", "unsafe-inline", ...CSP_DOMAINS.clerk],
      connectSrc: ["self", ...CSP_DOMAINS.clerk, ...CSP_DOMAINS.convex],
      // ... other directives
    };
  }
  ```

- Import and use in both `next.config.ts` and `src/middleware.ts`
- **Effort**: 4h | **Value**: Eliminates config drift between middleware and next.config

**3. Pre-Deployment Checklist Automation**

- **Files**: `.github/workflows/pre-deploy.yml` (new), `.github/DEPLOYMENT_CHECKLIST.md`
- **Implementation**: GitHub Actions workflow that runs before production deploy:

  ```yaml
  name: Pre-Deploy Gate
  on:
    pull_request:
      branches: [master]

  jobs:
    validate:
      runs-on: ubuntu-latest
      steps:
        - name: Type Check
          run: pnpm typecheck
        - name: Run Tests
          run: pnpm test --run
        - name: Security Tests
          run: pnpm test:security
        - name: Build Check
          run: pnpm build
        - name: CSP Validation
          run: pnpm test:csp
  ```

- Make PR merges require passing gate
- **Effort**: 2h | **Value**: Codifies deployment checklist, prevents human error

**Phase 1 Total**: 9h (1.1 days) | **Cost**: $0

#### Phase 2: Staging Environment (This Quarter, 2-3 weeks)

**4. Dedicated Staging Environment**

- **Why Not Preview = Production?** Security risk. Sharing production credentials (live API keys, production database access, production OpenAI quota) with every PR branch creates attack surface. A malicious PR could exfiltrate secrets, corrupt production data, or exhaust paid quotas.
- **Why Staging?** Isolated environment with production-like config but separate credentials/data. Validates production configs (custom domains, CSP headers, live integrations) without security risks.
- **Setup**:
  - Vercel: Create new project for staging (`volume-staging`)
  - Convex: Create staging deployment (`staging:volume-tracker`)
  - Clerk: Use production domain (`clerk.volume.fitness`) with test-mode keys
  - DNS: Add staging subdomain (`staging.volume.fitness`)
- **Workflow**:
  1. Merge to `master` auto-deploys to staging
  2. Run automated smoke tests against staging
  3. Manual QA in staging
  4. Promote to production via manual trigger
- **Environment Variables**: Mirror production structure but with staging-specific values:
  ```bash
  # Staging uses production domain patterns but separate data
  CLERK_JWT_ISSUER_DOMAIN=https://clerk.volume.fitness
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_staging_key
  CONVEX_DEPLOY_KEY=staging:volume-tracker|<secret>
  ```
- **Effort**: 1.5d | **Cost**: ~$20/month (Vercel Pro for staging slot)

**5. Automated Smoke Tests in Staging**

- **Files**: `tests/e2e/production-smoke.spec.ts` (new)
- **Implementation**: Playwright tests for critical flows, run against staging before production:

  ```typescript
  test("Clerk authentication loads with custom domain", async ({ page }) => {
    await page.goto(process.env.STAGING_URL);
    await expect(page.locator("[data-clerk-auth]")).toBeVisible();

    // Verify no CSP violations
    const cspErrors = [];
    page.on("console", (msg) => {
      if (msg.text().includes("Content Security Policy")) {
        cspErrors.push(msg.text());
      }
    });
    await page.waitForTimeout(2000);
    expect(cspErrors).toHaveLength(0);
  });

  test("Exercise creation with AI classification", async ({ page }) => {
    await signIn(page);
    await page.fill('[data-testid="exercise-name"]', "Bench Press");
    await page.click('[data-testid="create-exercise"]');
    await expect(page.locator('[data-testid="muscle-group"]')).toContainText(
      "Chest"
    );
  });
  ```

- **Trigger**: GitHub Actions on merge to master, before production deploy
- **Effort**: 2d | **Value**: Catches production-specific issues (custom domains, live integrations, CSP) before users see them

**Phase 2 Total**: 3.5d | **Cost**: ~$20/month

#### Phase 3: Continuous Monitoring (Next Quarter)

**6. Real-Time CSP Monitoring**

- **Files**: `src/middleware.ts`, `convex/monitoring/cspViolations.ts` (new)
- **Implementation**: Report-Uri endpoint that logs CSP violations to Convex:

  ```typescript
  // Add to CSP header
  report - uri / api / csp - report;

  // API route logs to Convex
  export async function POST(request: Request) {
    const violation = await request.json();
    await ctx.db.insert("cspViolations", {
      blockedUri: violation["blocked-uri"],
      violatedDirective: violation["violated-directive"],
      timestamp: Date.now(),
      userAgent: request.headers.get("user-agent"),
    });
  }
  ```

- Set up alerts when violations exceed threshold
- **Effort**: 1d | **Value**: Real-time production monitoring, catches issues immediately

**7. Configuration Drift Detection**

- **Files**: `.github/workflows/config-audit.yml` (new)
- **Implementation**: Weekly scheduled job that compares staging vs production configs:

  ```yaml
  - name: Compare Environment Configs
    run: |
      # Fetch both environments
      vercel env ls production > prod.txt
      vercel env ls staging > staging.txt

      # Check that critical vars match structure
      diff <(grep CLERK prod.txt) <(grep CLERK staging.txt) || \
        echo "::warning::Clerk config drift detected"
  ```

- **Effort**: 0.5d | **Value**: Prevents configuration drift over time

**Phase 3 Total**: 1.5d

#### Implementation Roadmap

**Sprint 1 (Now)**:

- Automated CSP testing (3h)
- Configuration as code (4h)
- Pre-deployment checklist automation (2h)
- **Total**: 9h | **ROI**: Immediate CI validation

**Sprint 2-3 (This Quarter)**:

- Staging environment setup (1.5d)
- Automated smoke tests (2d)
- **Total**: 3.5d | **ROI**: Pre-production validation gate

**Sprint 4-5 (Next Quarter)**:

- CSP monitoring (1d)
- Config drift detection (0.5d)
- **Total**: 1.5d | **ROI**: Continuous production safety

**Total Investment**: 6 days | **Cost**: $20/month
**Effort**: 6d | **Impact**: Eliminates production configuration surprises, validates environment-specific configs before deploy, provides real-time monitoring

---

## Soon (Exploring, 3-6 months)

- **[Product] Routine templates & scheduling** – reuse Convex actions so new users can pre-build workouts; critical onboarding unlock.
- **[UX] Offline-first quick log** – Service Worker cache + optimistic queue so gym logging succeeds without cell service.
- **[UX] Distinguish loading vs empty state for AI reports** – show skeleton while `getReportHistory` loads to prevent the misleading "No reports yet" flash.
- **[Architecture] Domain service for PR detection** – move shared logic out of hooks into a pure module for reuse and deterministic tests.
- **[Performance] Snapshot weekly metrics** – background job persists aggregates, keeping historical charts fast.

### Code Quality Improvements from PR#26 Review

**Source**: CodeRabbit feedback on duration-based exercises PR (PR#26)
**Date**: 2025-11-09

#### [Refactoring] Extract `formatDuration` to shared utility

**Impact**: DRY violation - helper duplicated across 4 dashboard components
**Files**: `chronological-set-history.tsx`, `exercise-set-group.tsx`, `set-card.tsx`, `quick-log-form.tsx`
**Fix**: Create `src/lib/time-utils.ts` with `formatDuration(seconds: number): string` and update all imports
**Effort**: 0.5h | **Risk**: LOW
**Rationale**: Non-critical code quality improvement; eliminates ~20 lines of duplication and ensures consistent time formatting

#### [UX Polish] Add max attribute to duration HTML inputs

**Impact**: Browser-level validation missing for duration inputs
**File**: `src/components/dashboard/quick-log-form.tsx:407-437`, `src/components/dashboard/duration-input.tsx`
**Fix**: Add `max="86400"` attribute to `<Input type="number">` elements
**Effort**: 0.25h | **Risk**: LOW
**Rationale**: Complements existing Zod validation with native browser feedback; improves UX when JS validation fails

---

## Later (Someday/Maybe, 6+ months)

- **[Platform] Native mobile companion**
- **[Integration] Apple Health / Google Fit sync**
- **[Innovation] AI coach co-pilot program builder**

---

## Learnings

- The AI reporting seam spans performance, reliability, and UX; future changes need cross-functional review to avoid regressions.
- Client dashboards must stay server-driven—pulling full tables erases Convex's real-time advantages as soon as volume grows.
- Debug tooling must be gated; leaving console leaks behind becomes a security liability once analytics surfaces ship.
- **[2025-11-06] CSP Production Outage**: Custom domain configuration (`clerk.volume.fitness`) failed in production because CSP wildcards (`*.clerk.com`, `*.clerk.accounts.dev`) don't match custom subdomain structures. Preview environments can't catch production-specific configs (custom domains, live API integrations) without explicit staging infrastructure. Need automated CSP validation tests and dedicated staging environment with production-like config to validate before deploy.

---

## Follow-Up Items from PR #27 Review (2025-11-08)

### [UX] Case-insensitive URL filtering in analytics

**File**: src/components/analytics-wrapper.tsx:30
**Source**: CodeRabbit PR review comment
**Why**: Current filtering uses case-sensitive `includes()` which could miss variations like `TOKEN=`, `Key=`, or URL-encoded parameters (`%20token%3D`). Since this is a privacy-first implementation, case-insensitive matching provides better coverage.
**Approach**: Convert URL to lowercase before checking: `const url = (event.url || "").toLowerCase()`
**Effort**: 0.5h | **Impact**: LOW (nice-to-have privacy enhancement)

### [Documentation] Generalize README deployment names

**File**: README.md:54-71
**Source**: CodeRabbit PR review comment
**Why**: Hardcoded deployment names (`curious-salamander-943`, `whimsical-marten-631`) are project-specific. Makes README harder to use as template for contributors or forks.
**Approach**: Replace with placeholders `<your-dev-deployment>`, `<your-prod-deployment>` and add note: "To find your deployment names, run: `pnpm convex deployments`"
**Effort**: 0.25h | **Impact**: LOW (documentation improvement)

### [Cleanup] Remove TASK.md temporary file

**File**: TASK.md:1
**Source**: CodeRabbit PR review comment
**Why**: Temporary task note that has been completed (PR implements observability stack). Should be removed before merge.
**Approach**: Delete file in cleanup commit before merging PR #27
**Effort**: 1 min | **Impact**: LOW (housekeeping)

### [Documentation] Fix markdown linting issues

**Files**: TODO.md, DEPLOYMENT_READINESS.md
**Source**: markdownlint-cli2 warnings (bare URLs, missing code block languages)
**Why**: Bare URLs and unspecified code fence languages reduce readability and break some markdown parsers.
**Approach**:

- Wrap bare URLs in angle brackets or links
- Add language specifiers to code fences (bash, typescript, etc.)
  **Effort**: 0.5h | **Impact**: LOW (documentation quality)

### [Documentation] Consistent error handling pattern comments

**File**: src/app/history/page.tsx:25-26
**Source**: CodeRabbit PR review comment
**Why**: Error handling comments document Convex query error propagation pattern. Applying consistently across all query-using pages would help maintainability.
**Approach**: Add similar JSDoc comments to all pages using `useQuery` (exercises, log, etc.) explaining Error Boundary integration
**Effort**: 1h | **Impact**: LOW (documentation consistency)

---

## Follow-Up Items from PR #27 Review Round 2 (2025-11-09)

### [Documentation] Add code fence languages to DEPLOYMENT_ERROR_SCENARIOS.md

**File**: scripts/DEPLOYMENT_ERROR_SCENARIOS.md
**Source**: markdownlint-cli2 warnings (Nov 9 review)
**Why**: 10 code blocks missing language specifiers reduce syntax highlighting and markdown parser compatibility
**Approach**: Add language tags (`text`, `bash`, etc.) to fenced code blocks at lines 32, 56, 79, 100, 125, 147, 168, 190, 212, 269
**Effort**: 0.25h | **Impact**: LOW (documentation quality)

### [Documentation] Wrap bare URLs in DEPLOYMENT_ERROR_SCENARIOS.md

**File**: scripts/DEPLOYMENT_ERROR_SCENARIOS.md
**Source**: markdownlint-cli2 warnings (Nov 9 review)
**Why**: 4 bare URLs (lines 46, 47, 139, 203) should be wrapped for better markdown parser compatibility
**Approach**: Wrap in angle brackets `<url>` or link syntax `[text](url)`
**Effort**: 0.1h | **Impact**: LOW (documentation quality)

### [Infrastructure] Add shellcheck directive to deploy script

**File**: scripts/deploy-observability.sh:18
**Source**: CodeRabbit PR review comment (Nov 9)
**Why**: SC1090 warning about non-constant source is expected for dynamic secret loading but should be documented
**Approach**: Add `# shellcheck source=/dev/null` directive before `source ~/.secrets` to document intentional pattern
**Effort**: 0.05h | **Impact**: LOW (code documentation)
