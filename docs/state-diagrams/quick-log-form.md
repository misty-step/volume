# Quick Log Form State Machine

The main workout logging form with reps/duration mode switching and keyboard navigation.

## Input Mode States

```mermaid
stateDiagram-v2
    [*] --> reps_mode: Default

    reps_mode --> duration_mode: Click "Duration" button
    reps_mode --> duration_mode: Set duration value
    duration_mode --> reps_mode: Click "Reps" button
    duration_mode --> reps_mode: Set reps value

    note right of reps_mode
        Form fields: exercise, reps, weight
        duration field cleared
    end note

    note right of duration_mode
        Form fields: exercise, duration, weight
        reps field cleared
    end note
```

## Focus Flow (Keyboard Navigation)

```mermaid
stateDiagram-v2
    [*] --> exercise_selector: Page load

    exercise_selector --> reps_input: Select exercise
    exercise_selector --> duration_input: Select exercise (duration mode)

    reps_input --> weight_input: Enter key
    duration_input --> weight_input: Enter key

    weight_input --> submit: Enter key
    submit --> reps_input: Success (same exercise)
    submit --> duration_input: Success (duration mode)
```

## Form Submission Flow

```mermaid
sequenceDiagram
    participant Form
    participant Hook as useQuickLogForm
    participant Convex
    participant Toast

    Form->>Hook: handleSubmit()
    Hook->>Hook: Validate fields
    alt Validation fails
        Hook-->>Form: Show field errors
    else Validation passes
        Hook->>Convex: logSet mutation
        alt Success
            Convex-->>Hook: Set ID
            Hook->>Toast: Show undo toast
            Hook-->>Form: Clear values, keep exercise
            Form->>Form: Focus reps/duration input
        else Error
            Convex-->>Hook: Error
            Hook->>Toast: Show error
        end
    end
```

## Mode Switching Logic

```typescript
// Watching form values to auto-clear opposing field
useEffect(() => {
  const subscription = form.watch((value, { name }) => {
    if (name === "reps" && value.reps !== undefined) {
      form.setValue("duration", undefined);
      setIsDurationMode(false);
    } else if (name === "duration" && value.duration !== undefined) {
      form.setValue("reps", undefined);
      setIsDurationMode(true);
    }
  });
  return () => subscription.unsubscribe();
}, [form]);
```

## Focus Management

The form uses `requestAnimationFrame` for reliable focus after dialog close:

```typescript
const focusElement = (ref: React.RefObject<HTMLInputElement | null>) => {
  requestAnimationFrame(() => {
    if (ref.current && document.contains(ref.current)) {
      ref.current.focus();
    }
  });
};
```

100ms delay after exercise selection ensures DOM updates complete before focusing.

## Files

- `/src/components/dashboard/quick-log-form.tsx` - Form component
- `/src/hooks/useQuickLogForm.ts` - Form logic and validation
- `/src/components/dashboard/duration-input.tsx` - Duration field
- `/src/components/dashboard/exercise-selector-dialog.tsx` - Exercise picker
