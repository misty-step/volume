# BACKLOG: Volume Workout Tracker

Last groomed: 2025-11-26
Analyzed by: 8 specialized perspectives (complexity-archaeologist, architecture-guardian, security-sentinel, performance-pathfinder, maintainability-maven, user-experience-advocate, product-visionary, design-systems-architect)

---

## Now (Sprint-Ready, <2 weeks)

### [PRODUCT] Move from ad-hoc exercises per user to a curated set of high quality exercises

- each exercise should be well named, have instructions, have required gear, have muscle groups they work, and have one or more images / graphics showing form

### [PRODUCT] Make daily and weekly and monthly AI reports higher quality

- need to be more actionable
- insights up top
- summary and analysis
- recommendations

### [Security] Fix test endpoint production exposure

**File**: src/app/api/test/reset/route.ts
**Perspectives**: security-sentinel
**Impact**: Data-wiping endpoint protected only by env check + shared secret. Environment misconfiguration → data loss.
**Fix**: Exclude `/api/test/**` from production builds via `next.config.ts` or add IP allowlist
**Effort**: 30m | **Risk**: MEDIUM
**Acceptance**: Test endpoints 404 in production, available in dev/preview

### [UX] Add loading state for AI exercise classification

**Files**: src/components/dashboard/inline-exercise-creator.tsx:112, first-run-experience.tsx:42
**Perspectives**: user-experience-advocate
**Impact**: AI classification 2-5s, button shows "Creating..." but NO visual feedback, users abandon
**Fix**: Add spinner + progress text "AI analyzing muscle groups... 2-3 seconds"
**Effort**: 15m | **Value**: HIGH
**Acceptance**: Users understand delay, don't think app is frozen

### [Architecture] Consolidate PR detection to single source

**Files**: src/lib/pr-detection.ts:45-140, convex/lib/pr_detection.ts:33-128
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven
**Impact**: ~95 lines duplicated, risk of divergence when algorithm changes
**Fix**: Backend-only calculation, client queries for PRs (or extract shared package)
**Effort**: 2h | **Impact**: HIGH
**Acceptance**: Single checkForPR implementation

### [Architecture] Consolidate streak calculation

**Files**: src/lib/streak-calculator.ts:42-91, convex/lib/streak_calculator.ts:27-75
**Perspectives**: complexity-archaeologist, architecture-guardian
**Impact**: ~50 lines duplicated, timezone discrepancy risk (backend UTC limitation noted)
**Fix**: Backend-only calculation, client queries for streak data
**Effort**: 1.5h | **Impact**: HIGH
**Acceptance**: Single source, timezone handling consistent

### [Design System] Extract AnalyticsCard wrapper

**Files**: 6 analytics widgets with identical card header structure
**Perspectives**: design-systems-architect, complexity-archaeologist
**Impact**: 60+ lines of boilerplate (BrutalistCard + CardHeader pattern) duplicated 6x
**Fix**: Create `<AnalyticsCard title icon>` wrapper, migrate 6 analytics cards
**Effort**: 2h | **Impact**: MEDIUM
**Acceptance**: Single analytics card structure, 10 lines → 3 lines per usage

### [Design System] Standardize skeleton loading states

**Files**: 9 components with custom loading skeletons
**Perspectives**: design-systems-architect, user-experience-advocate
**Impact**: 200+ lines of inconsistent loading patterns (bg-concrete-gray/20 vs bg-muted)
**Fix**: Create `<AnalyticsCardSkeleton rows>` library, migrate 9 components
**Effort**: 3h | **Impact**: MEDIUM
**Acceptance**: Visual consistency, 23 lines → 1 line per loading state

### [Docs] Document business rule rationale

**Files**: src/lib/pr-detection.ts:110, convex/lib/validate.ts:11, convex/crons.ts:84
**Perspectives**: maintainability-maven
**Impact**: Magic numbers (1000 reps max, 100 users/cron, weight>volume>reps priority) lack context
**Fix**: Add JSDoc explaining WHY - research, user testing, DoS prevention, calculation basis
**Effort**: 2h | **Impact**: CRITICAL
**Acceptance**: 15+ magic numbers have rationale comments

### [Cleanup] Consolidate duplicate isMobile detection

**File**: src/lib/utils.ts:14
**Source**: PR #56 review (gemini-code-assist)
**Impact**: `isMobile()` utility duplicates logic from `useMobileViewport` hook, causing inconsistent viewport detection
**Fix**: Extract shared breakpoint constant, have both use single source of truth
**Effort**: 30m | **Value**: Consistency
**Acceptance**: Single mobile detection logic, both hook and utility reference same breakpoint

### [UX] Handle duration exercises in GhostSetDisplay history grid

**File**: src/components/dashboard/ghost-set-display.tsx:119-138
**Source**: PR #56 review (coderabbitai)
**Impact**: History grid renders `weight × reps` for all sets; duration-based exercises show `undefined × undefined`
**Fix**: Detect duration-based sets and render formatted duration (MM:SS) instead
**Effort**: 30m | **Value**: Correctness
**Acceptance**: Plank sets show duration in history grid, not undefined

### [Refactor] Add badgeText to SetSuggestion interface

**File**: src/lib/set-suggestion-engine.ts, src/components/dashboard/ghost-set-display.tsx:192-196
**Source**: PR #56 review (coderabbitai)
**Impact**: Badge text logic duplicated between engine and display component
**Fix**: Extend `SetSuggestion` interface with `badgeText: string` property, populate in engine
**Effort**: 30m | **Value**: DRY, single source of truth
**Acceptance**: `SetSuggestion.badgeText` computed once, display component just renders

### [Testing] Add history property to useLastSet test mocks

**File**: src/components/dashboard/ghost-set-display.test.tsx
**Source**: PR #56 review (coderabbitai)
**Impact**: Test mocks omit `history` property from `useLastSet` return value
**Fix**: Add `history: []` to all mock return values for accuracy
**Effort**: 15m | **Value**: Test hygiene
**Acceptance**: All useLastSet mocks include history property

### [Cleanup] Rename Set type to avoid shadowing global

**File**: src/lib/set-suggestion-engine.ts:17, src/lib/set-suggestion-engine.test.ts:3
**Source**: PR #56 review (coderabbitai)
**Impact**: `import type { Set }` shadows global JavaScript `Set` constructor
**Fix**: Rename to `WorkoutSet` in domain types and update all imports
**Effort**: 30m | **Value**: Clarity, linter compliance
**Acceptance**: No type shadow warnings, clearer code

---

### [Design System] Technical Brutalism Brand Alignment Audit & Implementation

**Scope**: Comprehensive alignment of design system with "Technical Brutalism" brand guidelines
**Perspectives**: design-systems-architect, user-experience-advocate
**Source**: brand-guidelines.jpg, AESTHETIC-CRITIQUE.md

**Brand Philosophy**:
Volume Fitness is not about wellness—it's about work. A technical tool for those who measure effort in tonnage moved. The aesthetic should feel like well-calibrated heavy machinery: reliable, blunt, built for output.

**Core Pillars**:

- **Raw Utility**: Function dictates form. No unnecessary decoration.
- **Heavy Industry**: Visual language of workshops, schematics, and iron.
- **Momentum**: Feeling of upward trajectory and compounding gains.

---

**PHASE 1: Color Token Correction** (2h)

Brand guidelines specify exact colors that current implementation deviates from:

| Token          | Brand Spec             | Current Code           | Delta                  |
| -------------- | ---------------------- | ---------------------- | ---------------------- |
| Primary Red    | `#C8102E`              | `#C41E3A`              | Wrong hue (too pink)   |
| Accent Orange  | `#FF5A1F`              | `#FF6B00`              | Wrong hue (too yellow) |
| BG Concrete    | `#F4F3F1` (warm beige) | `#F5F5F5` (cool gray)  | Missing warmth         |
| Border Carbon  | `#1A1A1A` (near-black) | `#000000` (pure black) | Too harsh              |
| Text Secondary | `#6E6E73`              | Not defined            | Missing token          |

**Files**:

- `src/config/design-tokens.ts:15-45` - Update BRUTALIST_COLORS
- `src/app/globals.css:25-60` - Update CSS custom properties
- `tailwind.config.ts:85-110` - Update Tailwind theme colors

**Acceptance**:

- [ ] All 5 color values match brand spec exactly
- [ ] HSL/OKLCH values calculated for design tokens
- [ ] Visual diff: warm beige background instead of cool gray

---

**PHASE 2: Typography Alignment** (3h)

Brand spec calls for Sora (headings) + JetBrains Mono (data). Current implementation uses Bebas Neue + JetBrains Mono.

| Role             | Brand Spec                           | Current             | Action                |
| ---------------- | ------------------------------------ | ------------------- | --------------------- |
| H1 (Page Titles) | Sora Black, 32px                     | Bebas Neue 400      | Replace with Sora 800 |
| H2 (Section)     | Sora Bold, 24px                      | Bebas Neue 400      | Replace with Sora 700 |
| Data XL          | JetBrains Mono Bold, 48px            | JetBrains Mono Bold | ✓ Correct             |
| Labels           | JetBrains Mono Bold, 12px, uppercase | JetBrains Mono      | ✓ Mostly correct      |
| Body             | Unspecified (defaulting sans)        | Inter               | Keep Inter            |

**Files**:

- `src/app/layout.tsx:12-25` - Replace Bebas_Neue with Sora import
- `src/config/design-tokens.ts:180-220` - Update BRUTALIST_TYPOGRAPHY
- `tailwind.config.ts:65-80` - Update fontFamily config
- `src/app/globals.css:15-25` - Update font-family fallbacks

**Decision Required**:

- Sora requires Google Fonts import (600KB+ for Black/Bold weights)
- Alternative: Keep Bebas Neue but document deviation from spec
- Recommendation: Use Sora for brand accuracy

**Acceptance**:

- [ ] Heading font renders as Sora Black (or documented alternative)
- [ ] Page titles ("TODAY", "ANALYTICS") use `font-heading-xl` token
- [ ] Section headers use `font-heading-lg` token

---

**PHASE 3: Hard Shadow System** (2h)

Brand guidelines specify hard offset shadows (no blur) as core visual element. Current implementation has tokens defined but only applies on hover states.

**Current State**:

```typescript
// design-tokens.ts - shadows defined but underused
BRUTALIST_SHADOWS = {
  lift: "4px 4px 0 0 rgba(0,0,0,1)", // ← Perfect, but hover-only
  press: "inset 0 4px 8px rgba(0,0,0,0.3)",
  heavy: "8px 8px 0 0 rgba(0,0,0,0.3)",
};
```

**Brand Spec**:

- Primary buttons: Default state has hard shadow, shifts on press
- Cards: Default hard shadow (not just hover)
- Active tabs: Encased in thick border with hard shadow offset

**Files**:

- `src/components/brutalist/BrutalistButton.tsx:30-45` - Add default shadow
- `src/components/brutalist/BrutalistCard.tsx:25-40` - Add default shadow
- `src/components/ui/card.tsx:15-25` - Consolidate with BrutalistCard
- `src/components/layout/nav.tsx:45-80` - Add shadow to active tab

**Implementation**:

```tsx
// Button: Default has shadow, pressed removes it
className={cn(
  "shadow-lift",                    // ADD default shadow
  "active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
  // ... rest
)}

// Card: Default shadow, hover intensifies
className={cn(
  "shadow-lift",                    // ADD default shadow
  "hover:shadow-heavy",             // Intensify on hover
  // ... rest
)}
```

**Acceptance**:

- [ ] Primary buttons have visible 4px offset shadow by default
- [ ] Cards have visible shadow by default (not just on hover)
- [ ] Press/active states shift button position to "fill" the shadow
- [ ] Active navigation tab has thick border + shadow treatment

---

**PHASE 4: Navigation Brutalist Treatment** (2h)

Current navigation uses only font-weight changes for active state. Brand guidelines specify: "The active tab should be encased in a thick 3px border-carbon box with accent-orange hard shadow offset."

**Current State** (`nav.tsx:45-60`):

```tsx
// Only font-weight changes - too subtle
className={cn(
  isActive
    ? "text-foreground font-medium"  // ← Weak differentiation
    : "text-muted-foreground"
)}
```

**Brand Spec Treatment**:

```tsx
// Active tab: thick border + hard shadow
className={cn(
  isActive && [
    "border-3 border-border-carbon",
    "shadow-[4px_4px_0_0_var(--color-accent-orange)]",
    "px-4 py-2",
    "font-bold uppercase",
  ]
)}
```

**Files**:

- `src/components/layout/nav.tsx:45-80` - Update active state styling
- `src/app/globals.css` - Add nav-specific shadow utilities if needed

**Acceptance**:

- [ ] Active nav item has visible 3px border
- [ ] Active nav item has orange offset shadow
- [ ] Clear visual hierarchy between active/inactive tabs
- [ ] Touch targets remain 44px+ for accessibility

---

**PHASE 5: Concrete Texture Application** (1h)

Brand guidelines: "BG Concrete should have subtle noise texture applied over it." Currently defined in CSS but only used on landing page.

**Current State**:

- `.concrete-texture` class exists in globals.css:182-194
- Uses SVG feTurbulence filter at 5% opacity
- Only applied to landing page hero

**Brand Spec**:

- Texture on main app background (not just landing)
- Texture on card surfaces for "unpolished concrete" feel
- Should bridge gap between dynamic hero image and flat UI

**Files**:

- `src/app/globals.css:108-120` - Apply texture to body
- `src/components/brutalist/BrutalistCard.tsx` - Enable `textured` variant by default
- `src/app/layout.tsx` - Add texture class to body wrapper

**Acceptance**:

- [ ] Subtle grain visible on main app background
- [ ] Texture at 3-5% opacity (not distracting)
- [ ] Cards have optional textured surface
- [ ] Visual connection between landing page and app interior

---

**PHASE 6: Component Consolidation** (3h)

Current state has parallel component systems that cause inconsistency:

- `BrutalistButton` vs `Button` (ui)
- `BrutalistCard` vs `Card` (ui)
- `BrutalistInput` vs `Input` (ui)

**Problem**: Devs reach for `ui/` components by habit, bypassing brutalist tokens.

**Solution**: Deprecate `ui/` variants, make brutalist components the default.

**Files**:

- `src/components/ui/button.tsx` - Re-export from brutalist/
- `src/components/ui/card.tsx` - Re-export from brutalist/
- `src/components/ui/input.tsx` - Re-export from brutalist/
- All consumers - Update imports (grep for `from "@/components/ui/button"`)

**Acceptance**:

- [ ] Single source of truth for each component
- [ ] All buttons use thick borders + hard shadows
- [ ] All cards use thick borders + optional texture
- [ ] No "soft" variants accessible without explicit opt-in

---

**PHASE 7: Momentum Visual Language** (2h)

Brand guidelines include "Momentum & Trajectory Motif" - ascending arrow graphics suggesting upward progress. Currently absent from implementation.

**Brand Spec**:

- Ascending arrow chevrons as decorative motif
- Used near progress indicators, streaks, PRs
- Suggests "gains" and "compounding progress"

**Implementation Options**:

1. SVG icon component `<MomentumArrows />`
2. CSS pseudo-element decorations
3. Background pattern on specific cards

**Files**:

- `src/components/icons/momentum-arrows.tsx` - New SVG component
- `src/components/analytics/streak-card.tsx` - Add motif near streak
- `src/components/dashboard/pr-celebration.tsx` - Add motif on PR

**Acceptance**:

- [ ] Momentum arrow motif visible on key progress indicators
- [ ] Uses accent-orange color
- [ ] Subtle, doesn't compete with data
- [ ] Appears on: streak display, PR celebrations, volume trends

---

**Summary**:

| Phase               | Effort | Priority | Impact                                  |
| ------------------- | ------ | -------- | --------------------------------------- |
| 1. Color Correction | 2h     | HIGH     | Foundation - all visuals depend on this |
| 2. Typography       | 3h     | MEDIUM   | Brand accuracy, may keep Bebas for perf |
| 3. Hard Shadows     | 2h     | HIGH     | Core brutalist differentiator           |
| 4. Navigation       | 2h     | HIGH     | User sees this constantly               |
| 5. Texture          | 1h     | LOW      | Polish, not critical                    |
| 6. Consolidation    | 3h     | MEDIUM   | Prevents future drift                   |
| 7. Momentum Motif   | 2h     | LOW      | Polish, brand flourish                  |

**Total Effort**: 15h (2-3 days focused work)
**Risk**: MEDIUM - Font change could affect layout, shadow changes affect interaction patterns
**Strategic Value**: HIGH - Design system is noted strength, this prevents erosion

**Acceptance Criteria (Overall)**:

- [ ] All colors match brand-guidelines.jpg exactly
- [ ] Typography uses Sora (or documented deviation)
- [ ] Hard shadows visible on default component states
- [ ] Navigation active state dramatically styled
- [ ] Concrete texture applied to app surfaces
- [ ] Single component system (no ui/ vs brutalist/ split)
- [ ] Momentum arrows on key progress elements
- [ ] Visual consistency score: Screenshot comparison passes design review

---

## Next (This Quarter, <3 months)

### [PRODUCT - EXISTENTIAL] Freemium Monetization

**Scope**: Premium tier with AI reports + advanced analytics
**Perspectives**: product-visionary
**Business Case**:

- Current: $0 revenue, AI costs $100/mo unsustainable
- Strong.app: $99/year for AI coaching
- Hevy: $90/year for analytics
- Conversion target: 10-15% of users → $12k/year at 1000 users
  **Implementation**:
- Free: 5 exercises, 30d history, manual logging, basic PRs/streaks
- Pro ($7-9/mo or $60-80/yr): Unlimited exercises, AI reports, progressive overload, recovery, CSV export
- Stripe integration, feature gates, billing UI
  **Effort**: 5d | **Strategic Value**: CRITICAL - enables sustainability
  **Acceptance**: Payment flow works, features properly gated, 100 paid users = OpenAI cost break-even

### [PRODUCT - EXISTENTIAL] PWA with Offline-First Architecture

**Scope**: Progressive Web App with offline queue
**Perspectives**: product-visionary, user-experience-advocate
**Competitive Gap**: Strong/Hevy have native apps + offline, Volume web-only
**Impact**: 60% fitness usage in gyms (spotty WiFi), users lose sets on network fail
**Implementation**:

- Service Worker for offline capability
- IndexedDB mutation queue (log sets offline)
- Background sync on network return
- Install prompt, push notifications
  **Effort**: 8-10d | **Strategic Value**: CRITICAL - required for gym use case
  **Moat**: Offline-first technical barrier, competitors need 12+ months
  **Acceptance**: Sets log offline, sync when online, no data loss

### [PRODUCT - EXISTENTIAL] Workout Templates & Routine Scheduling

**Scope**: Pre-built programs + custom routine scheduling
**Perspectives**: product-visionary, user-experience-advocate
**Onboarding Impact**: Blank slate anxiety → 30-40% first-week churn
**Competitive Parity**: Strong (templates), JEFIT (1000+ routines), Hevy (routine builder)
**Implementation**:

- Free templates: 5-10 beginner (Starting Strength, StrongLifts, PPL)
- Pro templates: 50+ intermediate/advanced
- Custom routines: Save as template, schedule Mon/Wed/Fri
- AI suggestions based on goals + equipment
  **Effort**: 10-12d | **Strategic Value**: CRITICAL - solves onboarding churn
  **Conversion Impact**: 30-40% reduction in first-week churn
  **Acceptance**: New user → template → first workout in <30s

### [Performance] Composite analytics query - 4x speedup

**Files**: convex/analytics.ts + 3 analytics widgets
**Perspectives**: performance-pathfinder
**Impact**: Analytics page 400-600ms → 100-150ms (4 separate queries → 1 aggregated query)
**Fix**: Create `getAnalyticsDashboard` that fetches sets once, computes all metrics, returns composite
**Effort**: 3h | **Speedup**: 4x on Analytics page
**Acceptance**: Single DB round-trip, payload 75% smaller

### ~~[Performance] PR detection O(n²) → O(n) optimization~~ ✅ DONE (PR #56)

**Status**: Resolved in PR #56 analytics overhaul
**Fix Applied**: Refactored `calculateRecentPRs` to O(N log N) - process sets chronologically per exercise, maintaining running max values instead of filtering previousSets each time.

### [Infrastructure] Implement Pino structured logging

**Files**: lib/logger.ts (new), migrate 30+ console.log calls
**Perspectives**: architecture-guardian, maintainability-maven
**Gap**: No correlation IDs, log levels, JSON formatting, context enrichment
**Impact**: Production debugging 10x faster with structured logs
**Fix**: Create Pino logger with PII redaction, migrate console.log/warn/error
**Effort**: 4h | **Impact**: HIGH
**Acceptance**: Queryable JSON logs, correlation IDs, zero console.log in source

### [Infrastructure] Raise coverage thresholds

**File**: vitest.config.ts:27-32
**Perspectives**: architecture-guardian
**Current**: lines 30%, functions 20%, branches 10% (TOO LOW - allows massive regression)
**Fix**: lines 80%, functions 70%, branches 60%
**Effort**: 30m config + fix failing coverage | **Impact**: Prevents coverage decay
**Acceptance**: CI enforces realistic thresholds

### [Product] Rest Timer with AI Suggestions

**Scope**: Smart rest timer with auto-start + AI duration
**Perspectives**: product-visionary, user-experience-advocate
**Differentiation**: Strong/Hevy have manual timers, Volume has AI-suggested rest
**Implementation**:

- Auto-starts after set
- AI suggests: Heavy compound 3-5min, accessory 60-90s, bodyweight 30-60s
- Learns from user patterns
- Push notifications when timer ends
  **Effort**: 3-4d | **Strategic Value**: HIGH - unique differentiator
  **Engagement Impact**: 5-10min session → 30-45min (app becomes workout companion), +40% DAU
  **Acceptance**: Timer auto-starts, AI suggestions accurate, notifications work

### [Product] RPE + Notes on Sets

**Scope**: Optional RPE (1-10 scale) + freeform notes per set
**Perspectives**: product-visionary, user-experience-advocate
**Competitive Parity**: Strong, Hevy, JEFIT all have RPE + notes (table stakes)
**Implementation**:

- Schema: Add `rpe` (optional number), `notes` (optional string) to sets
- UI: Inline RPE picker, notes textarea in QuickLogForm
- AI enrichment: "Squat RPE 9+ for 3 weeks - consider deload"
  **Effort**: 1-2d | **Strategic Value**: HIGH
  **Retention**: Power users can't migrate without RPE data
  **Acceptance**: Sets optionally include RPE + notes, AI uses in analysis

### [Product] Wearable Sync (Apple Health, Google Fit)

**Scope**: Bidirectional sync with health platforms
**Perspectives**: product-visionary
**Gap**: No ecosystem integration, can't participate in Apple Health
**Implementation**:

- Export: Push workouts, calories, active minutes to Health
- Import: Heart rate, sleep, step count
- AI enrichment: "6.5h sleep avg → consider rest day before PRs"
  **Effort**: 6-8d (HealthKit 4d, Google Fit 4d) | **Strategic Value**: HIGH
  **TAM Expansion**: Health-conscious users (30% of fitness market)
  **Acceptance**: Workouts sync to Health, sleep data imports

### [Product] Social Sharing - Workout Cards

**Scope**: Export workout as shareable brutalist image
**Perspectives**: product-visionary
**Viral Mechanics**: Strava 40% signups from shares, Duolingo streak sharing top growth channel
**Implementation**:

- Server-side image gen (Satori): Exercise volume bars, PRs in danger-red, streak, "Tracked with Volume" branding
- One-tap share to Instagram/Twitter
  **Effort**: 4-5d | **Strategic Value**: MEDIUM-HIGH
  **Conversion**: 3-5% of shares → signups (industry benchmark), $0 CAC
  **Acceptance**: Share generates beautiful card, branding visible, social meta tags work

### [UX] Offline support for workout logging

**Scope**: Service Worker cache + optimistic queue
**Perspectives**: user-experience-advocate
**Impact**: Gym basement WiFi fails → mutation fails → no feedback, data loss confusion
**Fix**: Detect offline, queue mutations, show "saved offline, will sync" toast
**Effort**: 8h | **Value**: Table stakes for gym apps
**Acceptance**: Sets log offline, sync when online, user informed of status

### [UX] Add undo to all delete operations

**Files**: set-card.tsx:51, exercise-set-group.tsx:65, chronological-set-history.tsx:76
**Perspectives**: user-experience-advocate
**Impact**: QuickLogForm has undo toast, other components don't. Accidental delete = data loss.
**Fix**: Add undo toast pattern to 3 delete locations
**Effort**: 2h | **Value**: HIGH
**Acceptance**: All deletes show undo toast for 5s recovery window

### [Accessibility] Remove empty heading in footer

**File**: src/components/layout/footer.tsx:56-63
**Perspectives**: user-experience-advocate
**Source**: PR #51 review (coderabbitai)
**Impact**: Empty `<h3>` with `&nbsp;` confuses screen readers that announce heading with no label.
**Fix**: Remove decorative heading or use `aria-hidden="true"` wrapper
**Effort**: 10m | **Value**: A11y compliance
**Acceptance**: Screen readers don't announce empty heading

### [Architecture] Extract header height to layout-constants.ts

**File**: src/components/layout/page-layout.tsx:54
**Perspectives**: maintainability-maven
**Source**: PR #51 review (coderabbitai)
**Impact**: 64px calculation hardcoded, risks divergence from `h-16` class in nav.tsx
**Fix**: Add `nav.height: "h-16"` to LAYOUT in layout-constants.ts, reference in page-layout.tsx
**Effort**: 15m | **Value**: Single source of truth
**Acceptance**: Header height defined once, used everywhere

### [UX] Remove redundant focus call in ExerciseSelectorDialog

**File**: src/components/dashboard/quick-log-form.tsx:228-263
**Perspectives**: maintainability-maven
**Source**: PR #51 review (coderabbitai)
**Impact**: Both `onOpenChange` and `onSelect` trigger `focusElement`, causing redundant focus calls
**Fix**: Remove focus call from `onOpenChange`, rely solely on `onSelect` delayed focus
**Effort**: 10m | **Value**: Cleaner code, more predictable behavior
**Acceptance**: Focus fires once per selection, not twice

### [Architecture] Pass isMobile prop consistently to GroupedSetHistory

**File**: src/components/dashboard/Dashboard.tsx:257-264
**Perspectives**: maintainability-maven
**Source**: PR #51 review (coderabbitai)
**Impact**: Mobile path passes `isMobile={isMobile}`, desktop path omits it (relies on default)
**Fix**: Explicitly pass `isMobile={false}` in desktop render path
**Effort**: 5m | **Value**: Consistency, explicit over implicit
**Acceptance**: Both render paths explicitly pass isMobile prop

### [Cleanup] Clear PR flash timeout on unmount

**File**: src/hooks/useQuickLogForm.ts:123-130
**Perspectives**: maintainability-maven
**Source**: PR #51 review (coderabbitai)
**Impact**: setTimeout for PR flash class removal not cleared on component unmount (minor memory leak)
**Fix**: Use ref to track and clear timeout in cleanup
**Effort**: 15m | **Value**: Proper cleanup hygiene
**Acceptance**: No orphaned timeouts after unmount

### [Testing] Complete background toast timeout test

**File**: src/hooks/useQuickLogForm.test.ts:310-353
**Perspectives**: maintainability-maven
**Source**: PR #51 review (coderabbitai)
**Impact**: Skipped test for "background toast after 10s timeout" behavior
**Fix**: Implement test now that hook returns early on timeout (test should pass with new behavior)
**Effort**: 30m | **Value**: Test coverage for critical timeout path
**Acceptance**: Test unskipped and passing

### [UX] Built-in timer for duration exercises

**File**: src/components/dashboard/duration-input.tsx
**Perspectives**: user-experience-advocate
**Impact**: Plank users switch to timer app, lose count, frustrated
**Fix**: Add live timer with Start/Stop, auto-fills duration on stop
**Effort**: 3h | **Value**: Users stay in-app
**Acceptance**: Timer counts up, fills duration input, no app switching

### [UX] Bulk delete for sets

**File**: src/app/(app)/history/page.tsx
**Perspectives**: user-experience-advocate
**Impact**: 10 warmup sets logged by mistake → 10 individual deletes (50 clicks)
**Fix**: Checkbox selection mode + bulk delete button
**Effort**: 3h | **Value**: 50 clicks → 3 clicks
**Acceptance**: Select multiple sets, delete in batch with single confirmation

### [Design System] Migrate to OKLCH color space

**Files**: globals.css, design-tokens.ts, tailwind.config.ts
**Perspectives**: design-systems-architect
**Current**: HSL color space (perceptual non-uniformity, unpredictable tints/shades)
**Fix**: OKLCH (perceptually uniform, easier contrast, simpler shade generation)
**Effort**: 3h | **Impact**: Better color foundation
**Browser Support**: 95%+ (Chrome 111+, Safari 15.4+, Firefox 113+)
**Acceptance**: 9 core colors in OKLCH, WCAG contrast validated

### [Maintainability] Create error handling ADR

**Scope**: Standardize 3 different error patterns
**Perspectives**: maintainability-maven
**Impact**: Devs unsure when to throw vs handleMutationError vs reportError
**Fix**: ADR documenting: Backend throws, Frontend uses handleMutationError, Critical paths reportError + throw
**Effort**: 1h ADR + 2h consistency fixes | **Impact**: Uniform error handling
**Acceptance**: docs/adr/003-error-handling.md exists, examples updated

### [Testing] Add type-level tests for hooks

**File**: src/hooks/useLastSet.test-d.ts (new)
**Perspectives**: maintainability-maven
**Impact**: useLastSet uses `any`, no compile-time type safety verification
**Fix**: Add `tsd` tests verifying return types, autocomplete works
**Effort**: 30m | **Impact**: Prevent type safety regression
**Acceptance**: Type-level tests catch `any` violations

### [Docs] Add API contract documentation

**Files**: convex/exercises.ts:75, convex/sets.ts, src/lib/pr-detection.ts
**Perspectives**: maintainability-maven
**Impact**: Missing error conditions, side effects, edge cases (auto-restore, case-insensitive duplicate)
**Fix**: Comprehensive JSDoc with examples for 20+ public functions
**Effort**: 3h | **Impact**: CRITICAL - self-documenting API
**Acceptance**: All exported functions have JSDoc with error conditions + examples

---

## Soon (Exploring, 3-6 months)

- **[Product] Coaching Dashboard (B2B)** - Coach view for trainers managing 10-50 clients. $50-200/mo market, opens B2B revenue (10x ARPU). Effort: 20-25d.
- **[Product] Supersets & Circuit Training** - Link exercises, track AMRAP circuits. Serves CrossFit/functional fitness (20% market). Effort: 3-4d.
- **[Performance] Frontend bundle splitting** - Dynamic import recharts/framer-motion. 150-200KB bundle reduction. Effort: 2h.
- **[Performance] Move exercise sorting to backend** - `sortExercisesByRecency` scans all sets on render. Effort: 1h.
- **[Architecture] Domain service for PR detection** - Pure module for shared logic, deterministic tests. Effort: 3h.
- **[Architecture] Decompose crons.ts** - 480 lines → 5 focused modules (daily/weekly/monthly/timezone/index). Effort: 3h.
- **[Infrastructure] Staging environment** - Vercel staging + Convex staging, mirror prod domain patterns. Effort: 1.5d, Cost: ~$20/mo.
- **[Infrastructure] Add Gitleaks pre-commit hook** - Secrets scanning, prevent API key commits. Effort: 30m.
- **[Infrastructure] Add Changesets** - Changelog automation, semantic versioning, release tracking. Effort: 1h.
- **[Infrastructure] CSP hardening** - Investigate Convex SDK eval requirement, implement nonce-based CSP. Effort: 6h.
- **[Testing] E2E tests for critical flows** - Playwright smoke tests (auth, log workout, delete set). Effort: 4h.
- **[Testing] Visual regression baseline** - Playwright screenshots, catch unintended UI changes. Effort: 3h.
- **[Testing] Accessibility audit with axe** - axe-playwright, WCAG compliance, keyboard nav. Effort: 2h.
- **[Design System] Storybook setup** - Visual component docs, variant exploration. Effort: 1d + 2h per component.
- **[Docs] Terminology standardization** - Document Set vs Workout vs Session in domain model. Effort: 1.5h.
- **[UX] Search/filter in exercise list** - Power users with 50+ exercises need search. Effort: 1h.
- **[UX] Keyboard shortcuts documentation** - Help modal showing Enter/Escape/Tab shortcuts. Effort: 2h.

---

## Now (Sprint-Ready, <2 weeks)

### [Testing] Add unit tests for quality gates scripts

**Files**: scripts/verify-coverage.js, test coverage verification
**Perspectives**: maintainability-maven
**Gap**: Quality gates scripts lack test coverage for edge cases and error handling
**Impact**: Quality gate failures difficult to debug, potential regressions
**Fix**: Add unit tests for threshold enforcement, missing file handling, error conditions
**Effort**: 2h | **Impact**: High confidence in quality gates
**Acceptance**: All quality gate scripts have comprehensive test coverage

### [Testing] Add unit tests for Lefthook configuration

**Files**: .lefthook.yml, validate hook configuration
**Perspectives**: architecture-guardian
**Gap**: Lefthook YAML configuration lacks validation tests for syntax and command validity
**Impact**: Configuration errors only discovered at runtime, breaking developer workflow
**Fix**: Add schema validation tests, hook execution tests, command validation
**Effort**: 2h | **Impact**: Prevent configuration-related workflow interruptions
**Acceptance**: Lefthook configuration validated before deployment

### [Documentation] Document quality gates bypass procedures

**Files**: AGENTS.md, README.md
**Perspectives**: architecture-guardian
**Gap**: No documented procedure for bypassing quality gates in emergencies
**Impact**: Teams blocked from urgent fixes when quality gates fail unexpectedly
**Fix**: Document SKIP_QUALITY_GATES environment variable and usage guidelines
**Effort**: 1h | **Impact**: Emergency response capability
**Acceptance**: Clear bypass documentation in AGENTS.md

### [Performance] Monitor quality gates performance

**Files**: AGENTS.md
**Perspectives**: performance-pathfinder
**Gap**: No baseline metrics for quality gates execution time or performance monitoring
**Impact**: Cannot detect performance regressions in quality gates
**Fix**: Document performance targets and monitoring procedures
**Effort**: 1h | **Impact**: Detect and prevent performance issues
**Acceptance**: Performance monitoring for all quality gates

## Now (Sprint-Ready, <2 weeks)

### [CI] Document Git 2.52.0 compatibility workarounds

**Files**: .github/docs/CI-DEBUGGING.md (new)
**Perspectives**: architecture-guardian, performance-pathfinder
**Gap**: GitHub Actions Git 2.52.0 has known incompatibilities causing intermittent checkout failures
**Impact**: CI reliability issues, developer time waste on debugging
**Fix**: Document comprehensive workarounds and troubleshooting steps
**Effort**: 1h | **Impact**: Enables faster problem resolution for team
**Acceptance**: Team has clear guidance for Git compatibility issues

- **[Platform] Native Mobile Apps** - React Native or native iOS/Android if PWA insufficient
- **[Platform] Apple Watch / Wear OS** - Log sets without phone, 2x engagement
- **[Innovation] Video Form Check with AI** - Computer vision pose estimation, form feedback. Premium $20/mo tier.
- **[Integration] Apple Health / Google Fit full sync** - Bidirectional data portability
- **[Product] Social features (Full)** - Friends, feeds, challenges (beyond just sharing)
- **[Product] Superset/circuit support** - Link exercises for compound movements
- **[Innovation] Predictive program optimization** - Auto-adjust volume based on recovery AI

---

## Learnings

**From 2025-11-26 comprehensive grooming (8 perspectives):**

- **Type safety erosion pattern**: 40+ `any` instances concentrated in Convex internal API calls. Fixable with proper type imports, but shows tactical debt from rushing features. Need strategic investment in type infrastructure.

- **Deployment confidence gap**: Missing Lefthook + Pino = can't deploy Friday 5pm. Infrastructure gaps are CRITICAL blockers, not nice-to-have polish. Prioritize deployment confidence over feature velocity.

- **Deep module excellence**: analytics.ts (478 lines, 4 exports), sentry.ts (402 lines, 1 export) are textbook Ousterhout patterns. Use as templates for new abstractions. Simple interface + complex implementation = high module value.

- **Monetization is existential**: $0 revenue, $100/mo AI costs unsustainable. Product quality doesn't matter if business model broken. Freemium tier NOW, not "later when we have more users."

- **Offline-first is table stakes**: 60% gym usage, spotty WiFi. Can't compete with Strong/Hevy without offline mode. PWA architecture required for core use case, not platform expansion.

- **Design system maturity**: Brutalist design system is best-in-class (200+ lines JSDoc, contextual token naming, zero hardcoded values). Strong visual identity differentiates from generic SaaS. Preserve at all costs.

- **Security severity prioritization**: Rate limiting > dependency updates > test endpoint gating. Cost-based DoS (AI spam) more critical than theoretical CVEs in dev dependencies. Prioritize business impact over CVSS scores.

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
