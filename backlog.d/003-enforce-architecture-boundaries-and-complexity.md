# Enforce architecture boundaries and complexity

Priority: high
Status: done
Estimate: M

## Goal

Add automated architecture checks so dependency direction, circularity, and complexity stop being convention-only.

## Non-Goals

- Large-scale codebase rewrites
- Decomposing every oversized module in one pass
- Replacing ESLint with another linter

## Oracle

- [x] [command] A repeatable check exists for architectural regressions and runs in local verification
- [x] [command] Circular dependency detection is either enforced or documented with explicit allowed exceptions
- [x] [command] Complexity or dead-code policy is machine-checked rather than prose-only
- [x] [behavioral] The new checks fail on real boundary violations

## Notes

Readiness review found missing enforcement for import direction, circular
dependencies, complexity limits, and dead code. `bunx madge --circular ...`
already reports generated-file cycles through `convex/_generated/api.d.ts`.

## Touchpoints

- `eslint.config.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `src/lib/lefthook-validator.ts`
- `convex/`
- `src/`

## What Was Built

- Added ESLint boundary guards that block hook-to-component runtime imports, prevent `src/lib/**` from reaching back into higher UI layers, and reserve `@/app/**` imports for `src/app/**`.
- Moved PR celebration runtime behavior into `src/lib/pr-celebration.ts` so hooks consume a library helper instead of a component module.
- Added a `madge`-backed `architecture:check` flow and wired it into `quality:full`, Lefthook pre-push, CI, and the lefthook config validator.
- Reintroduced a machine-checked complexity budget of `30` for production `src`, `convex`, and `packages/core` code, then refactored the current over-budget modules under that cap.
- Added regression tests for architecture boundary failures, complexity enforcement, circular dependency detection, and lefthook architecture wiring.

## Workarounds

- `bun run test:coverage` hit a transient `ENOENT` under `coverage/.tmp` when it ran in parallel with `bun run build`; removing `coverage/` and rerunning coverage in isolation passed cleanly.
