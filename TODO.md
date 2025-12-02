# TODO: Mobile-First UX Redesign

## Context

- Architecture: Component Enhancement with Smart Defaults (DESIGN.md)
- Key Files: `quick-log-form.tsx`, `grouped-set-history.tsx`, hooks/
- Patterns: Vitest + Testing Library, Convex mocks, brutalist components
- Test Setup: `src/test/utils.tsx` for render, mock `convex/react` globally

---

## Phase 0: UX Foundation

- [x] Extend undo toast duration to 10 seconds

  ```
  Files: src/hooks/useQuickLogForm.ts:116
  Approach: Add duration: 10000 to toast.success() options
  Success: Toast visible for 10s after logging set
  Test: Manual QA (toast timing)
  Dependencies: None
  Time: 15min
  ```

- [x] Add network timeout with "Saving in background" toast
  ```
  Files: src/hooks/useQuickLogForm.ts
  Approach: Wrap logSet mutation with Promise.race + 10s timeout
  Pseudocode: See DESIGN.md Error Handling Strategy
  Success: After 10s timeout, show info toast and continue mutation in background
  Test: Add test case simulating slow mutation (mock delay)
  Dependencies: None
  Time: 30min
  ```

---

## Phase 1: Smart Defaults + Steppers

- [x] Create useMobileViewport hook

  ```
  Files:
    - src/hooks/useMobileViewport.ts (new)
    - src/hooks/useMobileViewport.test.ts (new)
  Approach: SSR-safe matchMedia listener, default 768px breakpoint
  Pseudocode: See DESIGN.md Module: useMobileViewport
  Success: Returns false on server, true on mobile viewports
  Test:
    - Returns false when window undefined (SSR)
    - Returns true for 375px viewport
    - Returns false for 1024px viewport
    - Updates on resize
  Dependencies: None
  Time: 30min
  ```

- [x] Create Stepper component

  ```
  Files:
    - src/components/brutalist/Stepper.tsx (new)
    - src/components/brutalist/Stepper.test.tsx (new)
    - src/components/brutalist/index.ts (modify: add export)
  Approach: BrutalistButton for +/-, aria-live for announcements
  Interface: See DESIGN.md Module: Stepper
  Pseudocode: See DESIGN.md Stepper Interaction
  Success:
    - 48×48px tap targets (h-12 w-12)
    - Smart step via getStep prop
    - aria-live announces value changes
    - Disabled state works
  Test (90% coverage):
    - Increments/decrements by step
    - Smart weight steps: ±2.5/<50, ±5/50-150, ±10/>150
    - Bounds: prevents going below min, above max
    - Announces to screen readers
    - Disabled buttons when disabled prop
  Dependencies: BrutalistButton
  Time: 1.5hr
  ```

- [x] Add pre-fill logic directly in QuickLogForm

  ```
  Files: src/components/dashboard/quick-log-form.tsx
  Approach: Add useEffect that populates form from lastSet when exerciseId changes
  Rationale: Only one use case—don't extract hook until second form needs prefill (grug wisdom)
  Pseudocode:
    useEffect(() => {
      if (!selectedExerciseId || !lastSet) return
      // Guard: don't overwrite user input
      if (form.getValues('reps') || form.getValues('weight')) return
      form.setValue('reps', lastSet.reps)
      form.setValue('weight', lastSet.weight)
      // Handle duration mode
    }, [selectedExerciseId, lastSet])
  Success: Form auto-populates reps/weight from last set when exercise selected
  Test: Add test case in quick-log-form.test.tsx for pre-fill behavior
  Dependencies: useLastSet (already used in component)
  Time: 30min
  ```

- [x] Integrate Stepper into QuickLogForm (reps input)

  ```
  Files: src/components/dashboard/quick-log-form.tsx:383-417
  Approach: Replace BrutalistInput[type="number"] with Stepper
  Success:
    - Reps input uses Stepper with +1/-1 step
    - min=1, max=1000
    - Keyboard Enter still advances to weight
  Test: Existing tests pass + new test for stepper interaction
  Dependencies: Stepper component
  Time: 30min
  ```

- [x] Integrate Stepper into QuickLogForm (weight input)

  ```
  Files: src/components/dashboard/quick-log-form.tsx:450-484
  Approach: Replace BrutalistInput with Stepper + getWeightStep function
  Success:
    - Weight input uses Stepper with smart step
    - Step varies: ±2.5 (<50), ±5 (50-150), ±10 (>150)
    - min=0, max=2000
  Test: Add test for weight step logic
  Dependencies: Stepper component
  Time: 30min
  ```

- [x] Update form label typography

  ```
  Files: src/components/dashboard/quick-log-form.tsx:284, 389, 424, 455
  Approach: Change text-xs to text-sm on FormLabel elements
  Success: Labels more legible (14px instead of 12px)
  Test: Visual regression (manual)
  Dependencies: None
  Time: 15min
  ```

- [x] Update mode toggle button size
  ```
  Files: src/components/dashboard/quick-log-form.tsx:241-265
  Approach: Change size="sm" to size="default" on Reps/Duration buttons
  Success: Mode toggle buttons are 48px tall (iOS HIG compliant)
  Test: Visual regression (manual)
  Dependencies: None
  Time: 15min
  ```

---

## Phase 2: Thumb-Zone + Polish

- [x] Create ExerciseSelectorDialog component

  ```
  Files:
    - src/components/dashboard/exercise-selector-dialog.tsx (new)
    - src/components/dashboard/exercise-selector-dialog.test.tsx (new)
  Approach: useMobileViewport to switch Dialog (mobile) vs Popover (desktop)
  Interface: See DESIGN.md Module: ExerciseSelectorDialog
  Pseudocode: See DESIGN.md Responsive Selector
  Success:
    - Mobile: Full-screen Dialog with slide-up animation
    - Desktop: Existing Popover behavior
    - Search auto-focused in both modes
    - "Create new" option at bottom
  Test (70% coverage):
    - Renders Dialog on mobile viewport
    - Renders Popover on desktop viewport
    - Search filters exercises
    - Selection closes and triggers onSelect
    - Create new triggers onCreateNew
  Dependencies: useMobileViewport, Dialog, Popover, Command
  Time: 1.5hr
  ```

- [x] Integrate ExerciseSelectorDialog into QuickLogForm

  ```
  Files: src/components/dashboard/quick-log-form.tsx:269-380
  Approach: Replace inline Popover/Command with ExerciseSelectorDialog
  Success:
    - Mobile: Full-screen exercise selection
    - Desktop: Popover dropdown (unchanged)
    - All existing behavior preserved
  Test: Existing tests pass
  Dependencies: ExerciseSelectorDialog
  Time: 30min
  ```

- [ ] Implement sticky submit button on mobile

  ```
  Files: src/components/dashboard/quick-log-form.tsx:489-507
  Approach: Conditional className with fixed positioning on mobile
  Pseudocode: See DESIGN.md QuickLogForm Enhancements #5
  Success:
    - Mobile: Submit button fixed to bottom viewport
    - Full width, 64px height
    - Safe area padding (pb-safe)
    - Desktop: Normal flow (unchanged)
  Test: Manual QA on mobile viewport
  Dependencies: useMobileViewport
  Time: 30min
  ```

- [ ] Add AnimatePresence to set card history

  ```
  Files: src/components/dashboard/grouped-set-history.tsx:89-106
  Approach: Wrap exerciseGroups.map in AnimatePresence, add motion.div
  Pseudocode: See DESIGN.md Module: Animated Set Card Entrance
  Success:
    - New sets animate in with spring physics
    - stiffness: 500, damping: 30
    - Existing cards don't re-animate on list change
  Test: Manual QA (animation smoothness)
  Dependencies: framer-motion (already installed)
  Time: 30min
  ```

- [ ] Add empty search recovery path
  ```
  Files: src/components/dashboard/exercise-selector-dialog.tsx
  Approach: CommandEmpty shows "Create [query]" button
  Pseudocode: See DESIGN.md Error Handling Strategy - Empty Search Recovery
  Success: When search has no results, user can create exercise with that name
  Test: Search "nonexistent" → shows Create button → triggers onCreateNew
  Dependencies: ExerciseSelectorDialog (same PR)
  Time: 15min
  ```

---

## Design Iteration

After Phase 1:

- Review pre-fill UX: Does it feel right? Too aggressive?
- Stepper step sizes: Are smart steps intuitive?

After Phase 2:

- Review Dialog transition: Native enough? Consider custom sheet later
- Animation timing: Too snappy? Too slow?

---

## Automation Opportunities

- Consider Playwright E2E for core logging flow
- Screenshot tests for Stepper states (normal, disabled, at-bounds)

---

## Files Summary

**New Files** (6):

- `src/hooks/useMobileViewport.ts`
- `src/hooks/useMobileViewport.test.ts`
- `src/components/brutalist/Stepper.tsx`
- `src/components/brutalist/Stepper.test.tsx`
- `src/components/dashboard/exercise-selector-dialog.tsx`
- `src/components/dashboard/exercise-selector-dialog.test.tsx`

**Modified Files** (4):

- `src/components/brutalist/index.ts` — Add Stepper export
- `src/hooks/useQuickLogForm.ts` — Toast duration, timeout handling
- `src/components/dashboard/quick-log-form.tsx` — Major enhancements
- `src/components/dashboard/grouped-set-history.tsx` — AnimatePresence

---

## Acceptance Criteria (Per TASK.md)

- [ ] 1-tap logging for repeat sets (pre-fill working)
- [ ] 3-5 taps for adjustments (steppers working)
- [ ] One-handed operation possible (thumb-zone layout)
- [ ] All touch targets ≥48px (iOS HIG)
- [ ] No accessibility regressions (aria-live, focus trap)
- [ ] Form completion rate tracked via analytics
