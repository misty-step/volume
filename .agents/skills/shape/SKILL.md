---
name: shape
description: |
  Shape a raw idea into something buildable. Product + technical exploration.
  Spec, design, critique, plan. Output is a context packet.
  Use when: "shape this", "write a spec", "design this feature",
  "plan this", "spec out", "context packet", "technical design".
  Trigger: /shape, /spec, /plan, /cp.
argument-hint: "[idea|issue|backlog-item] [--spec-only] [--design-only]"
---

# /shape

Shape a raw idea into something buildable for Volume. Output is a **context
packet** — the unit of specification that `/implement` consumes before writing
a line of TypeScript, Convex function, or Playwright spec.

## Workflow

### Phase 1: Understand

Accept: raw idea, `backlog.d/*.md` item, GitHub Issue URL, incident note from
`INCIDENT-*.md` / `docs/postmortems/`, or a live observation (Sentry, Convex
logs, Canary dashboard).

Spawn parallel sub-agents to gather context fast. Minimum split:

- **Codebase mapper.** Anchor on `convex/schema.ts` for data shapes and
  `convex/_generated/api.d.ts` for the canonical Convex API (training data
  lies — check generated types). Then fan out: `convex/sets.ts`,
  `convex/exercises.ts`, `convex/analytics.ts` for mutations;
  `src/app/(app)/page.tsx` and the `useDashboard` / `useQuickLogForm` hooks
  for UI behavior; `src/lib/architecture-checker.ts` for boundary rules.
- **Prior-art scout.** Check `docs/adr/ADR-0001..0008` (rate limits, soft
  delete, Stripe, AI portfolio, subscription state),
  `docs/patterns/coach-tools.md`, `docs/state-diagrams/`,
  `docs/postmortems/`, and `backlog.d/_done/` for completed work in the
  neighborhood. Only fall through to `/research` or Exa after internal
  prior art is exhausted.

Synthesize findings before proceeding. Note which invariants (auth checks,
soft delete, `@/lib/logger` not being importable in Convex) apply.

### Phase 2: Product Exploration

**GATE: Do NOT write code, schema, or migrations until product direction is locked.**

1. **Investigate** — Problem space, who it hurts (logged-in lifter? coach
   turn? Stripe webhook consumer?), prior art in `backlog.d/_done/` and
   `docs/postmortems/`.
2. **Brainstorm** — 2-3 approaches with tradeoffs. **Recommend one.**
3. **Discuss** — One question at a time. Iterate until locked.
4. **Draft spec** — Goal, non-goals, acceptance criteria grounded in Volume
   surfaces (dashboard, coach chat, quick-log, paywall, `/api/health`).

### Phase 3: Technical Exploration

1. **Explore** — 3-5 structurally distinct approaches. For each: architecture
   sketch, target files (`convex/<x>.ts`, `src/app/(app)/<route>/page.tsx`,
   `src/lib/<y>.ts`, `packages/canary-sdk/*`), which Lefthook / Dagger gate
   protects it (`typecheck`, `architecture:check`, `test:coverage`, `build`,
   `security:audit`), effort, tradeoffs. **Recommend one.**

   Example axis of real divergence for Volume work: _inline Convex mutation_
   vs. _Convex action calling OpenRouter_ vs. _Next.js edge route hitting
   Convex via HTTP_. These fail differently (auth surface, cold-start cost,
   observability path) — that's the signal that you have three options, not
   one in three costumes.

2. **Validate** — For effort M or larger, spawn the design review bench in
   parallel: ousterhout reviews for module depth (is `useDashboard` getting
   another pass-through, or a real deep module?), carmack for shippability
   and over-engineering, grug for complexity. If the change crosses a
   documented boundary, invoke a cross-model second voice (Codex / Gemini /
   Thinktank) — same-model self-critique collapses to consensus. If any has
   blocking concerns, revise before proceeding.

3. **Discuss** — No limit on rounds. Design isn't ready until user says so.

### Phase 4: Context Packet

The output of shape. This is what `/implement` consumes. Optionally check the
packet into `backlog.d/<NNN>-<slug>.md` as the durable artifact; conversation
alone is not resilient to compaction.

```markdown
# Context Packet: <title>

## Goal

<1 sentence — what outcome, not mechanism>

## Non-Goals

- <what NOT to do, even if it seems like a good idea>
- e.g. "Do not touch Stripe webhook flow" / "No schema migration in this packet"

## Constraints / Invariants

- Every new Convex mutation verifies `ctx.auth.getUserIdentity()` + ownership
  before write.
- Exercises soft-delete via `deletedAt`; same-name re-create auto-restores;
  any history view passes `includeDeleted: true`.
- Inside `convex/`, use the `@/lib/...` alias (never relative imports) AND
  never import `@/lib/logger` — Convex runtime can't load Next.js modules;
  use `console.warn`.
- AI SDK conversations use `ModelMessage[]` from `'ai'`; append
  `response.messages` every turn. Never flatten.
- Coverage thresholds live in BOTH `vitest.config.ts` and
  `scripts/verify-coverage.ts` — move them together.
- Design: no single-side borders on rounded cards, no emojis (lucide-react
  SVGs only), accent color reserved for data numbers / trend peaks / totals.

## Authority Order

tests > type system > `convex/_generated/api.d.ts` > code > `docs/` > lore

## Repo Anchors

- `convex/schema.ts` — data shapes
- `convex/sets.ts` — core mutation pattern to follow (auth + ownership check)
- `src/app/(app)/page.tsx` — dashboard orchestrator entry
- `src/lib/architecture-checker.ts` — boundary rules enforced by `bun run architecture:check`

## Prior Art

- `convex/analytics.ts` — deep module analog
- `docs/adr/ADR-000X-<name>.md` — decision record for this boundary
- `backlog.d/_done/<NNN>-<similar>.md` — closest completed work

## Exemplar Techniques

- <technique from exemplars.md, if present> — <file to study during build>

## Oracle (Definition of Done)

Commands that return pass/fail, not prose.

- [ ] `bun run typecheck` clean
- [ ] `bun run lint` clean (eslint --max-warnings=0)
- [ ] `bun run architecture:check` clean
- [ ] `bun run test` green, including new `*.test.ts` colocated with source
- [ ] `bun run test:coverage` above thresholds (lines 52 / branches 83 /
      functions 73 / statements 52)
- [ ] `bun run test:e2e` green for affected flow (if UI path touched)
- [ ] `bun run build` succeeds
- [ ] `dagger call check --source .` green locally before push
- [ ] `curl https://volume.fitness/api/health | jq` returns healthy
      post-deploy (if shipping a health-relevant change)

## Implementation Sequence

1. Schema / type changes first (`convex/schema.ts`), regenerate via
   `bunx convex dev`.
2. Convex mutation / query with colocated `*.test.ts`.
3. Hook / UI wire-up under `src/`.
4. Playwright spec under `e2e/*.spec.ts` if flow is user-visible.
5. ADR update or new ADR under `docs/adr/` if crossing a documented boundary.

## Risk + Rollout

- Blast radius: <which routes / mutations / surfaces>.
- Rollback: revert commit; for Convex-only changes, redeploy prior via
  `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex deploy -y` from
  the prior SHA.
- Webhook-touching changes: Stripe webhook secret rotation touches BOTH
  Vercel and Convex env; call out explicitly.
- Release path: merge to master → release-please Release PR → merge = tag;
  Vercel auto-deploys Next.js.
```

If you can't write the oracle in commands, the goal isn't clear enough. Go
back to Phase 2.

## Gotchas

- **Premise unchallenged:** A shape request accepts the stated framing by
  default. Before Phase 2, five-whys the goal. If the backlog item says
  "add button X," name the underlying lifter outcome — the best path may
  not be X. A solid shape of the wrong problem is the failure mode this
  skill exists to prevent.
- **Alternatives-in-name-only:** Three "options" that are the same idea in
  three outfits is one option. For Volume work, real divergence usually
  cuts across the Convex/Next.js seam: inline mutation vs. Convex action
  vs. edge route; client hook vs. server component vs. Convex query
  subscription. If you can't articulate how each fails differently
  (auth surface, observability, cold-start, coverage impact), go back.
  The philosophy bench is persona diversity, not foundation diversity —
  also consult Codex/Gemini for heterogeneous signal.
- **Vague oracles:** "It should work" is not an oracle. "`bun run test
--run convex/sets.test.ts` passes and `/api/health` returns 200" is.
  See `references/executable-oracles.md`.
- **Checkbox oracles:** Prose checklists drift. Oracles are commands with
  exit codes (`bun run typecheck`, `bun run architecture:check`,
  `dagger call check --source .`), not paragraphs that require
  interpretation.
- **Speccing after building:** A context packet written after
  `convex/<x>.ts` is already edited is documentation, not specification.
  Spec first; the gate in Phase 2 is there for a reason.
- **50 repo anchors:** If everything is an anchor, nothing is. Pick 3-10
  files whose patterns MUST be followed — `convex/sets.ts` for auth,
  `convex/analytics.ts` for deep-module shape, the closest existing
  mutation/hook/route. Skip the rest.
- **Skipping non-goals:** Agents drift toward scope expansion. "Don't
  touch Stripe webhook," "no schema migration," "no new npm dep," "don't
  change coverage thresholds" are load-bearing. Write them.
- **Over-speccing implementation details:** Specify WHAT and WHY. Let the
  builder choose HOW. Detailed pseudocode cascades errors — the builder
  has `convex/_generated/api.d.ts` and the anchors, that's enough.
- **Coverage threshold trap:** A change that removes tests or adds
  untested code can silently push the suite under the `vitest.config.ts`
  thresholds. Name the expected coverage effect in the packet; the
  `test:coverage` gate runs on pre-push and blocks.
- **Editing shape docs without ripple check:** `backlog.d/` items with
  `shaping: true` frontmatter are live specs. Before editing, check: do
  linked ADRs or `docs/state-diagrams/` need updating? Does this ripple
  to other context packets? Edit the doc, then trace the consequences.
- **Boil the ocean:** Shape the finished thing. Include the ADR update,
  the Playwright spec, the rollback command, the env-verify step. If the
  real fix is five minutes further than the workaround, shape the real
  fix.

## Principles

- Minimize touch points (fewer files across the `src/` ↔ `convex/` seam =
  less risk)
- Design for deletion (easy to revert; easy to pull out of master)
- Favor existing patterns (`convex/sets.ts`, `useDashboard`) over novel ones
- YAGNI ruthlessly — `Code is a liability`
- Recommend, don't just list options
- One question at a time
