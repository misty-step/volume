# Mobile-First UX Redesign

## Executive Summary

Volume's UI is currently web-optimized but used primarily on mobile in gym environments. This spec defines a mobile-first redesign focusing on the Today page and set logging flow—the core workout tracking experience. The goal: make logging a set take **1 tap** for repeats, **3-5 taps** for adjustments, support one-handed operation, and feel native on iPhone while preserving Volume's brutalist visual identity.

**Success criteria**: Users can log a set one-handed in under 5 seconds. Form completion rate increases. No accessibility regressions.

**Core Insight** (Jobs review): The real problem isn't the keyboard—it's that the form starts empty. 90% of sets are within ±2 reps of the last set. **Pre-fill the form with last set values by default.** This single change delivers 75% of the improvement.

---

## User Context

**Who**: Fitness enthusiasts tracking workouts at the gym
**Problems being solved**:

- Current form requires keyboard entry (slow, two-handed)
- Labels too small to read in bright gym lighting
- Exercise selector popover awkward on small screens
- No quick-repeat patterns for logging multiple sets of same exercise
- Delete requires precision tapping (no swipe gesture)

**Measurable benefits**:

- Reduce time-to-log from ~15s to <5s
- Support one-handed operation (thumb-zone)
- Increase form completion rate by reducing friction

---

## Requirements

### Functional Requirements

**F0. Smart Defaults: Pre-Fill Form with Last Set Values** ⭐ HIGHEST PRIORITY

- When exercise is selected, auto-populate reps and weight from last set of that exercise
- Form ready to submit immediately (1 tap to log identical set)
- Steppers allow quick adjustments from baseline
- Context bar shows: "Last: 135 lbs × 10 reps • 2 min ago"

**F1. Stepper Controls for Numeric Inputs**

- Add +/- buttons to reps input (+1/-1) and weight input (smart step based on weight)
- Steppers must be 48px minimum tap targets
- Weight step logic: 0-50 lbs = ±2.5, 50-150 lbs = ±5, 150+ lbs = ±10
- ~~Long-press for rapid increment~~ REMOVED (hidden gesture, adds complexity)

**F2. Exercise Selector Dialog (Mobile)**

- Use Radix Dialog on mobile (not custom bottom sheet—use existing primitive)
- Full-screen slide-up animation with brutalist styling
- Search field auto-focused when dialog opens
- Recently used exercises at top (already implemented)
- Desktop: Keep existing Popover (less intrusive)

**F3. Thumb-Zone Layout Optimization**

- Primary action (Log Set button) sticky to bottom of viewport on mobile
- Submit button full-width, minimum 56px height (`size="lg"` = 64px)
- Respects iOS safe area (`pb-safe` utility)
- Mode toggle uses `size="default"` (48px) not `size="sm"` (40px)

**F4. Animated Feedback on Submit** (Delight moment)

- After logging set, new set card animates from form into history list
- Spring physics (framer-motion) for alive feel
- Visual confirmation that set was logged

### Removed from Scope (Per Jobs Review)

- ~~Swipe-to-delete~~ — Complex gesture, conflicts with scroll, existing delete button works
- ~~Haptic feedback~~ — Limited iOS Safari API, inconsistent across devices
- ~~Quick repeat button~~ — Pre-filled form (F0) solves this more elegantly
- ~~Long-press steppers~~ — Hidden gesture users won't discover
- ~~Recent exercise highlighting~~ — Sort order IS the UI

### Non-Functional Requirements

**NF1. Performance**

- Dialog animation at 60fps (framer-motion spring)
- No layout shift during stepper interactions
- Pre-fill happens instantly (local state, no network wait)

**NF2. Accessibility** (Per UX Advocate Review)

- All touch targets minimum 48px (iOS HIG)
- Screen reader announces stepper value changes via `aria-live="polite"`
- Focus trap for mobile dialog (use Radix Dialog built-in)
- Keyboard: Escape closes dialog, Tab navigates within
- Delete undo toast extended to 10s (was 3s—too short during rapid logging)

**NF3. Error Handling** (Per UX Advocate Review)

- Network timeout: 10s limit, then "Saving in background" toast
- Stepper min/max: Clear error message ("Max 1000 reps reached")
- Empty search: Show "Create [query]" button (recovery path)
- Offline indicator: Show status when network unavailable

**NF4. Maintainability**

- Stepper component reusable across app (`src/components/brutalist/Stepper.tsx`)
- Use existing Radix Dialog (no custom BottomSheet abstraction)
- Enhance SetCard directly for any future gestures (no wrapper components)

---

## Architecture Decision

### Selected Approach: Component Enhancement

Enhance existing components with mobile-specific variants rather than rebuilding. Use responsive Tailwind classes and conditional rendering based on viewport.

**Rationale**:

- Preserves existing functionality (zero regression risk)
- Allows incremental rollout (feature flag per component)
- Maintains brutalist aesthetic with mobile adaptations
- Minimizes code duplication

### Alternatives Considered

| Approach                  | Value  | Simplicity | Risk | Why Not                                              |
| ------------------------- | ------ | ---------- | ---- | ---------------------------------------------------- |
| CSS-only responsive       | Medium | High       | Low  | Doesn't solve keyboard-required inputs or popover UX |
| Full redesign             | High   | Low        | High | Overkill for MVP; high regression risk               |
| **Component enhancement** | High   | Medium     | Low  | ✅ Best balance of value and safety                  |

### Module Boundaries

**New Components**:

- `Stepper` — Reusable +/- control with configurable step, min, max, aria-live

**Modified Components**:

- `QuickLogForm` — Integrate steppers, pre-fill logic, responsive dialog, sticky submit
- `useLastSet` hook — Already exists, extend to auto-populate form values

**No New Abstractions** (Per Design Systems Review):

- ~~BottomSheet~~ — Use Radix Dialog with responsive styles
- ~~SwipeableSetCard~~ — Enhance SetCard if gestures needed later
- ~~size="xl" button~~ — Use existing `size="lg"` (64px, exceeds 56px requirement)

**Hidden Complexity** (Stepper Component):

- Smart step calculation based on current weight value
- Min/max bounds with user-facing error messages
- Screen reader value announcements (`aria-live`)
- Disabled state during form submission

---

## Dependencies & Assumptions

**Dependencies**:

- `framer-motion` (already installed) — gesture animations, bottom sheet transitions
- iOS Safari viewport behavior — tested on iPhone SE (375px), iPhone 14 (390px), iPhone 14 Pro Max (430px)

**Assumptions**:

- Users have modern iPhones (iOS 15+, 375px+ width)
- Gym lighting is bright (high contrast text needed)
- Users may be sweaty/distracted (large tap targets, forgiving gestures)
- Weight increments vary by unit: lbs (+5/-5), kg (+2.5/-2.5)

**Environment**:

- No new backend changes required
- No new dependencies (framer-motion already available)
- Design tokens already support mobile (just underutilized)

---

## Implementation Phases

### Phase 0: UX Foundation (BLOCKING) — 2-3 days

Per UX Advocate review, these are required before Phase 1:

1. **Undo toast duration** — Extend delete undo from 3s to 10s
2. **Network timeout handling** — 10s timeout + "Saving in background" toast
3. **Loading state patterns** — Establish patterns for mutation pending states
4. **Accessibility primitives** — aria-live regions, focus trap (Radix built-in)

**Deliverable**: Foundation that prevents user frustration

### Phase 1: Smart Defaults + Steppers (MVP) — 3-4 days

1. **Pre-fill form** — Auto-populate reps/weight from last set when exercise selected
2. **Stepper component** — Create reusable numeric stepper with +/- buttons
3. **Integrate steppers** — Add to QuickLogForm reps and weight inputs
4. **Smart weight steps** — 0-50 lbs: ±2.5, 50-150: ±5, 150+: ±10
5. **Enlarge form labels** — `text-xs` → `text-sm` for legibility
6. **Touch targets** — Mode toggle to `size="default"` (48px)

**Deliverable**: 1-tap logging for repeat sets, 3-5 taps for adjustments

### Phase 2: Thumb-Zone + Polish — 2-3 days

1. **Sticky submit** — Anchor Log Set button to bottom of viewport on mobile
2. **Responsive exercise selector** — Dialog on mobile, Popover on desktop
3. **Animated feedback** — Set card springs into history list after submit
4. **Error states** — Stepper bounds, empty search recovery

**Deliverable**: Native-feeling mobile experience with delight moments

### Removed from Roadmap (Per Expert Review)

- ~~Phase 3: Gestures & Polish~~ — Swipe-to-delete, haptics, landscape deferred
- These can be added later if metrics show user demand

---

## Risks & Mitigation

| Risk                          | Likelihood | Impact | Mitigation                                                     |
| ----------------------------- | ---------- | ------ | -------------------------------------------------------------- |
| Steppers feel non-native      | Medium     | Medium | Use iOS-style design (+/− buttons), test with 5 real gym users |
| Pre-fill causes wrong logging | Low        | High   | Clear "Last: X" context bar, easy to adjust via steppers       |
| Dialog focus trap issues      | Low        | High   | Use Radix Dialog primitives (proven), test with VoiceOver      |
| Brutalist aesthetic lost      | Low        | High   | Keep 3px borders, uppercase text, only adapt padding/spacing   |
| Slow network during gym use   | High       | High   | 10s timeout + "Saving in background" (Phase 0 addresses)       |

---

## Key Decisions

### Decision 1: Pre-Fill Form vs Empty Form (MOST IMPORTANT)

**What**: Auto-populate reps and weight from last set when exercise is selected
**Alternatives**: Empty form (current), quick-repeat button, number pad
**Rationale**: 90% of sets are within ±2 reps of last set. Pre-fill makes 1-tap logging possible.
**Tradeoffs**: Risk of logging wrong values (mitigated by clear "Last:" context bar)

### Decision 2: Steppers vs Keyboard

**What**: Use +/- steppers instead of numeric keyboard for adjustments
**Alternatives**: Custom number pad, native keyboard with done button
**Rationale**: Steppers are one-handed, don't obscure form, support quick adjustments
**Tradeoffs**: Less precise for unusual weights (direct input still available)

### Decision 3: Radix Dialog vs Custom Bottom Sheet

**What**: Use existing Radix Dialog with responsive styles (not custom component)
**Alternatives**: Custom BottomSheet component, third-party sheet library
**Rationale**: Dialog already handles focus trap, escape key, backdrop—proven primitives
**Tradeoffs**: Slightly less "native" feel than iOS sheet (acceptable for PWA)

---

## Test Scenarios

### Pre-Fill Form (F0)

- [ ] Selecting exercise auto-populates reps from last set
- [ ] Selecting exercise auto-populates weight from last set
- [ ] Context bar shows "Last: X lbs × Y reps • Z ago"
- [ ] Form submittable with 1 tap if repeating exact set
- [ ] Pre-fill works correctly for duration-based exercises
- [ ] First exercise (no last set) shows empty form with steppers at 0

### Stepper Component

- [ ] Tap + increments value by step amount
- [ ] Tap - decrements value by step amount
- [ ] Weight step smart: ±2.5 (0-50), ±5 (50-150), ±10 (150+)
- [ ] Value cannot go below min (shows error message)
- [ ] Value cannot exceed max (shows "Max X reached")
- [ ] Stepper disabled when form is submitting
- [ ] Screen reader announces new value on change (`aria-live`)

### Exercise Selector Dialog (Mobile)

- [ ] Opens on exercise selector tap (mobile viewport only)
- [ ] Search field auto-focused
- [ ] Recently used exercises appear first
- [ ] Selecting exercise closes dialog + pre-fills form
- [ ] Escape key closes dialog
- [ ] Backdrop click closes dialog
- [ ] Focus trapped within dialog while open
- [ ] Empty search shows "Create [query]" button

### Error Handling (Phase 0)

- [ ] Network timeout after 10s shows "Saving in background" toast
- [ ] Delete undo toast lasts 10s (not 3s)
- [ ] Stepper shows clear error at min/max bounds
- [ ] Form submit button shows loading state during mutation

### Quick Log Flow (E2E)

- [ ] **Repeat set**: Select exercise → 1 tap submit (form pre-filled)
- [ ] **Adjust set**: Select exercise → 1-3 stepper taps → submit = 3-5 total taps
- [ ] **New exercise**: Open dialog → search → select → adjust → submit
- [ ] Total: 1-5 taps for typical logging, no keyboard required

### Responsive Behavior

- [ ] iPhone SE (375px): Single column, full-width buttons, Dialog selector
- [ ] iPhone 14 (390px): Same as SE
- [ ] iPhone Pro Max (430px): Same as SE
- [ ] iPad/Desktop: Popover selector (existing behavior), keyboard input option

---

## Visual Specifications

### Touch Targets (iOS HIG Compliant)

- Stepper buttons: 48×48px minimum (h-12 w-12)
- Submit button: 64px height (`size="lg"`), full width on mobile
- Mode toggle buttons: 48px height (`size="default"`, not `size="sm"`)
- Form inputs: 48px height (h-12, existing)

### Spacing (Mobile-Adapted)

- Card padding: `p-4` on mobile (was `p-6`)
- Form gap: `gap-3` on mobile (was `gap-4`)
- Page bottom padding: `pb-20` (was `pb-24`)
- Section spacing: `space-y-6` on mobile (was `space-y-10`)

### Typography (Legibility)

- Form labels: `text-sm` everywhere (was `text-xs`) — better for all viewports
- Stepper value display: `text-2xl font-mono tabular-nums`
- Button text: `text-base` minimum

### Brutalist Adaptations (Mobile)

- Border width: Keep 3px (brand identity)
- Uppercase text: Keep (brand identity)
- Corner radius: Keep 2px (brand identity)
- Shadows: Keep 4px offset (simpler—no mobile variant needed per Design Systems review)

---

## Out of Scope

- **Swipe gestures** — Deferred; existing delete button works, adds complexity
- **Haptic feedback** — iOS Safari API limited, inconsistent results
- **Landscape mode** — Edge case; can add later if metrics warrant
- **Android-specific patterns** — iPhone-first per requirements
- **Offline support** — Separate initiative in BACKLOG (marked EXISTENTIAL)
- **Pull-to-refresh** — Not needed for Today page
- **Workout templates/routines** — Separate feature

---

## Expert Review Summary

### Jobs (Simplicity & Craft)

- **Core insight**: Pre-fill form with last set values (biggest win, not in original spec)
- **Cut**: Long-press, swipe, haptics, quick-repeat button, landscape
- **Add**: Animated feedback on submit (delight moment)
- **Grade**: B+ → A with pre-fill pattern

### UX Advocate (Error & Edge Cases)

- **21 gaps identified** — Mostly error handling and loading states
- **Critical**: Phase 0 foundation required before Phase 1
- **Key additions**: 10s undo toast, network timeout handling, aria-live

### Design Systems Architect (Token Alignment)

- **85% aligned** with existing tokens
- **Key fix**: Use `size="default"` (48px) not `size="sm"` (40px)
- **Simplification**: Use Radix Dialog, don't create BottomSheet abstraction
