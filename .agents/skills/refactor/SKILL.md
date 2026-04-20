---
name: refactor
description: |
  Branch-aware simplification and refactoring workflow. On feature branches,
  compare against base and simplify the diff before merge. On primary branch,
  scan the full codebase, research prior art, and identify the highest-impact
  simplification opportunity.
  Use when: "refactor this", "simplify this diff", "clean this up",
  "reduce complexity", "pay down tech debt", "make this easier to maintain",
  "make this more elegant", "reduce the number of states", "clarify naming".
  Trigger: /refactor.
argument-hint: "[--base <branch>] [--scope <path>] [--report-only] [--apply]"
---

# /refactor

Reduce complexity without reducing correctness in Volume (Next.js 16 + Convex +
Clerk + Stripe + OpenRouter/AI SDK v6). Favor fewer states, clearer names,
stronger invariants, better tests, and current docs. Deletion first, then
consolidation, then abstraction, then mechanical cleanup.

## Branch-Aware Routing

Detect the current branch and primary branch first:

1. Current: `git rev-parse --abbrev-ref HEAD`
2. Primary: `master` (Volume's canonical branch; PRs land via squash,
   release-please handles tags)

If current branch != `master`: run **Feature Branch Mode**.
If current branch == `master`: run **Primary Branch Mode**.

If current branch resolves to `HEAD`, the primary branch cannot be discovered,
or the detected base is ambiguous, stop and require `--base <branch>`. Fail
closed rather than computing the wrong diff.

`--base <branch>` overrides detected base (defaults to `origin/master`).
`--scope <path>` limits analysis and edits to one subtree (e.g. `convex/`,
`src/components/coach/`, `packages/*`).
`--report-only` disables file edits.
`--apply` allows edits in primary-branch mode (otherwise report + backlog shaping only).

Detailed simplification methodology lives in `references/simplify.md`.

## Feature Branch Mode (default on PR branches)

Goal: simplify what changed between `master...HEAD` before the squash merge.

### 1. Map the delta

- `git fetch origin master && git diff --stat master...HEAD`
- Establish baseline green on pre-refactor state: `bun run test:affected`
- Identify high-leverage simplification targets in the diff:
  - pass-through layers (especially shallow hooks in `src/hooks/*`)
  - duplicate helpers (check `lib/analytics.ts` vs `convex/analytics.ts`)
  - unclear naming
  - unnecessary state branches
  - over-modeled state or mode flags
  - tests that assert implementation instead of behavior
  - stale docs/comments in changed areas
  - unlogged PII leaks: `rg "console\.(log|warn|error)" src/` (use `@/lib/logger`)
  - escape hatches: `rg "@ts-expect-error|@ts-ignore|eslint-disable"`
  - debt comments failing the Torvalds Test: `rg "TODO|FIXME|XXX"`

### 2. Parallel exploration bench

Launch at least three subagents in parallel:

- **Diff Cartographer (Explore):** map responsibilities and complexity smells in changed modules; cross-reference ARCHITECTURE.md
- **Simplification Planner (Plan):** propose deletion/consolidation-first refactor options; respect Volume invariants
- **Quality Auditor (Explore):** spot test/documentation gaps; run `bun run architecture:check` for boundary violations

Each subagent returns: top findings, one recommended change, confidence, risk.

### 3. Synthesize and choose

Rank opportunities by:
`(complexity removed * confidence) / implementation risk`

Prefer:

1. deletion
2. consolidation
3. state-space reduction and invariant tightening
4. naming clarification
5. abstraction (aim for deep modules like `useDashboard`, `useQuickLogForm`, `convex/analytics.ts`)
6. mechanical refactor (`bun run lint:fix && bun run format`)

### 4. Execute (unless `--report-only`)

Dispatch a builder subagent for exactly one bounded refactor. Keep the PR
within its original intent — never enlarge the diff.

Each refactor must include:

- behavior-preserving tests (new or updated)
- obvious naming improvements where needed
- doc updates for changed contracts (ARCHITECTURE.md, docs/api-contracts.md, docs/adr/)
- state reduction when the existing design encodes more modes than the behavior needs
- Conventional Commits (`feat:`, `fix:`, `refactor:`) — Lefthook validates

### 5. Verify

Tight loop between iterations:

```
bun run typecheck && bun run test:affected && bun run architecture:check
```

Pre-push (all must pass):

```
bun run quality:full   # typecheck && lint && architecture:check && test:coverage && build
```

Full CI parity (Docker required):

```
dagger call check --source .
```

Complexity must be reduced, not moved. If available, run `assess-simplify`
and require `complexity_moved_not_removed=false`.

## Primary Branch Mode (default on `master`)

Goal: find the single highest-impact simplification for the codebase itself.
This mode is designed to be safe for scheduled runs.

### 1. Build a hotspot map

Use evidence from:

- churn (`git log --name-only`) weighted against directory pressure (`tokei .`)
- coverage hot/cold paths: `bun run test:coverage`
- boundary violations and cycles: `bun run architecture:check` (via
  `src/lib/architecture-checker.ts`)
- test weight per module: `find src -name "*.test.*" | xargs wc -l | sort -n`
- recurring failure domains from `backlog.d/`, `docs/postmortems/`, GitHub Issues
- escape hatches and debt markers (`rg` passes listed above)

### 2. Parallel strategy bench

Launch at least three subagents in parallel:

- **Topology Mapper (Explore):** locate architectural complexity hotspots against ARCHITECTURE.md's deep-module list
- **Deletion Hunter (Explore):** identify dead code, compatibility shims, and TODOs that don't pass the Torvalds Test
- **Rebuild Strategist (Plan):** propose the cleanest from-scratch shape for one hotspot without violating Volume invariants

### 3. External calibration

Invoke `/research` for the target domain (Convex patterns, AI SDK v6
conversation shape, Stripe webhook idempotency, Clerk JWT flow) before final
recommendation. Do not assert architecture choices from memory.

### 4. Produce outcome

Default (safe): no code edits. Instead:

- choose one winning candidate
- optionally list up to two runners-up as appendix only
- shape the winning opportunity into a concrete backlog item in `backlog.d/`
  with impact (LOC removed, complexity reduced, boundary clarified), cost,
  target files, and an oracle

If `--apply` is explicitly set:

- implement exactly one low-risk, bounded simplification
- run `bun run quality:full`
- record residual risk and follow-up items

## Volume-Specific Targets and No-Go Zones

**Good targets:**

- Shallow pass-throughs in `src/hooks/*`
- `lib/analytics.ts` consolidation with `convex/analytics.ts` typed helpers
- Inlined coach-tool error blocks that should call `exerciseNotFoundResult()`
  from `src/lib/coach/tools/helpers.ts`

**Leave alone:**

- `src/components/ui/*` — intentional shadcn wrappers; only refactor if real behavior clusters there
- `convex/analytics.ts` — deep by design; extend rather than split
- `convex/crons.ts` — document each job inline, don't extract prematurely

**Preserve these invariants (never refactor away):**

- `ctx.auth.getUserIdentity()` + ownership checks on every Convex mutation
- Soft delete on exercises (`deletedAt`); `includeDeleted: true` on history queries
- Rate limiting via `rateLimits` table + `assertRateLimit` (ADR-0001)
- `PaywallGate` wrapper around premium features
- Subscription state machine in `convex/users.ts` (ADR-0006)
- Stripe webhook signature verification in `convex/http.ts` (ADR-0003)
- Coverage thresholds must stay equal in both `vitest.config.ts` and
  `scripts/verify-coverage.ts`
- AI SDK conversation shape: `ModelMessage[]` with `response.messages`
  appended every turn — flattening to `{role, content}` is a regression
- `@/lib/logger` cannot be imported into `convex/` (Convex can't import
  Next.js modules) — use `console.warn` there

## Required Output

```markdown
## Refactor Report

Mode: feature-branch | primary-branch
Target: <branch or scope>

### Candidate Opportunities

1. [winning candidate] — LOC removed, complexity reduced, boundary clarified, risk, confidence

### Optional Runners-Up

1. [runner-up]
2. [runner-up]

### Selected Action

[what was applied, or backlog.d/ item created]

### Verification

[bun run quality:full / dagger call check --source . / assess-simplify results]

### Residual Risks

[what remains and why]
```

## Gotchas

- **Complexity moved, not removed:** splitting `convex/analytics.ts` into two equally complex modules is not simplification.
- **"Refactor everything":** broad edits destroy reviewability on squash merges. Keep each pass bounded.
- **Skipping branch mode detection:** feature branches and `master` have different risk envelopes.
- **Applying risky changes on master by default:** primary mode defaults to report + backlog shaping.
- **No oracle for a proposed refactor:** if you cannot state how success is measured, the proposal is not ready.
- **Chasing aesthetic churn:** clearer names and fewer states matter; style-only motion does not.
- **Parallelizing dependent edits:** only parallelize disjoint slices.
- **Half-refactored commits:** Carmack-always-shippable — finish the move or revert it. Keep green between commits.
- **Inlining coach-tool errors:** every handler uses `exerciseNotFoundResult()` — do not expand the inline shape.
- **Dropping `response.messages`:** flattening AI SDK conversation history breaks multi-turn tool context.
