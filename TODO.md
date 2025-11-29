# TODO — Type Safety Restoration

Spec: `TASK.md` (Type Safety Restoration). DESIGN.md not present. Scope excludes test fixtures and runtime changes.

## Spec Analysis

- Modules: Convex backend (`ai/generate.ts`, `ai/reports.ts`, `crons.ts`, `exercises.ts`, `migrations/backfillMuscleGroups.ts`); frontend analytics/history (`report-navigator.tsx`, `analytics/page.tsx`, `history/page.tsx`, `Dashboard.tsx`, `useLastSet.ts`); tooling (`tsconfig.json`, `src/types/global.d.ts`).
- Dependencies: Convex `_generated/api` + `_generated/dataModel`; Clerk global; Next.js App Router; existing tests via `pnpm test`.
- Integration Points: `internal.*` Convex calls; `useQuery(api...)` invocations; shared Doc/Id types.
- Patterns: Use `Doc<"table">` and `Id<"table">`; remove `(internal as any)`; explicit action return types; import `api` instead of `(api as any)`.
- Risks: strict flags expose real bugs; mismatched action return shapes; Convex generated types stale (rerun `pnpm convex dev` if needed).
- Not in scope: feature changes, API surface changes, altering tests beyond typing.

## Tasks

- [x] Harden TypeScript config

  ```
  Files:
  - tsconfig.json
  Goal: enable strict flags per TASK §Phase 1.
  Approach:
  1. Add compilerOptions: strict, noUncheckedIndexedAccess, noImplicitReturns, noFallthroughCasesInSwitch, forceConsistentCasingInFileNames.
  2. Keep path aliases/excludes unchanged.
  3. Run quick `pnpm typecheck` dry-run to surface downstream fixes.
  Success Criteria:
  - Flags present in tsconfig and honored by tsc.
  - No new config errors beyond expected code fixes.
  Tests:
  - pnpm typecheck (after downstream fixes).
  Depends: none
  Estimate: 0.25h
  ```

- [x] Convex types — ai/generate

  ```
  Files:
  - convex/ai/generate.ts
  Goal: remove 15 `any` usages; add explicit action return types; drop `(internal as any)`.
  Approach:
  1. Import Id/Doc types from _generated/dataModel and api/internal helpers from _generated/api.
  2. Type action args/returns; ensure handlers return typed payloads (e.g., Id<"reports"> or shaped objects per implementation).
  3. Replace internal calls with typed `internal.ai...` and fix ctx.run* signatures.
  4. Add helper types if repeated (keep module deep, no pass-throughs).
  Success Criteria:
  - Zero `any` in file.
  - Internal calls compile without casts.
  - Action return types align with actual return values.
  Tests:
  - pnpm typecheck.
  - pnpm test --filter generate? (if present), otherwise rely on typecheck.
  Depends: Harden TypeScript config
  Estimate: 0.75h
  ```

- [x] Convex types — ai/reports

  ```
  Files:
  - convex/ai/reports.ts
  Goal: remove 8 `any`; add explicit return types for report actions/queries; fix internal calls.
  Approach:
  1. Import Doc/Id and api/internal types.
  2. Type handlers' args/returns (use interfaces for complex report results where needed).
  3. Replace `(internal as any)` patterns; ensure ctx.runAction/runQuery signatures correct.
  Success Criteria:
  - Zero `any` left.
  - All handlers have explicit Promise<...> return types matching actual objects.
  - Typecheck clean for file.
  Tests:
  - pnpm typecheck.
  Depends: Harden TypeScript config
  Estimate: 0.75h
  ```

- [x] Convex types — crons

  ```
  Files:
  - convex/crons.ts
  Goal: remove 12 `any`; type scheduled/internal calls.
  Approach:
  1. Import internal types; replace `(internal as any)`.
  2. Add return types to cron handlers where missing.
  3. Ensure args typed with Id/Doc or specific shapes.
  Success Criteria:
  - No `any` usage.
  - Cron registrations compile with typed internal references.
  Tests:
  - pnpm typecheck.
  Depends: Harden TypeScript config
  Estimate: 0.5h
  ```

- [~] Convex types — exercises + backfill migration

  ```
  Files:
  - convex/exercises.ts
  - convex/migrations/backfillMuscleGroups.ts
  Goal: remove 4 `any` total; ensure action/query returns use Id/Doc.
  Approach:
  1. Swap manual `any` with Doc/Id types from _generated/dataModel.
  2. Fix any `(internal as any)` occurrences.
  3. Confirm migration handlers return void/ids explicitly.
  Success Criteria:
  - Zero `any` across both files.
  - Actions/queries have explicit Promise return types.
  Tests:
  - pnpm typecheck.
  Depends: Harden TypeScript config
  Estimate: 0.25h
  ```

- [ ] Frontend types — analytics views

  ```
  Files:
  - src/components/analytics/report-navigator.tsx
  - src/app/(app)/analytics/page.tsx
  Goal: remove 6+2 `any`; correct api path usage; type query data.
  Approach:
  1. Import `api` from `@/../convex/_generated/api` and Doc/Id from dataModel.
  2. Replace `(api as any)` with typed `api.ai.reports.*`.
  3. Type filter/map callbacks with Doc<"reports">/Doc<"sets"> as appropriate; avoid inline `any`.
  Success Criteria:
  - No `any` in both files.
  - useQuery/useAction calls type-safe without casts.
  Tests:
  - pnpm typecheck.
  - Optional: pnpm test --run (if suites exist) for analytics components.
  Depends: Convex types (internal signatures stable)
  Estimate: 0.5h
  ```

- [ ] Frontend types — history/dashboard + hook

  ```
  Files:
  - src/app/(app)/history/page.tsx
  - src/components/dashboard/Dashboard.tsx
  - src/hooks/useLastSet.ts
  Goal: remove remaining frontend `any`; type set filtering and props.
  Approach:
  1. Use Doc<"sets"> for array filters/maps; add minimal helper types if needed.
  2. Ensure props/state use explicit types; avoid implicit any.
  3. Keep hook API stable; no runtime logic change.
  Success Criteria:
  - Zero `any` across files.
  - Hook and components compile under strict flags.
  Tests:
  - pnpm typecheck.
  Depends: Harden TypeScript config
  Estimate: 0.5h
  ```

- [ ] Add Clerk window type extension

  ```
  Files:
  - src/types/global.d.ts (new)
  Goal: declare optional `window.Clerk` with Clerk type.
  Approach:
  1. Create global.d.ts per TASK §Phase 4 snippet.
  2. Ensure tsconfig includes `src/types` in `typeRoots`/`include` (adjust only if needed).
  Success Criteria:
  - Global type recognized; no implicit any for window.Clerk.
  Tests:
  - pnpm typecheck.
  Depends: Harden TypeScript config
  Estimate: 0.25h
  ```

- [ ] Verification + regression guard
  ```
  Files:
  - n/a (commands)
  Goal: prove zero `any` and no regressions.
  Approach:
  1. Run pnpm typecheck.
  2. Run pnpm test --run.
  3. Run pnpm build.
  4. Run `grep -r "\: any" src/ convex/ --include="*.ts" --include="*.tsx" | grep -v ".test."` to confirm zero `any`.
  Success Criteria:
  - All commands succeed.
  - Grep returns empty.
  Tests:
  - Commands above.
  Depends: all tasks
  Estimate: 0.5h
  ```

## Critical Path

1. Harden TypeScript config → 2) Convex types — ai/generate → 3) Convex types — ai/reports → 4) Convex types — crons → 5) Convex types — exercises + backfill migration → 6) Frontend types — analytics views → 7) Frontend types — history/dashboard + hook → 8) Add Clerk window type extension → 9) Verification.

## Notes / Backlog

- If strict flags surface runtime bugs, fix inline within tasks; do not relax flags.
- If Convex generated types stale, rerun `pnpm convex dev` (manual step).
