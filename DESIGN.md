## Architecture Overview

**Selected Approach**: Throw-on-failure delete contract + contextual validation copy

**Rationale**: Reuse the existing `handleMutationError` pattern and `ExerciseSetGroup` delete UX as the “deep” module for mutations, while keeping Convex validation surface identical and only enriching copy. This keeps interfaces tiny (`onDelete(id): Promise<void>`, `validate*(...)`) and hides logging/toast complexity inside shared modules instead of scattering bespoke error handling across pages.

**Core Modules**

- `HistoryDeleteFlow` (page-level wiring) – wires Convex delete mutation into the grouped history UI with a strict throw-on-failure contract.
- `ExerciseSetGroup` (UI controller for deletes) – owns confirmation, optimistic UI boundary, success toast, and mutation error handling via `handleMutationError`.
- `ConvexValidation` (backend input guard) – enforces numeric and naming constraints with more contextual error copy.
- `MutationErrorPresenter` (existing `handleMutationError`) – maps thrown errors into user-friendly toasts and logs appropriately.

**Data Flow**

- Delete: User taps delete in history → `ExerciseSetGroup.confirmDelete` → `HistoryDeleteFlow.onDelete(setId)` → `convex.sets.deleteSet` → (success) toast + UI removal, (failure) `handleMutationError("Delete Set")`.
- Validation: Client submits quick-log form → `convex.sets.logSet` → `ConvexValidation` functions throw on bad input → `handleMutationError` maps messages to toasts when surfaced to the client.

**Key Decisions**

1. Keep `onDelete` contract minimal (`Promise<void>` that rejects on any failure) to avoid leaking backend concerns to the UI layer.
2. Localize improvements to validation copy within `convex/lib/validate.ts`, preserving function signatures and mapping substrings for `handleMutationError`.
3. Reuse existing `ExerciseSetGroup` delete UX as the single controller for confirmation, loading state, and toast behavior, rather than duplicating logic in the history page.

---

## Module: HistoryDeleteFlow

Responsibility: Bridge Convex `deleteSet` mutation into history UI via a simple, explicit `onDelete(setId)` contract that throws on failure.

Location:

- `src/app/(app)/history/page.tsx`

Public Interface (conceptual):

```typescript
type HistoryDeleteHandler = (setId: Id<"sets">) => Promise<void>;
```

Behavior:

- Calls `useMutation(api.sets.deleteSet)` with `{ id: setId }`.
- Does not handle toasts or logging directly; lets errors propagate to the caller.
- Guarantees:
  - Resolves only when the backend confirms deletion.
  - Rejects with whatever error Convex or the network throws.

Error Handling:

- No internal `try/catch` around the mutation.
- Upstream (UI components) must wrap calls in `try/catch` and route failures through `handleMutationError(error, "Delete Set")`.

Dependencies:

- Reads: `api.sets.deleteSet` from Convex.
- Used by: `ChronologicalGroupedSetHistory` → `ExerciseSetGroup` (via `onDelete` prop).

Pseudocode:

```typescript
const deleteSetMutation = useMutation(api.sets.deleteSet);

const handleDelete: HistoryDeleteHandler = async (setId) => {
  // Let errors bubble; UI controller handles them.
  await deleteSetMutation({ id: setId });
};
```

Notes:

- This follows the same pattern as `Dashboard.handleDeleteSet` today but pushes all presentation concerns into the UI component to keep the page module shallow.

---

## Module: ExerciseSetGroup (History Delete Controller)

Responsibility: Owns the full UX for deleting a set inside grouped history, including confirmation, loading state, success toast, and routing failures through `handleMutationError`.

Location:

- `src/components/dashboard/exercise-set-group.tsx`

Existing Public Interface (simplified):

```typescript
interface ExerciseSetGroupProps {
  exercise: Exercise;
  sets: WorkoutSet[];
  totalVolume: number;
  totalReps: number;
  preferredUnit: WeightUnit;
  onRepeat: (set: WorkoutSet) => void;
  onDelete: (setId: Id<"sets">) => Promise<void>; // key contract
  showRepeat?: boolean;
}
```

Internals (relevant to delete):

- Local state:
  - `deletingId: Id<"sets"> | null` – disables delete buttons for the active set.
  - `setToDelete: WorkoutSet | null` – controls the confirmation dialog target.
- Delete flow:
  1. User taps delete button for a set → `handleDeleteClick(set)` sets `setToDelete`.
  2. AlertDialog opens, bound to `setToDelete !== null`.
  3. User confirms delete → `confirmDelete()`:
     - Sets `deletingId` to the target set.
     - `await onDelete(setToDelete._id)`.
     - On success:
       - `toast.success("Set deleted")`.
       - Clears `setToDelete` and `deletingId`.
     - On failure:
       - `handleMutationError(error, "Delete Set")`.
       - Resets `deletingId` only; leaves `setToDelete` so the dialog stays open until dismissed.

Error Handling:

- `confirmDelete` is the single place that:
  - Invokes `onDelete` and awaits it.
  - Uses `handleMutationError` to translate errors into user-facing toasts.
  - Ensures no success toast fires on failure.

Pseudocode (focused):

```typescript
const confirmDelete = async () => {
  if (!setToDelete) return;
  setDeletingId(setToDelete._id);
  try {
    await onDelete(setToDelete._id);
    toast.success("Set deleted");
    setSetToDelete(null);
    setDeletingId(null);
  } catch (error) {
    handleMutationError(error, "Delete Set");
    setDeletingId(null);
    // Dialog stays open until user closes it.
  }
};
```

Dependencies:

- Uses: `toast` from `sonner`, `handleMutationError` from `src/lib/error-handler`, design system components (`BrutalistButton`, `AlertDialog`).
- Used by: `ChronologicalGroupedSetHistory`, `GroupedSetHistory` (today view).

Notes:

- History page must not duplicate confirmation or toast logic; `ExerciseSetGroup` is the deep module here.

---

## Module: ChronologicalGroupedSetHistory

Responsibility: Day-level orchestration of grouped history, delegating per-exercise UX (including delete) to `ExerciseSetGroup`.

Location:

- `src/components/dashboard/chronological-grouped-set-history.tsx`

Public Interface (simplified):

```typescript
interface ChronologicalGroupedSetHistoryProps {
  groupedSets: DayGroup[];
  exerciseMap: Map<Id<"exercises">, Exercise>;
  onRepeat: (set: Set) => void;
  onDelete: (setId: Id<"sets">) => Promise<void>;
  showRepeat?: boolean;
}
```

Behavior:

- For each `dayGroup`, calls `groupSetsByExercise(dayGroup.sets, preferredUnit)` and renders an `ExerciseSetGroup` with:
  - The exercise object.
  - Sets, totals, preferred unit.
  - Pass-through `onDelete` and `onRepeat` handlers.

Error Handling:

- Does not handle errors itself.
- Relies on `ExerciseSetGroup` to handle delete UX using `onDelete` contract.

Pseudocode:

```typescript
{exerciseGroups.map(group => {
  const exercise = exerciseMap.get(group.exerciseId);
  if (!exercise) return null;
  return (
    <ExerciseSetGroup
      exercise={exercise}
      sets={group.sets}
      totalVolume={group.totalVolume}
      totalReps={group.totalReps}
      preferredUnit={preferredUnit}
      onRepeat={onRepeat}
      onDelete={onDelete}
      showRepeat={showRepeat}
    />
  );
})}
```

Dependencies:

- Uses: `groupSetsByExercise`, `useWeightUnit`, design system components.
- Used by: `src/app/(app)/history/page.tsx`.

---

## Module: ConvexValidation

Responsibility: Centralized, contextual validation for set and exercise inputs in Convex, with error messages that explain constraints and fixes without changing behavior.

Location:

- `convex/lib/validate.ts`

Public Interface:

```typescript
export function validateReps(reps: number): void;
export function validateWeight(weight: number | undefined): number | undefined;
export function validateUnit(
  unit: string | undefined,
  weight: number | undefined
): void;
export function validateDuration(
  duration: number | undefined
): number | undefined;
export function validateExerciseName(name: string): string;
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<{ subject: string }>;
export function requireOwnership<T extends { userId: string }>(
  resource: T | null,
  userId: string,
  resourceType: string
): void;
```

Behavior (validation functions):

- `validateReps`:
  - Accepts integers `1–1000`.
  - Throws if reps is non-integer, ≤0, >1000, or non-finite.
  - New message shape (example):
    - `"Reps must be a whole number between 1 and 1000 (no half reps)."`
- `validateWeight`:
  - Accepts `undefined` (bodyweight) or finite values `0.1–10000`.
  - Rounds to 2 decimal places.
  - Throws otherwise with copy like:
    - `"Weight must be between 0.1 and 10000. Leave weight empty for bodyweight sets."`
- `validateUnit`:
  - If weight is provided, requires `"lbs"` or `"kg"`.
  - If no weight, allows missing unit.
  - Error copy example:
    - `"Unit must be 'lbs' or 'kg' when weight is provided."`
- `validateDuration`:
  - Accepts `undefined` or finite values `1–86400` seconds.
  - Rounds to nearest whole second.
  - Throws when value is ≤0, >86400, or effectively <1 after rounding, with copy like:
    - `"Duration must be between 1 and 86400 seconds (24 hours)."`
- `validateExerciseName`:
  - Trims whitespace, preserves casing.
  - Accepts length `2–100`.
  - Throws with messages like:
    - `"Exercise name cannot be empty."`
    - `"Exercise name must be between 2 and 100 characters."`

Error Handling:

- All functions throw plain `Error` with user-ready strings (no internal codes).
- Messages preserve key phrases:
  - `"Reps must"`, `"Weight must"`, `"Unit must"`, `"Exercise name"`, `"Duration must"` so `handleMutationError` can pass them through as-is.

Dependencies:

- Used by `convex/sets.ts` and `convex/exercises.ts`.
- Downstream: surfaced to users via `handleMutationError` when frontend mutations fail.

Pseudocode example (`validateWeight`):

```typescript
function validateWeight(weight) {
  if (weight === undefined) return undefined;
  if (!isFinite(weight) || weight < 0.1 || weight > 10000) {
    throw new Error(
      "Weight must be between 0.1 and 10000. Leave weight empty for bodyweight sets."
    );
  }
  return Math.round(weight * 100) / 100;
}
```

---

## Module: MutationErrorPresenter (`handleMutationError`)

Responsibility: Central gateway converting thrown errors into user-facing toasts and logs with environment-aware verbosity.

Location:

- `src/lib/error-handler.ts`

Public Interface:

```typescript
export function handleMutationError(error: unknown, context: string): void;
```

Behavior:

- Extracts message:
  - If `error` is `Error`, uses `error.message`.
  - Otherwise uses `"Unknown error"`.
- Logs:
  - In production: logs `[context]: message` (single string, no stack).
  - In development: logs `[context]:` plus full error object for debugging.
- Maps messages to user copy via `getUserFriendlyMessage`:
  - Auth: `"Not authenticated"` → `"Please sign in to continue"`.
  - Authorization: `"Not authorized"` → `"You don't have permission for this action"`.
  - Validation: messages that include `"Reps must"`, `"Weight must"`, `"Unit must"`, `"Exercise name"` pass through unchanged.
  - Not found: `"not found"` → `"Item not found. It may have been deleted."`
  - Duplicate: `"already exists"` passes through.
  - Fallback: `"Something went wrong. Please try again."`
- Shows toast via `toast.error(userMessage, { duration: 4000 })`.

Dependencies:

- Uses: `sonner` `toast`.
- Used by: `ExerciseSetGroup`, `Dashboard`, `useQuickLogForm`, other UI modules.

Notes:

- Validation copy changes must keep the existing keyword patterns so this mapping continues to work.

---

## Core Algorithms

### History Delete Flow

1. User taps delete in history → `ExerciseSetGroup.handleDeleteClick(set)` sets `setToDelete`.
2. Confirmation dialog opens.
3. User confirms:
   - `ExerciseSetGroup.confirmDelete` sets `deletingId = setToDelete._id`.
   - Calls `await onDelete(setToDelete._id)` (from History page).
   - On success:
     - Shows `"Set deleted"` toast.
     - Clears `setToDelete` and `deletingId`.
     - Parent history component re-renders with updated data via Convex.
   - On error:
     - Calls `handleMutationError(error, "Delete Set")`.
     - Resets `deletingId` (cancel loading).
4. User can close dialog after failure; set remains rendered.

### Convex Validation on `logSet`

1. Require auth via `requireAuth(ctx)`; get `identity.subject`.
2. Enforce reps vs duration contract:
   - If both missing or both present → throw `"Must provide either reps or duration (not both)"`.
3. If reps present:
   - Call `validateReps(args.reps)`; throw with contextual copy on failure.
4. If duration present:
   - `duration = validateDuration(args.duration)`; ensures 1–86400 seconds.
5. Validate weight:
   - `weight = validateWeight(args.weight)`; returns rounded weight or throws.
6. Validate unit:
   - `validateUnit(args.unit, weight)`; ensures `lbs`/`kg` when weight present.
7. Load exercise and enforce ownership via `requireOwnership`.
8. For soft-deleted exercises, throw `"Cannot log sets for a deleted exercise"`.
9. Insert set; return new ID.

### Error Presentation on Validation Failure

1. Backend validation throws `Error` with contextual message (e.g., `"Weight must be between 0.1 and 10000. Leave weight empty for bodyweight sets."`).
2. Convex client surfaces error to React mutation hook.
3. Calling code (e.g., `useQuickLogForm.onSubmit`, `ExerciseSetGroup.confirmDelete`) catches the error.
4. Calls `handleMutationError(error, "<Context>")`.
5. `handleMutationError` logs appropriately and maps message via `getUserFriendlyMessage`:
   - For validation keywords, returns the original message.
6. `toast.error` displays the message for the user.

---

## File Organization

Existing files touched:

- `src/app/(app)/history/page.tsx`
  - Owns `HistoryDeleteFlow` wiring via `handleDelete(setId)`.
- `src/components/dashboard/chronological-grouped-set-history.tsx`
  - Receives `onDelete` from history page and passes it to `ExerciseSetGroup`.
- `src/components/dashboard/exercise-set-group.tsx`
  - Implements the delete UX controller.
- `convex/lib/validate.ts`
  - Implements `ConvexValidation`.
- `convex/lib/validate.test.ts`
  - Tests exact ranges and substrings; will be updated for new copy while preserving key patterns.
- `src/lib/error-handler.ts` / `src/lib/error-handler.test.ts`
  - Ensure mapping still handles validation keywords correctly.

No new files are required for this task; we are deepening existing modules instead of adding shallow wrappers.

---

## Integration Points

- **Convex backend**:
  - Validation modules are already imported into `convex/sets.ts` and `convex/exercises.ts`; behavior is unchanged aside from error string text.
  - `deleteSet` mutation remains the single entrypoint for deleting sets; ownership and auth checks stay server-side.
- **Next.js frontend**:
  - `HistoryPage` imports Convex API and passes `handleDelete` into `ChronologicalGroupedSetHistory`.
  - `ExerciseSetGroup` consumes `onDelete` and `handleMutationError`, integrating with the existing design system.
- **Sentry / logging**:
  - Current Sentry integration lives in `sentry.*.config.ts` and app error boundaries; this feature does not add new Sentry usage but continues to rely on thrown errors for visibility.
  - `console.error` usage inside `handleMutationError` remains the main logging surface for mutation failures.
- **CI / quality gates**:
  - `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` run in GitHub Actions via `.github/workflows/ci.yml`.
  - `vitest-coverage-report-action` posts coverage comments; coverage must remain healthy for modified files.

---

## State Management

- **Client state**:
  - History page uses Convex `usePaginatedQuery` for sets and `useQuery` for exercises; these remain the source of truth.
  - Delete operations rely on Convex’s real-time syncing to revalidate queries after mutations.
  - `ExerciseSetGroup` holds ephemeral UI state (`deletingId`, `setToDelete`) but does not maintain its own copy of the server dataset.
- **Server state**:
  - All mutations (`logSet`, `deleteSet`, etc.) operate on Convex DB; validation happens server-side, not in the client-only schema.
- **Concurrency / races**:
  - If the same set is deleted in two tabs/devices:
    - First delete succeeds; second delete returns a not-found/ownership error.
    - `handleMutationError` maps `"not found"` to `"Item not found. It may have been deleted."`, giving the user a clear explanation.
  - Network errors:
    - Delete promises reject; UI state is reset via `deletingId = null` and an error toast explains that the action failed.

---

## Error Handling Strategy

- **Categories**:
  - Validation: thrown from `ConvexValidation` with user-ready copy; passed through in toasts.
  - Authentication: `"Not authenticated"` from `requireAuth` → sign-in guidance.
  - Authorization/ownership: `"Not authorized..."` or ownership errors → permission guidance.
  - Not found: resource not present → soft guidance that item may have been deleted.
  - Unknown/server: any other error → generic “try again” copy.

- **Response format**:
  - Convex mutations throw `Error` with string messages only (no structured codes).
  - Frontend uses `handleMutationError` to normalize into a single toast pattern.

- **Logging & observability**:
  - Dev: full error object for debugging.
  - Prod: sanitized strings to avoid leaking details.
  - Sentry integration (elsewhere in app) continues to see thrown errors from queries/mutations via error boundaries.

---

## Testing Strategy

- **Unit tests**:
  - `convex/lib/validate.test.ts`:
    - Keep range and rounding assertions identical.
    - Update `toThrow` expectations where they check for substrings (e.g., `"whole number"`, `"between 0.1 and 10000"`) to match new copy while preserving the core phrase.
  - `src/lib/error-handler.test.ts`:
    - Ensure validation messages that include `"Reps must"`, `"Weight must"`, `"Unit must"`, `"Exercise name"` still pass through unchanged.
    - Confirm generic and auth/authorization mappings remain intact.

- **Component tests**:
  - Add/extend tests for `ExerciseSetGroup` (and/or `ChronologicalGroupedSetHistory`) to cover:
    - Successful delete:
      - Confirm dialog flows, `onDelete` is called once, `"Set deleted"` toast is shown, and local loading state clears.
    - Failed delete:
      - Mock `onDelete` to reject with an `Error`.
      - Verify `handleMutationError` is called with `"Delete Set"` context (using module mocking).
      - Ensure no success toast is shown.
      - Ensure `deletingId` is reset so buttons are re-enabled.

- **Integration / E2E (future)**:
  - Use existing Playwright setup to script:
    - Log in, log a set, attempt delete with a simulated network failure or forced backend error, and assert on the visible toast text.

- **Coverage targets**:
  - Aim for ≥80% patch coverage on changed modules.
  - Ensure new branches in `ConvexValidation` and delete flows are exercised.

---

## Performance & Security Notes

- **Performance**:
  - No additional network calls are introduced; delete and log flows reuse existing mutations.
  - Validation functions remain O(1) arithmetic/logic operations; no loops or IO.
  - Toaster usage remains unchanged in complexity; only strings change.

- **Security**:
  - Auth remains enforced by `requireAuth` on mutations.
  - `requireOwnership` continues to guard access to sets and exercises.
  - Error messages avoid exposing IDs, stack traces, or backend internals.
  - No new environment variables or secrets are introduced.

- **Observability**:
  - Mutation failures continue to be visible via logs and error boundaries.
  - If needed later, Sentry annotations can be added at mutation boundaries without changing this design.

---

## Alternative Architectures Considered

1. **Dedicated `useDeleteSet` Hook**
   - Pros:
     - Centralizes delete logic for all views (Today, History, future dashboards).
     - Could standardize toast copy and loading behavior.
   - Cons:
     - Adds another abstraction layer between pages and Convex, risking shallow indirection.
     - Requires refactors across multiple components beyond the current task scope.
   - Verdict:
     - Good candidate if delete behavior diverges across multiple views; for now, `ExerciseSetGroup` serves as the deep module for delete UX.

2. **Error-Code-Based Validation Layer**
   - Pros:
     - Cleaner decoupling of backend error semantics and frontend messages.
     - Easier future localization / A/B testing of copy.
   - Cons:
     - Requires introducing structured error shapes in Convex and a new mapping layer in the client.
     - Overkill for the current scope focused on copy improvements.
   - Verdict:
     - Appropriate for a future ADR and refactor once validation and error surfaces widen.

3. **Client-Only Validation for Log Form**
   - Pros:
     - Immediate feedback without a round trip.
   - Cons:
     - Duplicates Convex validation logic in the client, risking divergence.
     - Does not address errors arising from backend constraints or concurrent changes.
   - Verdict:
     - Rejected; server remains the single source of truth for validation.

---

## Open Questions / Assumptions

- Assumption: Keeping `ExerciseSetGroup` as the central controller for delete UX (with `onDelete` as a deep dependency) is preferable to a new hook for this task’s scope.
- Assumption: English-only validation copy is acceptable in this phase; localization can be tackled with an error-code refactor later.
- Question: Should we introduce analytics events for validation failures and failed deletes to quantify improvements (e.g., event `validation_error` with type `reps/weight/duration`)?
- Question: If delete UX diverges between Today and History in future features (e.g., bulk delete), should we promote a shared `useDeleteSet` hook or keep per-component controllers?
