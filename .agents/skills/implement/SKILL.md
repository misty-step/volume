---
name: implement
description: |
  Atomic TDD build skill. Takes a context packet (shaped ticket) and
  produces code + tests on a feature branch. Red → Green → Refactor.
  Does not shape, review, QA, or ship — single concern: spec to green tests.
  Use when: "implement this spec", "build this", "TDD this", "code this up",
  "write the code for this ticket", after /shape has produced a context packet.
  Trigger: /implement, /build (alias).
argument-hint: "[context-packet-path|ticket-id]"
---

# /implement

Spec in, green tests out. One packet, one feature branch, one concern.
Volume stack: Next.js 16 + Convex + Clerk + Stripe + OpenRouter (AI SDK v6)

- Sentry + Canary + Tailwind/shadcn + Vitest + Playwright, bun.

## Invariants

- Trust the context packet from `/shape`. Do not reshape. Do not re-plan.
- If the packet is incomplete, **fail loudly** — do not invent the spec.
- `bun run architecture:check` must pass. Boundary rules in
  `src/lib/architecture-checker.ts` are load-bearing, not advisory.

## Contract

**Input.** A context packet from `/shape`: goal, non-goals, constraints,
repo anchors (target files like `convex/sets.ts`, `src/hooks/useDashboard.ts`),
oracle (executable preferred), implementation sequence. Resolution order:

1. Explicit path argument (`/implement backlog.d/010-evaluate-byok.md`)
2. Backlog item ID (`/implement 010`) → resolves via `backlog.d/<id>-*.md`
3. Last `/shape` output in the current session
4. **No packet found → stop.** Do not guess the spec from a title.

Required packet fields (hard gate — missing any = stop):

- `goal` (one sentence, testable)
- `oracle` (executable `bun run …` commands preferred over prose)
- `implementation sequence` (ordered steps, or explicit "single chunk")

See `references/context-packet.md` for the full shape.

**Output.**

- Code + colocated tests on a feature branch (`<type>/<slug>` off current)
- `bun run test` green (new + existing), `bun run typecheck` clean,
  `bun run lint` clean, `bun run architecture:check` passes
- Working tree clean (no debug prints, no scratch files)
- Conventional Commits — one logical unit per commit
  (commitlint enforces via lefthook commit-msg)
- Final message: branch ref + oracle checklist status

**Stops at:** green tests + clean tree + architecture green. Does not run
`/code-review`, `/qa`, `/ci`, or open a PR. Lefthook pre-push will
re-run `test:coverage`, `security:audit`, `architecture:check`, and
`build` — that is `/ci`'s concern, not this skill's.

## Workflow

### 1. Load and validate packet

Resolve the packet (order above). Parse required fields. If any are missing
or vague ("add coach tool X" with no oracle), stop with:

> Packet incomplete: missing <field>. Run /shape first.

Do not try to fill in the gaps. Shape is a different skill's judgment.

### 2. Create the feature branch

`git checkout -b feat/<concise-description>` (or `fix/`, `refactor/`,
etc.) from the current branch. Builders never commit to master. If you
forget, create the branch after and cherry-pick before handing off.

If the packet crosses a Convex schema boundary, update `convex/schema.ts`
and run `bunx convex dev` **once** so `convex/_generated/api.d.ts`
regenerates before any further edits. Stale generated types cause
spurious typecheck failures that look like spec bugs.

### 3. Dispatch the builder

Spawn a **builder** sub-agent (general-purpose) with:

- The full context packet
- The executable oracle (`bun run test:affected`, `bun run typecheck`,
  `bun run architecture:check`, and any Playwright spec in `e2e/`)
- The TDD mandate (see below)
- File ownership (if the packet decomposes into disjoint chunks — e.g.
  a Convex mutation in `convex/` and a UI hook in `src/hooks/` — spawn
  parallel builders, each owning one directory)

**Builder prompt must include:**

> You MUST write a failing test before production code. RED → GREEN →
> REFACTOR → COMMIT. Tests colocate with source (`foo.test.ts` beside
> `foo.ts`); Convex tests live inside `convex/` using convex-test.
> Red: add the failing test and confirm with `bun run test:affected`.
> Green: minimum change to pass. Refactor: `bun run lint:fix`, then
> `bun run typecheck && bun run test`.
> Exceptions to TDD-first: config files, `convex/_generated/*`, UI
> layout. Document any skipped-TDD step inline in the commit message.

**Volume invariants the builder must honor:**

- Every Convex mutation: `const identity = await ctx.auth.getUserIdentity()`
  at top, then ownership check (`row.userId === identity.subject`)
  before any mutate/read.
- Imports in `convex/` use `@/lib/...` alias — never relative. Never
  import `@/lib/logger` from Convex runtime; use `console.warn`.
- Exercise deletes are soft (`deletedAt`); history queries pass
  `includeDeleted: true`; same-name create auto-restores (see
  `convex/exercises.ts`).
- Coach tools (`src/lib/coach/`): conversation is `ModelMessage[]` from
  `ai`, not `{role, content}`. Append `response.messages` from
  `streamText` each turn. Never suppress `assistantText`. Use
  `exerciseNotFoundResult()` from `src/lib/coach/tools/helpers.ts` for
  missing-exercise errors — don't inline the object.
- UI: shadcn primitives from `@/components/ui/*`, light+dark+system
  themes, lucide-react icons (no emojis), PaywallGate wraps premium
  features, wordmark respects `env(safe-area-inset-top)`.

See `references/tdd-loop.md` for the full cycle and skip rules.

### 4. Verify exit conditions

Before exiting, confirm:

- [ ] `bun run test` exits 0 (run it yourself; `test:affected` during
      the loop, full `test` before handoff)
- [ ] `bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] `bun run architecture:check` exits 0
- [ ] Every oracle command in the packet exits 0
- [ ] `git status` clean (no untracked debug files, no stray
      `convex/_generated/` noise)
- [ ] No `TODO`/`FIXME`/`console.log` added that isn't in the spec
      (API routes use `createChildLogger`; Convex uses `console.warn`
      — both intentional)
- [ ] Commits are logically atomic and Conventional

If any check fails, dispatch a builder sub-agent to fix. Max 2 fix loops,
then escalate.

### 5. Hand off

Output: feature branch name, commit list, oracle checklist (which
`bun run …` commands pass), residual risks. Do not run review, do not
merge, do not push unless the packet explicitly says so. `/code-review`
handles review, `/qa` handles live-app checks, `/ci` handles the
lefthook pre-push gates and `dagger call check --source .`.

## Scoping Judgment (what the model must decide)

- **Test granularity.** One behavior per test. `src/test/setup.ts` is
  the shared harness; Vitest runs jsdom with `pool: forks, maxForks: 4`.
  If you can't name the behavior in one short sentence, the test is too big.
- **When to skip TDD.** Config files, `convex/_generated/*`, pure
  Tailwind/shadcn layout. Document the skip in the commit. Everything
  else — mutations, hooks, coach tools, API routes — test first.
- **When to escalate.** Builder loops on the same test failure 3+
  times, the oracle contradicts a Volume invariant (e.g. demands a
  Convex mutation without auth check), or coverage drops below
  thresholds (lines 52, branches 83, functions 73, statements 52 —
  enforced by `bun run test:coverage` on pre-push).
- **Parallelism.** Disjoint file ownership only. `convex/sets.ts` +
  `src/hooks/useDashboard.ts` = parallel. Two builders touching the
  same mutation = serial.
- **Refactor depth.** The refactor step is local — improve the code
  you just wrote. Broader refactors are `/refactor`'s job.

## What /implement does NOT do

- Pick tickets (caller's job, or `/deliver` / `/flywheel`)
- Shape or re-shape specs (→ `/shape`)
- Code review (→ `/code-review`)
- QA against the running app — live Clerk/Stripe/OpenRouter smoke tests
  (→ `/qa`)
- Run full lefthook / `dagger call check --source .` gates (→ `/ci`)
- Simplification passes beyond TDD refactor (→ `/refactor`)
- Ship, merge, deploy — `bunx convex deploy`, Vercel promote
  (→ human, or `/settle`)

## Stopping Conditions

Stop with a loud report if:

- Packet is incomplete or ambiguous
- Oracle is unverifiable (prose-only checkboxes with no `bun run …`
  form — write one, or stop)
- Builder fails the same test 3+ times after targeted fix attempts
- Spec contradicts a Volume invariant (auth check, soft delete,
  architecture boundary, ModelMessage contract)
- Tests hit an external dependency that isn't available (real Stripe
  webhook, live OpenRouter) — mock it or stop

**Not** stopping conditions: spec is hard, unfamiliar area of `convex/`,
initial tests red. Those are the job.

## Gotchas

- **Reshaping inside /implement.** If the spec is wrong, stop. Don't
  silently rewrite the oracle to match what you built.
- **Declaring victory with partial oracle.** "Most tests pass" is not
  green. Every `bun run …` in the oracle exits 0, or you're not done.
- **Silent catch-and-return.** New code that swallows exceptions and
  returns fallbacks is hiding bugs. `log.warn(msg, ctx)` for expected
  failures, `reportError` for unexpected. Never empty `catch {}`.
- **Testing implementation, not behavior.** Tests that assert the
  structure of the code break on every refactor. Test what the code
  does from the outside — a Convex mutation is tested via convex-test
  harness, a hook via render + interaction, not internal state shape.
- **Committing debug noise.** `console.log`, `print("here")`,
  commented-out code. The tree must be clean before exit. In API
  routes use `createChildLogger({ route })`; in Convex use
  `console.warn` — both are intentional, not debug.
- **Skipping TDD without documenting.** `convex/_generated/*` and
  Tailwind layout are fine exceptions; silently skipping because "it
  was simpler" is not.
- **Parallelizing coupled builders.** Two builders editing
  `convex/sets.ts` and `convex/schema.ts` together = merge pain.
  Partition by file ownership before parallel dispatch.
- **Branch drift.** Forgetting to `git checkout -b feat/<slug>` and
  committing to master. Always branch first.
- **Scope creep from builders.** Builder adds "while I'm here"
  improvements. The spec is the constraint — raise a blocker, don't
  silently expand the diff.
- **Trusting self-reported success.** Builders say "all tests pass."
  Run `bun run test && bun run typecheck && bun run lint && bun run architecture:check`
  yourself. Agents lie (accidentally).
- **Stale Convex generated types.** After touching `convex/schema.ts`
  or adding a mutation, if typecheck screams about missing
  `api.foo.bar`, run `bunx convex dev` once to regenerate
  `convex/_generated/api.d.ts`, then re-typecheck.
- **Re-validating after `v.union`.** Convex validates args before the
  handler runs. A second validation block inside the handler is dead
  code — delete it.
