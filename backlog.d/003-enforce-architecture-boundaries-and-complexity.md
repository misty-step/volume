# Enforce architecture boundaries and complexity

Priority: high
Status: ready
Estimate: M

## Goal

Add automated architecture checks so dependency direction, circularity, and complexity stop being convention-only.

## Non-Goals

- Large-scale codebase rewrites
- Decomposing every oversized module in one pass
- Replacing ESLint with another linter

## Oracle

- [ ] [command] A repeatable check exists for architectural regressions and runs in local verification
- [ ] [command] Circular dependency detection is either enforced or documented with explicit allowed exceptions
- [ ] [command] Complexity or dead-code policy is machine-checked rather than prose-only
- [ ] [behavioral] The new checks fail on real boundary violations

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
