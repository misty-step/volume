# TODO – UX: Delete feedback & validation messages

- [x] Update Convex validation error messages

  ```
  Files:
  - convex/lib/validate.ts
  - convex/lib/validate.test.ts

  Goal: Make validation errors for reps, weight, duration, unit, and exercise name contextual and self-explanatory while keeping validation rules unchanged.

  Pattern: Follow existing numeric validation style; only adjust message text and associated tests.

  Approach:
  1. Update thrown error messages in each validate* function to include the allowed range/constraint plus a brief rationale or recovery hint (e.g., no half reps, leave weight empty for bodyweight).
  2. Preserve key substrings used by handleMutationError (e.g., "Reps must", "Weight must", "Unit must", "Exercise name", "Duration must") so mapping logic still recognizes validation messages.
  3. Keep each message to a single sentence/line suitable for toast display.
  4. Update convex/lib/validate.test.ts expectations to assert on the new messages (or stable substrings) without relaxing numeric/rounding assertions.

  Success Criteria:
  - [ ] All validate* functions enforce the same numeric and length constraints as before.
  - [ ] Each validation error message clearly communicates both constraint and recovery in one concise line.
  - [ ] All tests in convex/lib/validate.test.ts pass without reducing coverage or removing edge-case checks.

  Tests:
  - Unit: convex/lib/validate.test.ts

  Dependencies: None

  NOT in scope:
  - Changing numeric ranges, optionality, or validation logic.
  - Introducing structured error codes or new validation helpers.

  Estimate: 1h
  ```

- [x] Ensure handleMutationError passes validation messages through unchanged

  ```
  Files:
  - src/lib/error-handler.ts
  - src/lib/error-handler.test.ts

  Goal: Guarantee that all Convex validation error messages (including duration) are shown verbatim in toasts, while auth/permission and unknown errors keep existing mappings.

  Pattern: Extend current keyword-based mapping in getUserFriendlyMessage; mirror existing tests for reps/weight/unit/exercise name.

  Approach:
  1. Review getUserFriendlyMessage mappings and add coverage for duration messages (e.g., detect "Duration must").
  2. Confirm updated Convex validation messages from validate* still contain the expected keywords used by the mapping logic.
  3. Add tests asserting that errors containing each validation keyword ("Reps must", "Weight must", "Unit must", "Exercise name", "Duration must") are passed through unchanged to toast.error.
  4. Verify that auth, authorization, not-found, duplicate, and unknown errors still map to their existing friendly messages.

  Success Criteria:
  - [ ] Validation errors for reps, weight, duration, unit, and exercise name appear in the UI exactly as thrown by Convex.
  - [ ] Existing tests in src/lib/error-handler.test.ts remain green, with new tests covering duration messages.
  - [ ] Logging behavior (sanitized string in production, full object in development) remains unchanged.

  Tests:
  - Unit: src/lib/error-handler.test.ts

  Dependencies:
  - Update Convex validation error messages (task above), so mapping aligns with final copy.

  NOT in scope:
  - Adding new toast variants or changing toast durations.
  - Emitting additional logs or Sentry events.

  Estimate: 45m
  ```

- [ ] Add delete flow tests for ExerciseSetGroup

  ```
  Files:
  - src/components/dashboard/exercise-set-group.tsx
  - src/components/dashboard/exercise-set-group.test.tsx (new)

  Goal: Verify that ExerciseSetGroup implements the delete UX contract: calls onDelete, shows "Set deleted" on success, routes failures through handleMutationError, and never shows a success toast on failure.

  Pattern: Follow testing style from src/components/dashboard/quick-log-form.test.tsx and exercise-manager.test.tsx (React Testing Library + vitest mocks).

  Approach:
  1. Create src/components/dashboard/exercise-set-group.test.tsx with necessary providers (e.g., WeightUnitContext) to render ExerciseSetGroup in isolation.
  2. Add a "delete success" test:
     - Mock onDelete to resolve.
     - Mock toast.success and handleMutationError.
     - Simulate clicking the delete button and confirming in the AlertDialog.
     - Assert onDelete is called with the correct set id, toast.success is called once with "Set deleted", and handleMutationError is not called.
  3. Add a "delete failure" test:
     - Mock onDelete to reject with an Error.
     - Mock handleMutationError and toast.success.
     - Simulate the same delete flow and assert handleMutationError is called with the error and context "Delete Set", and toast.success is not called.
  4. Add assertions around loading state:
     - Verify that while delete is in-flight, the delete button is disabled.
     - Ensure buttons are re-enabled after both success and failure paths.

  Success Criteria:
  - [ ] Tests cover both success and failure delete flows for a single set.
  - [ ] handleMutationError("Delete Set") is invoked on failures, and "Set deleted" toast appears only on success.
  - [ ] No regressions are introduced in Dashboard or history views that consume ExerciseSetGroup.

  Tests:
  - Unit/component: src/components/dashboard/exercise-set-group.test.tsx

  Dependencies:
  - History page continues to pass a simple async onDelete handler that calls the Convex delete mutation and lets errors bubble.

  NOT in scope:
  - Adding bulk-delete functionality or modifying ChronologicalGroupedSetHistory layout.
  - Changing styling, animation, or copy for non-error UI states.

  Estimate: 1h
  ```

- [ ] Pre-PR quality check for UX delete & validation changes

  ```
  Files:
  - (no code changes; commands only)

  Goal: Ensure all quality gates pass after implementing validation copy changes, error mapping, and delete UX tests.

  Approach:
  1. Run pnpm lint and pnpm typecheck to confirm no type or lint errors in updated files.
  2. Run pnpm test --run --coverage and verify that tests for convex/lib/validate, src/lib/error-handler, and ExerciseSetGroup all pass, with healthy patch coverage.
  3. Run pnpm build to ensure the production bundle still builds with existing env requirements (Clerk/Convex env vars).
  4. Skim vitest coverage report for changed files to confirm no obvious blind spots in new branches.

  Success Criteria:
  - [ ] Lint, typecheck, unit tests, and build all succeed locally.
  - [ ] Coverage for changed files meets or exceeds existing project thresholds.
  - [ ] No new console warnings or runtime errors related to these changes appear during a quick manual smoke test in dev.

  Tests:
  - Commands: pnpm lint, pnpm typecheck, pnpm test --run --coverage, pnpm build

  Dependencies:
  - All preceding implementation tasks for this feature are complete.

  NOT in scope:
  - Adding new CI jobs or modifying GitHub Actions workflows.
  - Writing end-to-end Playwright scenarios (can be a separate backlog item).

  Estimate: 30m
  ```
