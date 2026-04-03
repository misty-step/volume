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

## What Was Built

- Added a first-party `ArchitectureChecker` plus `scripts/verify-architecture.ts`
  and wired it into `bun run architecture:check`, pre-push Lefthook, CI, and
  `quality:full`.
- Enforced boundary rules for `convex`, `src/components`, `src/hooks`, and
  `src/lib`, with one explicit exception for
  `src/lib/coach/presentation/registry.tsx`.
- Added cycle detection over tracked `src/` and `convex/` modules, excluding
  generated and test artifacts.
- Added a conservative ESLint complexity gate (`40`) so complexity is enforced
  without forcing unrelated refactors in this item.
- Added regression tests for boundary failures, `require(...)` bypasses,
  exception scope, CI job wiring, and complexity enforcement.

## Workarounds

- The complexity threshold is intentionally conservative because the current
  baseline already exceeds stricter limits in several untouched modules.
- Boundary checking follows repo path aliases from `tsconfig.json`, with a small
  fallback alias set so checker tests do not depend on a fixture-local tsconfig.

## Touchpoints

- `eslint.config.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `.lefthook.yml`
- `scripts/verify-architecture.ts`
- `eslint.config.test.ts`
- `src/lib/architecture-checker.ts`
- `src/lib/architecture-checker.test.ts`
- `src/lib/ci-workflow.test.ts`
- `src/lib/lefthook-validator.ts`
- `src/lib/lefthook-validator.test.ts`
- `convex/`
- `src/`
