# DESIGN.md - Mobile-First UX Redesign

## Architecture Overview

**Selected Approach**: Component Enhancement with Smart Defaults

**Rationale**: Enhance existing `QuickLogForm` with pre-fill logic, stepper controls, and responsive selector. Avoids rebuilding stable components, preserves existing patterns, allows incremental delivery.

**Core Modules**:

- `Stepper` — Reusable +/- numeric control with smart step calculation
- `useFormPrefill` — Hook to auto-populate form from last set when exercise selected
- `ExerciseSelectorDialog` — Responsive wrapper: Dialog on mobile, Popover on desktop
- `useMobileViewport` — Hook to detect mobile viewport (SSR-safe)

**Data Flow**:

```
User selects exercise
  → useLastSet fetches last set
  → useFormPrefill auto-populates reps/weight
  → Form ready to submit (1 tap)
  → User adjusts via Steppers (optional)
  → Submit → animated card enters history
```

**Key Design Decisions**:

1. **Pre-fill over quick-repeat**: Auto-populating form is simpler than adding a "repeat" button
2. **Enhance not replace**: Modify `QuickLogForm` directly, no wrapper components
3. **Radix Dialog over custom sheet**: Use proven primitives with responsive styles

---

## Module Design

### Module: Stepper

**Responsibility**: Hide complexity of +/- numeric input with smart step calculation, bounds validation, and accessibility from the rest of the system.

**Public Interface**:

```typescript
interface StepperProps {
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;           // Default: 0
  max?: number;           // Default: 1000
  step?: number;          // Default: 1, or use getStep for smart calculation
  getStep?: (value: number) => number;  // Smart step function
  disabled?: boolean;
  label: string;          // For aria-label
  formatValue?: (value: number) => string;  // Display formatter
}

// Usage in QuickLogForm
<Stepper
  value={reps}
  onChange={setReps}
  min={1}
  max={1000}
  step={1}
  label="Reps"
/>

<Stepper
  value={weight}
  onChange={setWeight}
  min={0}
  max={2000}
  getStep={getWeightStep}  // Smart: ±2.5 / ±5 / ±10
  label="Weight"
  formatValue={(v) => `${v} ${unit}`}
/>
```

**Internal Implementation** (hidden complexity):

- Smart step calculation based on current value
- Min/max bounds with user-facing error messages
- Screen reader value announcements (`aria-live="polite"`)
- Disabled state during form submission
- Touch target sizing (48×48px minimum)
- Visual feedback on tap (scale animation)

**Smart Weight Step Logic**:

```typescript
function getWeightStep(value: number, unit: "lbs" | "kg"): number {
  if (unit === "kg") {
    // kg: 0-25 = ±1, 25-75 = ±2.5, 75+ = ±5
    if (value < 25) return 1;
    if (value < 75) return 2.5;
    return 5;
  }
  // lbs: 0-50 = ±2.5, 50-150 = ±5, 150+ = ±10
  if (value < 50) return 2.5;
  if (value < 150) return 5;
  return 10;
}
```

**Dependencies**:

- `@/components/brutalist/BrutalistButton` — For +/- buttons
- `framer-motion` — For tap feedback animation
- `@/lib/utils` (cn) — For class merging

**Data Structures**:

```typescript
type StepperState = {
  value: number;
  error: string | null; // "Max 1000 reps reached"
};
```

**Error Handling**:

- Value at min → Show "Min reached" briefly, disable - button
- Value at max → Show "Max X reached" via aria-live
- Non-numeric input → Ignore (controlled component)

**Test Boundaries**:

- **Test**: increment/decrement logic, smart step calculation, bounds behavior
- **Don't test**: Radix Button internals, CSS styling

---

### Module: useFormPrefill

**Responsibility**: Auto-populate form fields when exercise selection changes, using data from `useLastSet`.

**Public Interface**:

```typescript
interface UseFormPrefillOptions {
  form: UseFormReturn<QuickLogFormValues>;
  exerciseId: string | null;
  enabled?: boolean; // Default: true
}

// Automatically populates form.reps, form.weight, form.duration
// when exerciseId changes and lastSet exists
useFormPrefill({ form, exerciseId });
```

**Internal Implementation**:

- Subscribes to `exerciseId` changes via `useEffect`
- Fetches last set via `useLastSet(exerciseId)`
- Populates form values: `form.setValue('reps', lastSet.reps)`
- Sets appropriate mode (reps vs duration)
- Does NOT overwrite if user has already entered values (guards against race conditions)

**Dependencies**:

- `useLastSet` — Existing hook for fetching last set
- `react-hook-form` — Form instance for setValue

**Guard Logic**:

```typescript
// Only pre-fill if form is empty (user hasn't started typing)
const shouldPrefill =
  form.getValues("reps") === undefined &&
  form.getValues("weight") === undefined &&
  form.getValues("duration") === undefined;

if (shouldPrefill && lastSet) {
  form.setValue("reps", lastSet.reps);
  form.setValue("weight", lastSet.weight);
  // etc.
}
```

---

### Module: useMobileViewport

**Responsibility**: Detect mobile viewport width with SSR safety and resize handling.

**Public Interface**:

```typescript
function useMobileViewport(breakpoint?: number): boolean;

// Usage
const isMobile = useMobileViewport(); // Default: 768px
const isMobile = useMobileViewport(640); // Custom breakpoint
```

**Internal Implementation**:

- SSR-safe: Returns `false` during server render (no window)
- Uses `window.matchMedia` for efficient resize detection
- Cleans up listener on unmount
- Debounce not needed (matchMedia is already efficient)

```typescript
function useMobileViewport(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
```

---

### Module: ExerciseSelectorDialog

**Responsibility**: Render exercise selector as full-screen Dialog on mobile, Popover on desktop. Hide viewport detection and animation complexity.

**Public Interface**:

```typescript
interface ExerciseSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  selectedId: string | null;
  onSelect: (exerciseId: string) => void;
  onCreateNew: () => void;
}

// Usage in QuickLogForm
<ExerciseSelectorDialog
  open={comboboxOpen}
  onOpenChange={setComboboxOpen}
  exercises={exercises}
  selectedId={selectedExerciseId}
  onSelect={handleExerciseSelect}
  onCreateNew={() => setShowInlineCreator(true)}
/>
```

**Internal Implementation**:

- Uses `useMobileViewport()` to choose Dialog vs Popover
- **Mobile (Dialog)**:
  - Full-screen with slide-up animation
  - Auto-focus search input
  - Brutalist styling (3px borders, no rounded corners)
  - Safe area padding at bottom
- **Desktop (Popover)**:
  - Existing behavior preserved
  - Width matches trigger button

**Dialog Mobile Styles**:

```typescript
// Mobile-specific Dialog content styles
const mobileDialogStyles = cn(
  // Full screen
  "fixed inset-0 z-50",
  // Slide up from bottom
  "data-[state=open]:slide-in-from-bottom",
  "data-[state=closed]:slide-out-to-bottom",
  // Brutalist styling
  "border-t-3 border-concrete-black dark:border-concrete-white",
  "bg-background",
  // Safe area
  "pb-safe"
);
```

**Dependencies**:

- `@radix-ui/react-dialog` — Via existing Dialog component
- `@radix-ui/react-popover` — Via existing Popover component
- `useMobileViewport` — For responsive switching
- `cmdk` (Command) — For search functionality

---

### Module: QuickLogForm Enhancements

**Responsibility**: Integrate Steppers, pre-fill logic, responsive selector, and sticky submit into existing form.

**Changes to Existing Component**:

1. **Import new modules**:

   ```typescript
   import { Stepper } from "@/components/brutalist/Stepper";
   import { useFormPrefill } from "@/hooks/useFormPrefill";
   import { ExerciseSelectorDialog } from "@/components/dashboard/exercise-selector-dialog";
   import { useMobileViewport } from "@/hooks/useMobileViewport";
   ```

2. **Add pre-fill hook**:

   ```typescript
   useFormPrefill({ form, exerciseId: selectedExerciseId });
   ```

3. **Replace numeric inputs with Steppers**:

   ```typescript
   // Before: BrutalistInput type="number"
   // After: Stepper component
   <Stepper
     value={field.value}
     onChange={field.onChange}
     min={1}
     max={1000}
     step={1}
     label="Reps"
     disabled={form.formState.isSubmitting}
   />
   ```

4. **Replace Popover with responsive selector**:

   ```typescript
   const isMobile = useMobileViewport();

   {isMobile ? (
     <ExerciseSelectorDialog {...selectorProps} />
   ) : (
     <Popover>{/* existing */}</Popover>
   )}
   ```

5. **Sticky submit on mobile**:

   ```typescript
   <div className={cn(
     "pt-6",
     isMobile && "fixed bottom-0 left-0 right-0 p-4 bg-background border-t-3 pb-safe"
   )}>
     <BrutalistButton type="submit" size="lg" className="w-full">
       Log Set
     </BrutalistButton>
   </div>
   ```

6. **Update label typography**:

   ```typescript
   // Before: text-xs
   // After: text-sm
   <FormLabel className="font-mono text-sm uppercase tracking-wider">
   ```

7. **Update mode toggle size**:
   ```typescript
   // Before: size="sm" (40px)
   // After: size="default" (48px)
   <BrutalistButton size="default" ...>Reps</BrutalistButton>
   ```

---

### Module: Animated Set Card Entrance

**Responsibility**: When a set is logged, animate the new card entering the history list.

**Implementation Approach**: Use existing `framer-motion` `AnimatePresence` + `layoutId` for FLIP animation.

**Changes to GroupedSetHistory**:

```typescript
import { AnimatePresence, motion } from "framer-motion";

// Wrap set cards in AnimatePresence
<AnimatePresence mode="popLayout">
  {sets.map((set) => (
    <motion.div
      key={set._id}
      layoutId={set._id}
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <SetCard {...props} />
    </motion.div>
  ))}
</AnimatePresence>
```

**Spring Physics**:

- `stiffness: 500` — Snappy response
- `damping: 30` — Minimal overshoot
- Result: Card pops in with satisfying "weight" feel

---

## Implementation Pseudocode

### Pre-Fill Flow

```pseudocode
hook useFormPrefill(form, exerciseId):
  1. Watch exerciseId changes
     - Skip if exerciseId is null/empty

  2. Fetch last set
     - lastSet = useLastSet(exerciseId)
     - if loading or null, do nothing

  3. Check if form is empty (guard against overwriting user input)
     - isEmpty = reps === undefined AND weight === undefined AND duration === undefined
     - if NOT isEmpty, skip pre-fill

  4. Pre-fill form values
     - if lastSet.duration exists:
         form.setValue('duration', lastSet.duration)
         form.setValue('reps', undefined)
         setMode('duration')
     - else:
         form.setValue('reps', lastSet.reps)
         form.setValue('duration', undefined)
         setMode('reps')
     - form.setValue('weight', lastSet.weight)

  5. Focus appropriate input (handled by existing focusElement)
```

### Stepper Interaction

```pseudocode
component Stepper({ value, onChange, min, max, getStep, label }):
  1. Calculate step size
     - step = getStep ? getStep(value) : props.step

  2. Handle increment
     - newValue = value + step
     - if newValue > max:
         announce("Maximum reached")
         return
     - onChange(newValue)
     - announce(newValue) via aria-live

  3. Handle decrement
     - newValue = value - step
     - if newValue < min:
         announce("Minimum reached")
         return
     - onChange(newValue)
     - announce(newValue) via aria-live

  4. Render
     - [−] button: onClick=decrement, disabled if value <= min
     - Value display: tabular-nums, large text
     - [+] button: onClick=increment, disabled if value >= max
     - Hidden aria-live region for announcements
```

### Responsive Selector

```pseudocode
component ExerciseSelectorDialog({ open, onOpenChange, exercises, onSelect }):
  1. Detect viewport
     - isMobile = useMobileViewport(768)

  2. Render mobile (Dialog)
     - Full screen slide-up
     - Search auto-focused
     - List of exercises with check marks
     - "Create new" at bottom
     - Close on selection or backdrop click

  3. Render desktop (Popover)
     - Existing Command combobox behavior
     - Width matches trigger
```

---

## File Organization

```
src/
  components/
    brutalist/
      Stepper.tsx              # NEW: Reusable stepper control
      Stepper.test.tsx         # NEW: Stepper unit tests
      index.ts                 # MODIFY: Export Stepper
    dashboard/
      quick-log-form.tsx       # MODIFY: Integrate steppers, pre-fill, responsive selector
      quick-log-form.test.tsx  # MODIFY: Add pre-fill and stepper tests
      exercise-selector-dialog.tsx  # NEW: Responsive Dialog/Popover wrapper
      exercise-selector-dialog.test.tsx  # NEW: Tests
      grouped-set-history.tsx  # MODIFY: Add AnimatePresence for card entrance
  hooks/
    useFormPrefill.ts          # NEW: Pre-fill form from last set
    useFormPrefill.test.ts     # NEW: Tests
    useMobileViewport.ts       # NEW: SSR-safe viewport detection
    useMobileViewport.test.ts  # NEW: Tests
    useLastSet.ts              # EXISTING: No changes needed
    useQuickLogForm.ts         # EXISTING: No changes needed
```

**Modification Summary**:

- `src/components/brutalist/index.ts` — Add Stepper export
- `src/components/dashboard/quick-log-form.tsx` — Major enhancements
- `src/components/dashboard/grouped-set-history.tsx` — AnimatePresence wrapper

---

## State Management

**Client State**:

- Form values in `react-hook-form` (existing)
- `isMobile` derived from viewport via `useMobileViewport`
- `isDialogOpen` local state for selector
- No new global state needed

**Server State**:

- Last set data via `useLastSet` → Convex query (existing)
- Exercise list via existing query (no changes)

**State Update Flow**:

1. Exercise selected → `exerciseId` updated in form
2. `useFormPrefill` detects change → fetches last set → populates form
3. User adjusts via steppers → form values update
4. Submit → mutation → new set appears in history with animation
5. Form resets but keeps exercise selected (existing behavior)

---

## Error Handling Strategy

**Phase 0: UX Foundation**

1. **Undo Toast Duration** (NF2):

   ```typescript
   // In useQuickLogForm.ts onSubmit success
   toast.success("Set logged!", {
     action: { label: "Undo", onClick: () => onUndo(setId) },
     duration: 10000, // 10s (was default ~3s)
   });
   ```

2. **Network Timeout** (NF3):

   ```typescript
   // In useQuickLogForm.ts
   const MUTATION_TIMEOUT = 10000; // 10s

   const logSetWithTimeout = async (args) => {
     const timeoutPromise = new Promise((_, reject) =>
       setTimeout(() => reject(new Error("TIMEOUT")), MUTATION_TIMEOUT)
     );

     try {
       return await Promise.race([logSet(args), timeoutPromise]);
     } catch (error) {
       if (error.message === "TIMEOUT") {
         toast.info("Saving in background...", { duration: 5000 });
         // Let mutation complete in background
         return logSet(args);
       }
       throw error;
     }
   };
   ```

**Stepper Errors**:

- Min/max bounds → Visual feedback + aria-live announcement
- No network dependency (local state only)

**Empty Search Recovery** (NF3):

```typescript
<CommandEmpty>
  No exercises found.
  <BrutalistButton onClick={onCreateNew}>
    Create "{searchQuery}"
  </BrutalistButton>
</CommandEmpty>
```

---

## Testing Strategy

**Test Boundaries by Module**:

| Module                  | Test Type   | Coverage Target |
| ----------------------- | ----------- | --------------- |
| Stepper                 | Unit        | 90%             |
| useFormPrefill          | Unit        | 90%             |
| useMobileViewport       | Unit        | 80%             |
| ExerciseSelectorDialog  | Integration | 70%             |
| QuickLogForm (enhanced) | Integration | 80%             |

**Unit Tests (Stepper)**:

```typescript
describe('Stepper', () => {
  it('increments value by step', () => { ... });
  it('decrements value by step', () => { ... });
  it('applies smart weight step: ±2.5 under 50lbs', () => { ... });
  it('applies smart weight step: ±5 for 50-150lbs', () => { ... });
  it('applies smart weight step: ±10 over 150lbs', () => { ... });
  it('prevents going below min', () => { ... });
  it('prevents going above max', () => { ... });
  it('announces value changes to screen readers', () => { ... });
  it('disables buttons when disabled prop is true', () => { ... });
});
```

**Unit Tests (useFormPrefill)**:

```typescript
describe('useFormPrefill', () => {
  it('populates form when exercise selected and lastSet exists', () => { ... });
  it('does not overwrite existing form values', () => { ... });
  it('sets duration mode when lastSet has duration', () => { ... });
  it('sets reps mode when lastSet has reps', () => { ... });
  it('does nothing when exerciseId is null', () => { ... });
});
```

**Integration Tests (QuickLogForm)**:

```typescript
describe('QuickLogForm mobile UX', () => {
  it('pre-fills form with last set values on exercise select', () => { ... });
  it('allows 1-tap submit when pre-filled', () => { ... });
  it('uses Dialog on mobile viewport', () => { ... });
  it('uses Popover on desktop viewport', () => { ... });
  it('sticky submit button visible on mobile', () => { ... });
});
```

**Mocking Strategy**:

- Mock Convex queries in hook tests
- Use Testing Library's `screen` for component tests
- Real framer-motion (don't mock animation library)

---

## Performance Considerations

**Expected Load**:

- Pre-fill: Instant (data already cached by useLastSet)
- Stepper: 0ms (local state, no network)
- Dialog animation: 60fps (framer-motion spring)

**Optimizations**:

- `useMobileViewport` uses matchMedia (no resize listener polling)
- Pre-fill only runs on exerciseId change (not every render)
- Stepper uses `tabular-nums` for layout stability (no shift on value change)
- AnimatePresence with `mode="popLayout"` for smooth list updates

**Bundle Size Impact**:

- No new dependencies
- ~2KB additional code (Stepper, hooks, dialog wrapper)
- framer-motion already in bundle

---

## Accessibility Considerations

**Touch Targets** (iOS HIG):

- Stepper buttons: 48×48px (h-12 w-12)
- Submit button: 64px height (size="lg")
- Mode toggle: 48px height (size="default")

**Screen Reader Support**:

- Stepper announces value changes via `aria-live="polite"`
- Dialog has proper `aria-modal`, `aria-labelledby`
- Focus trapped in dialog (Radix built-in)

**Keyboard Navigation**:

- Escape closes dialog
- Tab navigates within dialog
- Enter submits form from any input

---

## Visual Specifications

**Stepper Layout**:

```
┌─────────────────────────────────┐
│  [−]    135    [+]              │
│  48px  tabular  48px            │
└─────────────────────────────────┘
```

**Mobile Dialog**:

```
┌─────────────────────────────────┐
│  SELECT EXERCISE           [×]  │ ← Header
├─────────────────────────────────┤
│  [Search...]                    │ ← Auto-focused
├─────────────────────────────────┤
│  ✓ Bench Press                  │
│    Squat                        │
│    Deadlift                     │
│    ...                          │
├─────────────────────────────────┤
│  + Create New                   │
└─────────────────────────────────┘
       [Safe area padding]
```

**Sticky Submit (Mobile)**:

```
┌─────────────────────────────────┐
│  [Form content scrolls]         │
│                                 │
│                                 │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │ ← Fixed to bottom
│  │       LOG SET           │    │    64px height
│  └─────────────────────────┘    │    Full width
└─────────────────────────────────┘
       [Safe area padding]
```

---

## Alternative Architectures Considered

### Alternative A: Separate MobileQuickLogForm Component

**Pros**: Clean separation, no conditional rendering
**Cons**: Code duplication, two components to maintain, divergent behavior risk
**Verdict**: Rejected — violates DRY, increases maintenance burden

### Alternative B: Custom Bottom Sheet Library

**Pros**: Native iOS feel, gesture-based dismiss
**Cons**: New dependency, complexity, not needed for MVP
**Verdict**: Rejected — Radix Dialog sufficient, can add later if metrics warrant

### Alternative C: Number Pad Instead of Steppers

**Pros**: Familiar pattern, precise input
**Cons**: Requires two-handed operation, obscures form, overkill for ±2 adjustments
**Verdict**: Rejected — Steppers better for small adjustments from pre-filled values

### Selected: Component Enhancement

**Justification**:

- Minimal code changes (enhance existing components)
- Uses proven Radix primitives
- Preserves existing test coverage
- Allows incremental rollout
- 75% of improvement comes from pre-fill (F0), which requires minimal UI changes

---

## Build Sequence

**Phase 0: UX Foundation** (2-3 days)

1. Extend undo toast duration to 10s
2. Add network timeout handling with "Saving in background" toast
3. Review/fix aria-live regions in form

**Phase 1: Smart Defaults + Steppers** (3-4 days)

1. Create `useMobileViewport` hook
2. Create `Stepper` component with smart weight step
3. Create `useFormPrefill` hook
4. Integrate into `QuickLogForm`
5. Update label typography (text-xs → text-sm)
6. Update mode toggle size (sm → default)

**Phase 2: Thumb-Zone + Polish** (2-3 days)

1. Create `ExerciseSelectorDialog` (responsive Dialog/Popover)
2. Implement sticky submit on mobile
3. Add AnimatePresence for set card entrance
4. Add empty search recovery ("Create [query]")

---

## Success Metrics

**Quantitative**:

- Time to log repeat set: <5 seconds (was ~15s)
- Taps for repeat set: 1-2 (was 5+)
- Form completion rate: Track via analytics

**Qualitative**:

- One-handed operation possible
- No keyboard required for typical logging
- Visible in bright gym lighting

---

## Out of Scope

Per TASK.md expert review:

- Swipe-to-delete gestures
- Haptic feedback
- Landscape mode optimization
- Android-specific patterns
- Offline support (separate initiative)
