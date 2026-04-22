---
name: groom
description: |
  Backlog management, brainstorming, architectural exploration, project bootstrapping.
  File-driven backlog via backlog.d/. Parallel investigation bench, synthesis protocol,
  themed recommendations. Product vision + technical excellence.
  Use when: backlog session, "groom", "what should we build", "rethink this",
  "biggest opportunity", "backlog", "prioritize", "tidy", "scaffold".
  Trigger: /groom, /backlog, /rethink, /moonshot, /scaffold, /tidy.
argument-hint: "[explore|rethink|moonshot|scaffold|tidy] [context]"
---

# /groom

Strategic backlog management for Volume. Parallel investigation, synthesis, themed recommendations.

## Execution Stance

You are the executive orchestrator.

- Keep synthesis, prioritization, and recommendation decisions on the lead model.
- Delegate investigation and evidence gathering to focused subagents.
- Run independent investigators in parallel by default.
- For fuzzy ideas, route to `/office-hours` before grooming. For "right problem?" doubts,
  route to `/ceo-review`. For research-heavy threads, route to `/research` or `/model-research`.
  Grooming converts shaped output into `backlog.d/` items; `/shape` then turns those into
  context packets consumed by `/implement`.

## Modes

| Mode                  | Intent                                                                              |
| --------------------- | ----------------------------------------------------------------------------------- |
| **explore** (default) | Parallel investigation → synthesized themes → prioritized backlog items             |
| **rethink**           | Deep architectural exploration of a target system → one clear recommendation        |
| **moonshot**          | Explore variant — Strategist thinks from first principles, ignoring current backlog |
| **scaffold**          | Project bootstrapping — quality gates, test infrastructure, CI, linting             |
| **tidy**              | Prune, reorder, archive completed items                                             |

## Backlog Format: backlog.d/

```
backlog.d/
├── 002-parallelize-and-cache-quality-checks.md
├── 005-harden-runtime-observability-paths.md
├── 010-evaluate-byok-open-source-api-first-pivot.md
└── _done/
    └── 001-initial-scaffold.md
```

Numbering: `NNN-<slug>.md`. Pick the next integer in sequence — inspect the current
directory before assigning. GitHub issues (`gh issue list --state=open`) are a parallel
channel; cross-link instead of duplicating.

Each file follows the Volume item template:

```markdown
# <NNN> <Title>

**Status:** open
**Priority:** <high|med|low>
**Created:** <ISO date>
**Source:** <groom session | incident | feedback | ADR>

## Context

<1–3 paragraphs: why this matters now; prior art link; constraint>

## Outcome

<one-sentence testable outcome>

## Shape cues

- Files likely touched: <paths>
- Gate impact: <which of typecheck/architecture/test:coverage/build surfaces>
- Related ADR: <docs/adr/ADR-NNNN.md>
- Related postmortem / incident: <path>

## Not in scope

<what is explicitly excluded>
```

Closure markers for manual landings in commit messages:

- `Closes backlog:<NNN>`
- `Ships backlog:<NNN>`

Post-ship disposition: `git mv backlog.d/NNN-slug.md backlog.d/_done/NNN-slug.md`.

## Context Loading (all modes except tidy)

Before investigation, gather baseline context:

1. Read `project.md` and `CLAUDE.md` — ambient project state for investigator prompts.
2. `ls backlog.d/` — inventory open items (002, 003, 004, 005, 006, 007, 009, 010 are
   currently open; confirm against the live directory).
3. `gh issue list --state=open` and `gh pr list --state=open` — in-flight GitHub surface.
   Cross-reference against `backlog.d/` to find duplicates.
4. `git log --since="30 days ago" --oneline` — recent activity shape; detects hot areas.
5. Read `docs/postmortems/` and any `INCIDENT-*.md` — unfinished learnings that should
   either be promoted to backlog items or cross-linked.
6. Skim `docs/agentic-rebuild-vision.md`, `docs/coach-agent-architecture.md`, and
   `docs/prototype-rush-plan.md` — long-horizon direction constrains theming.
7. **Cap check:** if >30 backlog items open, declare a reduction session (no new items
   until under cap). Volume currently sits well under cap.
8. Ask the user: "Anything on your mind? Bugs, friction, missing features?"

Takes <2 minutes. Do not block on missing artifacts — note their absence and proceed.

## Investigation Bench

Three named investigators per mode, all launched **in parallel** via the Agent tool
in a single message.

**MANDATORY PARALLEL FANOUT.** A grooming session that only runs one investigator
has failed the investigation goal.

### Explore Investigators

| Investigator      | Lens                | Volume-specific tools                                                                                         | Agent Type |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| **Archaeologist** | Codebase health     | `bun run architecture:check`, `bun run test:coverage`, `rg -l <concept>` across `convex/ src/ packages/ e2e/` | Explore    |
| **Strategist**    | Product opportunity | Coach/UX gaps (ModelMessage multi-turn, close_matches helpers), paywall state-machine, analytics depth        | Explore    |
| **Velocity**      | Effort patterns     | `git log --since="30 days ago" --oneline`, churn in `convex/`, stalled backlog items, postmortem follow-ups   | Explore    |

For **moonshot** mode: Strategist prompt becomes — "Forget the current backlog.
What's the single highest-leverage thing we're not building?" See item `010` (BYOK /
open-source API-first pivot) for the kind of first-principles rethink that belongs here.

### Rethink Investigators

| Investigator   | Lens                  | Mandate                                                                                                                                                      | Agent Type      |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| **Mapper**     | System topology       | Trace `src/app/(app)/page.tsx → useDashboard → convex/sets.ts`, Clerk/Stripe/OpenRouter seams, Convex schema coupling. "What breaks if you pull any thread?" | Explore         |
| **Simplifier** | Radical simplicity    | From-scratch rebuild. "What layers can be deleted?" Consult `planner` agent for decomposition.                                                               | Plan            |
| **Scout**      | External perspectives | Invokes `/research` or `/model-research`. Also add `ousterhout + carmack + grug` for product-arc critique.                                                   | general-purpose |

### Investigator Output Format (shared)

```markdown
## [Name] Report

### Top 3 Findings

1. [finding] — Evidence: [file:line / commit / metric]. Impact: high/med/low.
2. ...
3. ...

### Strategic Theme

[One sentence: the overarching theme these findings point to]

### Single Recommendation

[One concrete action. Not a list. Not "consider." A specific thing to do.]
```

## Synthesis Protocol

After all investigators return, the **orchestrator** (you) synthesizes. Do NOT present
raw findings. Do NOT delegate synthesis — this requires product judgment. Use the
`critic` agent for feasibility checks on the ranked themes.

0. **Premise challenge** — Five-whys the request. Is this the root problem or a
   downstream symptom? Converging on solutions to the wrong problem is worse than silence.
1. **Cross-reference** — Which findings appear across 2+ investigators? (highest signal)
2. **Theme extraction** — Group findings into 2-4 strategic themes. Volume theme
   candidates with known signal: observability hardening (items 005, 007;
   Sentry/ADR work), Convex schema migration safety (soft delete, subscription state,
   rate limits), coach tool ergonomics (`close_matches`, `ModelMessage[]`, error helpers),
   design system polish (DESIGN_SYSTEM.md invariants; flush blocks; theme parity),
   platform stats/analytics (ADR-0005), OpenRouter model curation (ADR-0008),
   paywall state-machine hardening (ADR-0006), release-please quality, Dagger CI parity.
3. **Dependency map** — e.g., architecture baseline (`003`) enables safer coach refactors.
4. **Rank** — (impact on product vision) × (feasibility) / (effort).
5. **Product-vs-maintenance balance** — Volume currently skews maintenance-heavy per the
   open backlog. Call out whether the next sprint is obs-hardening (`005`, `007`) or
   product-arc (coach improvements, analytics depth). Always propose at least one
   "Boil the Ocean" full-solve candidate — convert one open item from planned fix to
   shipped + tested + documented.
6. **Present** — One theme at a time. Evidence from investigators, recommended action,
   rough effort (S/M/L). Ask: explore deeper, write backlog item, or skip?

Output format:

```markdown
## Grooming Synthesis

### Investigator Convergence

[Findings from 2+ investigators — highest signal]

### Theme 1: [Name]

**Evidence:** Archaeologist found X (e.g., `bun run architecture:check` flagged cycle in convex/),
Strategist found Y, Velocity confirms Z.
**Recommendation:** [one concrete action]
**Effort:** S/M/L
**Impact:** [why this matters for Volume's product vision]
**Boil-the-ocean candidate?** yes/no

### Theme 2: ...

### Dependency Order

Theme A enables Theme B. Recommend executing A first.
```

## Workflow: Explore

Phase-gated. Each phase must complete before the next begins.

### 1. CONTEXT — Load baseline (see Context Loading above)

### 2. INVESTIGATE — Launch all three explore investigators in parallel

Gate: all three returned structured reports.

### 3. SYNTHESIZE — Cross-reference, theme, rank (see Synthesis Protocol)

Gate: themes extracted with evidence and recommendations. Not raw findings.

### 4. DISCUSS — Present one theme at a time. Recommend, don't list.

Gate: user decides per theme (explore deeper / write item / skip).

### 5. WRITE — Create `backlog.d/NNN-<slug>.md` using the Volume item template.

Pick the next integer after the highest existing `NNN`. If the theme is a raw bug with
an existing GitHub issue, cross-link via `gh issue view <N>` rather than duplicating.
Gate: every item has Context + Outcome + Shape cues + Not in scope.

### 6. PRIORITIZE — Reorder by value/effort ratio; update `**Priority:**` lines.

## Workflow: Rethink

### 1. CONTEXT — Load baseline + user specifies the target system (e.g., coach pipeline,

paywall, Convex schema layer).

### 2. INVESTIGATE — Launch all three rethink investigators in parallel

Gate: all three returned structured reports.

### 3. SYNTHESIZE — Distill into 2-3 architectural options with honest tradeoffs

Always include "do nothing" as a viable option. Consult `ousterhout + carmack + grug`
on the finalists for product-arc critique.

### 4. RECOMMEND — Pick one option. Argue for it. Be opinionated.

Gate: one clear recommendation with reasoning.

### 5. DISCUSS — User approves, modifies, or rejects

### 6. WRITE — One `backlog.d/NNN-<slug>.md` for the recommended change. Link the

relevant ADR under `docs/adr/` in Shape cues.

## Workflow: Scaffold

Volume is already scaffolded; this mode is largely maintenance on existing gates.
When bootstrapping a subproject:

1. Test infrastructure: `bun run test`, coverage via `bun run test:coverage`.
2. Linting: `bun run lint` (enforced by lefthook on commit/push).
3. Type checking: `bun run typecheck`.
4. Pre-commit hooks via lefthook (already present).
5. Local CI via Dagger: `dagger call check --source .` (Docker required).
6. `CLAUDE.md` with project-specific instructions (already present).
7. `backlog.d/` directory for file-driven backlog (already present).
8. ADRs under `docs/adr/` for architectural decisions.

## Workflow: Tidy

1. **Backlog audit** — `ls backlog.d/*.md | wc -l` against 30-item cap.
2. Archive completed items: `git mv backlog.d/NNN-slug.md backlog.d/_done/NNN-slug.md`
   when a commit carries `Closes backlog:NNN` or `Ships backlog:NNN`.
3. Cross-reference `gh pr list --state=merged` against open items — items whose work
   has merged but lack closure markers get archived.
4. Delete stale items (>60 days, no traction) — Torvalds Test: worth doing now or not;
   no "someday" entries. Do not keep a graveyard.
5. Flag `**Status:** open` items with no recent commits touching the implicated files
   (`git log --since="60 days ago" -- <path>`) — abandoned, not active.
6. Verify each remaining item has Context + Outcome + Shape cues + Not in scope.
7. Verify completed items have a landing commit SHA referenced; if not, amend from
   `git log --grep="backlog:NNN"`.
8. Reconcile against `gh issue list --state=open` — any issue also tracked in
   `backlog.d/` must cross-link in Context.
9. Reorder remaining by priority (`**Priority:** high` first).

## Gotchas

- **Accepting the ticket's framing as given** — `/groom X` is a first-draft. Five-whys
  before investigating. Route to `/ceo-review` if "is this the right problem?" is open.
- **Skipping `/office-hours` on fuzzy ideas** — Six forcing questions tighten scope
  before grooming even starts. Grooming a fuzzy idea produces a fuzzy backlog.
- **Investigators returning "everything is fine"** — Red flag. Every codebase has
  findings; an investigator that found none didn't look. Point them at
  `bun run architecture:check` output or a specific `convex/` path.
- **Synthesis that lists findings without theming** — That's a report, not synthesis.
- **Themes without recommendations** — That's a menu, not grooming.
- **Running one investigator and calling it done** — Mandatory parallel fanout.
- **Items without testable outcomes** — "Maybe we should…" entries get rejected or
  rescoped. If the Outcome line isn't testable, hand back to user.
- **Duplicates of GitHub issues without cross-link** — Consolidate. Either the item
  lives in `backlog.d/` and the issue cross-links it, or vice versa.
- **Inline borders/emojis in proposed UI work** — See user memory; these are enforced
  anti-patterns. Don't let Strategist propose them.
- **Backlog as graveyard** — >60 days with no progress means delete, not archive.

## Principles

- **Investigate before opining** — parallel investigation first, opinions after evidence
- **Theme, don't itemize** — strategic themes, not feature laundry lists
- **Recommend, don't list** — always have an opinion, argue for it
- **One theme at a time** — don't overwhelm during discussion
- **Product vision is the ranking function** — rank by impact on the lifter, not
  technical elegance
- **Every item needs a testable outcome** — if you can't verify done, the item isn't ready
- **File-driven** — `backlog.d/` is the source of truth; GitHub issues cross-link, not replace
- **Boil the ocean** — one proposal per session should be the full-solve, not the patch
