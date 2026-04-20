# 017 Canonical quick-views: day summary, exercise trend, day trend

**Status:** open
**Priority:** high
**Created:** 2026-04-20
**Source:** operator feedback (daily-user report during groom session 2026-04-20)

## Context

The daily user explicitly named three views that are missing or hard to reach: **day summary**, **exercise trend**, and **day trend**. These are table-stakes views for a workout tracker — not experimental features — and their absence or friction is one reason the coach feels like it's hiding the data the user wants most.

These three views also define what the **coach-as-default route (011)** should actually look like on first paint. Without canonical quick-views, 011 flips the URL without giving the user anything valuable above the fold. With them, the kickoff payload can pre-compute the three and render them the moment the coach loads, making the default surface _immediately_ useful.

Each view has a distinct information shape:

1. **Day summary** — what did I do today? Volume, sets, exercises touched, PRs hit. Default view on morning/evening open.
2. **Exercise trend** — how has [exercise] progressed? 14-day rolling chart, last-session comparison, PR indicator. Triggered by "show me pushups" or equivalent.
3. **Day trend** — how is my week/month shaping up? Week-over-week volume, frequency, muscle-group balance. Triggered by "how's the week" or equivalent.

`project.md:27` glossary already names `TrendChart` and `MetricsGrid` as catalog block types, so some of the raw material exists. The gap is promotion: these three should be named, first-class, tested block types with known-good prompts and reliable tool bindings — not ad-hoc compositions the model guesses at each turn.

Bundling with **015 (counting correctness)** is tempting but wrong: 015 fixes a numeric-accuracy class that spans many views; 017 adds three specific views. They reinforce each other (accurate numbers × well-designed views = trusted UX) but failure modes are independent.

## Outcome

Three named block types — `DaySummary`, `ExerciseTrend`, `DayTrend` — exist in the json-render catalog with locked schemas, tool bindings, and prompt guidance; each is reachable in ≤ 1 user turn from the coach-default surface; each renders reliably in light/dark/system themes per the design-system invariants; the kickoff payload pre-computes `DaySummary` so the coach opens with an immediately useful view.

## Shape cues

- **Files likely touched:**
  - `src/lib/coach/presentation/registry.tsx` — register `DaySummary`, `ExerciseTrend`, `DayTrend` as distinct catalog entries
  - `src/lib/coach/presentation/blocks/` (or wherever block components live) — three component files, colocated tests
  - `src/lib/coach/tools/query_session.ts` (post-012 name) — ensure the tool returns enough data for `DaySummary` + `DayTrend`
  - `src/lib/coach/tools/query_exercise_data.ts` (post-012) — ensure it returns 14-day trend data with consistent granularity
  - `src/lib/coach/agent-prompt.ts` — add intent→block mapping ("when the user says X, render Y")
  - `src/app/(app)/page.tsx` (created in 011) — kickoff payload pre-computes `DaySummary` so the coach surface opens with it rendered, not a blank chat
  - `src/lib/coach/kickoff.ts` (or equivalent) — kickoff payload shape
  - `e2e/coach-flows.spec.ts` — three new spec sections, one per view

- **Design invariants (enforce per MEMORY.md + DESIGN_SYSTEM.md):**
  - Light + dark + system themes — all three render correctly
  - No emojis — `lucide-react` / `@radix-ui/react-icons` only
  - No single-side border on rounded cards; use background tint or a leading icon/dot
  - Accent color only on data numbers, peaks, totals, 1–2 hero keywords
  - Flush block layout (zero gap, ≤ 4px radius) OR card style (large radius, zero gap) — pick ONE per view; don't mix bento + high-radius
  - Wordmark / nav must respect `env(safe-area-inset-top)`
  - Mobile compact: view usable above on-screen keyboard
  - No teal, no pseudo-cursive display fonts, no noise/grain textures, no glow halos

- **Design deliverables:**
  - Low-fi sketch of each view in light + dark (attach to PR or `walkthrough/` dir)
  - Block specimen in Storybook or a dedicated route (if one exists) for visual regression
  - Design decisions captured in `DESIGN_SYSTEM.md` (extend the existing doc, don't fork)

- **Gate impact:**
  - `bun run typecheck` — new block types with strict schemas
  - `bun run test:affected` — per-block unit tests (render + prop validation)
  - `bun run test:e2e` — three new Playwright specs; may reuse `e2e/coach-helpers.ts`
  - `bun run architecture:check` — unaffected
  - `bun run test:coverage` — new components; watch coverage thresholds (`vitest.config.ts` — page.tsx excludes don't cover block components)

- **Related ADR / docs:**
  - `project.md:27` (glossary: Block, Catalog, TrendChart, MetricsGrid)
  - `project.md:55-65` (Quality Bar)
  - `docs/patterns/coach-tools.md`
  - `DESIGN_SYSTEM.md`

- **Related backlog items:**
  - **011** — kickoff payload depends on `DaySummary` existing; sequence: 017 design → 011 route flip consumes it
  - **015** — these views are the first test cases for the counting-correctness fixture
  - **012** — tools backing these views land in consolidation; 012 finalizes the tool names

## Not in scope

- Custom date-range pickers beyond day / week
- Social sharing of summaries
- Pinned dashboard widgets on non-coach routes
- Per-muscle-group trend views beyond the existing `react-body-highlighter` integration
- Comparing self vs public / anonymized cohort data
- Weekly/monthly email or push-notification digests
- Editing/deleting sets from within trend views (that's `modify_workout` tool territory from 012)

## Acceptance

- [ ] Three named catalog entries — `DaySummary`, `ExerciseTrend`, `DayTrend` — with locked schemas
- [ ] Each view reachable from the coach in ≤ 1 user turn (natural-language and explicit-command paths both work)
- [ ] `DaySummary` pre-renders on coach-default kickoff (requires 011 landed OR item scoped to land together)
- [ ] Each view renders correctly in light, dark, and system themes
- [ ] Each view respects all design invariants above (no emojis, no single-side borders, etc.) — PR review checks this
- [ ] Playwright specs: log a known pattern → ask for each view → assert block renders with expected data shape
- [ ] Data correctness assertions ride the 015 regression fixture — totals match ground truth
- [ ] `bun run quality:full` green; `bun run test:e2e` green
- [ ] Mobile QA via `/volume-manual-qa`: all three views usable above the on-screen keyboard
- [ ] PR includes `/demo` capture in both light and dark themes
- [ ] `DESIGN_SYSTEM.md` updated with each block's specimen + intended usage
