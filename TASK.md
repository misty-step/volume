# TASK: UX – Delete feedback & validation messages

## 1. Executive Summary

- Problem: Set deletion can fail without clear feedback, and numeric validation errors are technical, not self-explanatory.
- Solution: Standardize delete error handling around `handleMutationError` in history flow and rewrite Convex validation messages to explain both constraint and recovery.
- User value: Users always know whether an action worked and how to fix bad input, avoiding silent failures and guesswork.
- Success metrics:
  - 95%+ of failed deletes/logs surface a toast with actionable guidance.
  - Zero unhandled promise rejections from `deleteSet` and related mutations in logs.
  - Fewer repeated invalid submissions per user session (via analytics if/when added).

## 2. User Context & Outcomes

- Users: Lifters logging workouts on mobile, often between sets, sometimes cleaning up mistakes later.
- Current pain:
  - Delete fails → set still visible, no clear reason.
  - Messages like "Reps must be a whole number between 1 and 1000" state rules but not "why" or "what now".
- Desired outcomes:
  - Delete/log errors are immediately visible, with a short next step (e.g., "check your connection", "sign in", "leave weight empty").
  - Validation copy feels obvious; users can self-correct without leaving the flow.

## 3. Requirements

### 3.1 Functional

- History delete UX:
  - Confirming delete from History triggers:
    - Success path: set removed from list, confirmation dialog closes, "Set deleted" toast shows once.
    - Failure path: no success toast, one error toast via `handleMutationError`, set remains.
  - Errors from `api.sets.deleteSet` in history flow must surface to `handleMutationError`, not be swallowed.
- Validation messages:
  - `validateReps`, `validateWeight`, `validateDuration`, `validateExerciseName`, `validateUnit` keep existing ranges and invariants.
  - Each error message:
    - States allowed range/constraint.
    - Adds a short rationale where helpful (e.g., "can't log half reps").
    - Adds a short recovery hint where confusion is common (e.g., "leave weight empty for bodyweight sets").
  - Messages stay single-sentence / single-line to keep toasts compact.

### 3.2 Non-functional

- Performance: No extra network calls; validation stays cheap; no noticeable UI lag on delete/log.
- Reliability:
  - No unhandled promise rejections from delete/log flows.
  - History view remains consistent with backend state after delete.
- Security:
  - Copy must not include stack traces, IDs, or backend internals.
  - Validation errors must not echo raw unsafe input.
- Operability:
  - Error feedback continues to go through `handleMutationError` for central control.
  - Logging and Sentry behavior remain unchanged or improved, never reduced.

### 3.3 Infrastructure / quality gates

- Quality gates:
  - Changes pass `pnpm lint`, `pnpm typecheck`, `pnpm test`.
  - Patch-level coverage around new/changed logic ≥ existing thresholds.
- Observability:
  - Delete failures still appear in logs/Sentry as today.
- Design consistency:
  - Reuse existing sonner toast patterns and AlertDialog.
  - Tone: concise, neutral, no emojis in error text.
- Security:
  - No new env vars or secrets.
  - Auth/ownership checks remain server-side (`requireAuth`, `requireOwnership`).

## 4. Architecture Decision

### 4.1 Selected approach

- Approach A (chosen): enforce a "throw on failure" contract for `onDelete` in history flow and tighten validation messages in-place in `convex/lib/validate.ts`.
  - History page:
    - `handleDelete` calls Convex `deleteSet` mutation and lets errors bubble.
    - UI component (`ExerciseSetGroup`) is responsible for catching and calling `handleMutationError(error, "Delete Set")` and for showing success toast only on resolved promise.
  - Validation:
    - Update error strings only; keep function signatures and call sites the same.
    - Preserve key substrings used by `getUserFriendlyMessage` (e.g., "Reps must", "Weight must") for mapping.

- Rationale:
  - High user value with minimal, local changes.
  - Deep module pattern: mutations throw; components decide how to present errors via `handleMutationError`.
  - Keeps the interface for `onDelete` tiny while hiding logging/toast complexity inside `handleMutationError` and UI components.

### 4.2 Alternatives

| Option     | Description                                                  | User value | Simplicity | Explicitness | Risk | Notes                                          |
| ---------- | ------------------------------------------------------------ | ---------- | ---------- | ------------ | ---- | ---------------------------------------------- |
| A (chosen) | Enforce throw-on-failure contract + update messages in-place | 5          | 5          | 4            | 1    | Small, targeted, matches existing flow         |
| B          | New `useDeleteSet` hook that always handles toasts + logging | 4          | 3          | 5            | 2    | Cleaner API but more refactors and indirection |
| C          | Backend error codes + client mapping layer                   | 3          | 2          | 5            | 3    | Bigger design; better suited to an ADR later   |

### 4.3 ADR check

- Scope: local UX behavior, no schema / infra / vendor changes.
- Reversible: easy to adjust messages or factor out to a hook later.
- ADR required: **No** (documented here; revisit if error-handling is standardized across the whole app).

## 5. Data & API Contracts

- `api.sets.deleteSet({ id: Id<"sets"> })`
  - Input: set id owned by current user (server enforces auth + ownership).
  - Behavior:
    - Resolves when delete succeeds.
    - Throws `Error` on failure (auth, ownership, not found, other).
- Frontend delete contract (History flow):
  - `onDelete(setId: Id<"sets">): Promise<void>`
    - Resolves only when backend delete succeeds.
    - Rejects on any error; caller must not swallow.
- Validation APIs (unchanged signatures):
  - `validateReps(reps: number): void`
  - `validateWeight(weight: number | undefined): number | undefined`
  - `validateUnit(unit: string | undefined, weight: number | undefined): void`
  - `validateDuration(duration: number | undefined): number | undefined`
  - `validateExerciseName(name: string): string`
  - Contract: same numeric rules and return types as today; only error message strings become more contextual.

## 6. Implementation Phases

- Phase 1 – MVP (this task)
  - Confirm and, if needed, adjust History page so `onDelete` respects throw-on-failure contract and relies on `ExerciseSetGroup` + `handleMutationError` for user feedback.
  - Ensure success toast in history shows only when delete resolves.
  - Update validation error messages in `convex/lib/validate.ts` with rationale + recovery hints while preserving mapping substrings.
  - Update unit tests in `src/lib/error-handler.test.ts` and add/adjust tests for new validation copy.

- Phase 2 – Hardening (optional follow-up)
  - Audit Today dashboard and other delete flows for consistent `onDelete` behavior and messaging.
  - Extract a shared pattern or hook (`useDeleteSet`) if duplication becomes noticeable.

- Phase 3 – Future
  - Consider error-code-based mapping and/or localization once the error surface grows.

## 7. Testing & Observability

### 7.1 Testing strategy

- Unit tests:
  - Adjust `handleMutationError` tests if they assert on exact validation strings.
  - Add tests for updated messages in any validation-specific tests.
- Component/unit tests:
  - History view + `ExerciseSetGroup`:
    - Success path: mock delete mutation to resolve → expect "Set deleted" toast, set removed from rendered list, dialog closed.
    - Failure path: mock delete mutation to reject → expect `handleMutationError` called with context "Delete Set", no success toast, set still rendered.
- (Future) E2E tests:
  - Playwright flow for log → delete → failure ensures user sees intelligible error and no phantom deletes.

### 7.2 Test scenarios (TDD checklist)

```markdown
## Test Scenarios

### Happy Path

- [ ] History delete success removes set and shows a single "Set deleted" toast.
- [ ] Valid reps, weight, duration, and exercise names pass validation without errors.
- [ ] Successful deletes/logs do not log errors or trigger error toasts.

### Edge Cases

- [ ] Delete fails due to network error; error toast appears, set remains visible.
- [ ] Delete fails due to auth/ownership error; permission-style message appears.
- [ ] Decimal reps (e.g., 2.5) are rejected with guidance that reps must be whole numbers.
- [ ] Blank weight is accepted for bodyweight sets; error message suggests leaving weight empty rather than entering 0.
- [ ] Duration at 0 or >86400 is rejected with clear lower/upper bound messaging; 1 and 86400 are accepted.

### Error Conditions

- [ ] "Not authenticated" errors map to "Please sign in to continue".
- [ ] "Not authorized" errors map to a permission message.
- [ ] "not found" errors map to "Item may have been deleted" message.
- [ ] Validation errors from `validate*` show updated, contextual messages in toasts.

### Security & Resilience

- [ ] Error toasts never include stack traces or raw error objects.
- [ ] Production logging for errors stays string-only and sanitized.
- [ ] `handleMutationError` gracefully handles `null` and non-Error inputs with a generic fallback toast.
```

### 7.3 Observability

- Keep existing console/Sentry behavior for thrown errors from Convex.
- No new log formats; any additional debugging info stays in dev-only console logs.

## 8. Risks & Mitigations

| Risk                                                 | Likelihood | Impact | Mitigation                                                                   | Owner       |
| ---------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------- | ----------- |
| Tests or docs rely on old validation strings         | Medium     | Low    | Update tests alongside changes; note copy changes in PR                      | Implementer |
| Inconsistent `onDelete` contracts across other flows | Medium     | Medium | Scope this task to History; log follow-up item for Today/dashboard           | Implementer |
| New messages still confuse some users                | Low        | Medium | Iterate on copy based on feedback; keep strings centralized for quick change | PM/Design   |

## 9. Open Questions / Assumptions

- Assumption: We do not need localization or theming of error messages yet; English-only strings in code are acceptable.
- Assumption: History page is the highest-impact area for delete feedback right now; Today/dashboard alignment can ship later.
- Question: Do we want separate copy for mobile vs desktop toasts (shorter on mobile)?
- Question: Should we treat bodyweight explicitly in the UI (checkbox) in a future task instead of relying only on error copy?
