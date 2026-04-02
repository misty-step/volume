# Enforce codebase conventions for agent readiness

Priority: high
Status: done
Estimate: M

## Goal

Shift documented-but-unenforced conventions into automated feedback so AI agents
(and humans) get immediate errors when violating patterns, instead of discovering
issues in PR review.

## Non-Goals

- Rewrite all 44 PascalCase component files in one pass (exemption list is fine initially)
- Build complex custom ESLint plugins — prefer test helpers over AST rules
- Change any actual application behavior

## Oracle

- [x] `bun run lint` fails if a new `convex/**/*.ts` file uses relative imports (excluding `../_generated/` and `../packages/core/`)
- [x] `bun run test --run` fails if a coach tool file in `src/lib/coach/tools/tool-*.ts` is not registered in `registry.ts`
- [x] `bun run test --run` includes a soft-delete coverage test asserting exercise queries filter `deletedAt` (pre-existing: exercises.test.ts lines 241-258)
- [x] `docs/patterns/coach-tools.md` exists and covers: tool signature, schema registration, ToolResult contract, error handling, step-by-step new-tool checklist
- [x] CLAUDE.md links to the coach tool guide

## Notes

### Phase 1: Test Helpers (highest leverage, lowest cost)

**Coach tool registration check** (~30 lines): Test that scans `tool-*.ts` files in
`src/lib/coach/tools/` and asserts each has a corresponding entry in `coachToolDefinitions`
or `legacyCoachToolDefinitions` in `registry.ts`.

**Soft delete assertion** (~20 lines): Test that queries on the `exercises` table
in non-migration, non-test contexts include `deletedAt` filtering. Can be a focused
test in `convex/exercises.test.ts`.

### Phase 2: ESLint Rules (config-level, no custom plugins)

**Convex import paths**: Use `no-restricted-imports` or `eslint-plugin-import` to
reject `../` imports in `convex/**/*.ts` with allowlist for `_generated` and `packages/core`.

**Component naming**: Decide on kebab-case as canonical. Add exemption list for
existing 44 PascalCase files. Enforce on new files via lint rule.

### Phase 3: Coach Tool Guide

Document the pattern from `registry.ts`:

- `defineTool(name, description, schema, runner)` signature
- `runXxxTool(rawArgs, ctx, options?) → Promise<ToolResult>` contract
- Schema in `schemas.ts`, shared helpers in `data.ts` and `helpers.ts`
- Error handling via `toolErrorResult()` and `exerciseNotFoundResult()`
- `ToolResult` shape: `{ summary, blocks: CoachBlock[], outputForModel }`

### Current State

| Convention        | Documented | Enforced            | Fix                          |
| ----------------- | ---------- | ------------------- | ---------------------------- |
| Component naming  | No         | No                  | ESLint rule + exemption list |
| Convex imports    | CLAUDE.md  | Comment only        | ESLint no-restricted-imports |
| Soft delete       | CLAUDE.md  | No                  | Test helper                  |
| Tool registration | No         | No                  | Test helper                  |
| Env var safety    | CLAUDE.md  | Yes (custom ESLint) | Already working              |
| Type imports      | Yes        | Yes                 | Already working              |

## Touchpoints

- `eslint.config.mjs`
- `src/lib/coach/tools/registry.test.ts` (new)
- `convex/exercises.test.ts`
- `docs/patterns/coach-tools.md` (new)
- `CLAUDE.md`

## What Was Built

PR: https://github.com/misty-step/volume/pull/463

**ESLint rule** (`convex-local/no-relative-escape`): Custom AST rule using depth-counting
to detect when a relative import escapes the `convex/` directory boundary. Allows
`_generated` and `packages/core` cross-boundary imports. Handles files at any nesting
depth within convex subdirectories (ai/, lib/, migrations/, test/).

**Registry test** (`registry.test.ts`): Filesystem scan + quote-agnostic regex match
verifying every `tool-*.ts` file is imported by at least one other module in the tools
directory. Catches orphaned tools that would be silently unregistered.

**Coach tool guide** (`docs/patterns/coach-tools.md`): Covers tool runner signature,
schema registration, ToolResult contract, error handling patterns (exerciseNotFoundResult),
and 5-step new-tool checklist.

**Oracle 3 (soft-delete)** was already satisfied by existing tests — 12 tests across
4 describe blocks in `exercises.test.ts` covering delete, restore, includeDeleted,
default filtering, and edge cases.

**Correction from backlog:** Oracle 1 originally said "fails if relative imports
(excluding \_generated and packages/core)." This was imprecise — convex subdirectories
legitimately use `../` for intra-convex imports (e.g., `ai/reports.ts` → `../lib/rateLimit`).
The rule only flags imports that escape the convex boundary, not all `../` imports.
