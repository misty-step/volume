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

- Added a first-party architecture verification path via
  `scripts/verify-architecture.ts` and `bun run architecture:check`, then wired
  it into CI, pre-push Lefthook, and `bun run quality:full`.
- Added `src/lib/architecture-checker.ts` as the verification engine plus
  `src/lib/architecture-policy.ts` to hold repo-specific boundary policy and
  explicit exceptions.
- Enforced cycle/boundary checks across `src/`, `convex/`, and `packages/core/`
  with TypeScript-aware module resolution so repo aliases and JSONC `tsconfig`
  files stay supported.
- Added a conservative ESLint complexity gate (`40`) for `src/**/*` and
  `convex/**/*.ts`, with regression coverage for both normal and excluded
  generated files.
- Added regression tests for CI wiring, Lefthook/package contract enforcement,
  JSONC alias resolution, packages/core boundaries, JS test ignores, and
  real-boundary failure cases.

## Workarounds

- The complexity threshold stays intentionally conservative because stricter
  defaults would force unrelated refactors in untouched modules.
- Boundary checking still keeps one explicit exception for
  `src/lib/coach/presentation/registry.tsx`, which remains the sanctioned bridge
  into coach presentation components.

## Touchpoints

- `eslint.config.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `.lefthook.yml`
- `scripts/verify-architecture.ts`
- `eslint.config.test.ts`
- `src/lib/architecture-policy.ts`
- `src/lib/architecture-checker.ts`
- `src/lib/architecture-checker.test.ts`
- `src/lib/ci-workflow.test.ts`
- `src/lib/lefthook-validator.ts`
- `src/lib/lefthook-validator.test.ts`
- `packages/core/`
- `convex/`
- `src/`
