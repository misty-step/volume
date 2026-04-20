# 015 Coach summary blocks must match underlying data

**Status:** open
**Priority:** high
**Created:** 2026-04-20
**Source:** operator feedback (daily-user report during groom session 2026-04-20)
**Evidence requirement:** REPRO CAPTURE REQUIRED BEFORE IMPLEMENTATION

## Context

The coach regularly (not always, but regularly) renders day-summary and exercise-summary blocks whose numeric content is wrong. Reported example: "5 sets of pushups, 50 pushups total" when the actual logged volume was 75. The magnitude of the discrepancy matters — this isn't a rounding issue, it's the agent fabricating or truncating a total.

For a workout tracker whose entire value prop is "trust your history and iterate," a numerically-unreliable coach is a product-killing defect. Every wrong total teaches the operator that Volume's own log is untrustworthy, which is the exact opposite of the niche Volume is trying to own vs Fitbod/Hevy (focus + simplicity + **trust**).

The defect's root cause is not yet diagnosed. Plausible classes, each of which demands a different fix:

- **Tool-query class:** `query_session` / `get_today_summary` / `query_exercise_data` returns partial or stale rows (pagination bug, missing `includeDeleted` filter accidentally including deleted sets, boundary-day timezone slip, or a date-range off-by-one)
- **Model-hallucination class:** tool returns correct data but the model's text generation fabricates an aggregate (summing wrong, dropping sets during summarization, confusing reps-per-set with total-reps)
- **Display-layer class:** tool + model are correct but the rendered block truncates, mis-maps fields, or shows cached state from a prior turn
- **Race/timing class:** user logs a set, asks for summary immediately, tool reads before write has propagated (Convex consistency window)

Each class requires a different instrument. Until we capture at least three repro traces with full stack visibility, implementation is guessing.

## Outcome

Across a documented set of at least 3 repro cases (captured during evidence step), every day-summary and exercise-summary block the coach renders matches the corresponding Convex-truth data exactly; a regression fixture is added to the test suite so future changes can't silently re-introduce drift.

## Needs-more-evidence step (gate: do not implement until complete)

1. **Reproduce and capture ≥3 cases** of numerically-wrong summaries via manual QA + `bun run dev`:
   - For each case record: (a) the exact user turn, (b) session id, (c) the tool calls fired (from Convex logs: `CONVEX_DEPLOYMENT=<dev> bunx convex logs`), (d) the raw tool return payload, (e) the model's output text, (f) the rendered block props, (g) a direct DB query of the ground-truth data
2. **Classify each case** into one of the four hypothesized failure classes (tool / hallucination / display / race)
3. **Rule out timezone + boundary-day edge cases** explicitly — log spanning 11pm→1am is a documented risk area
4. **Rule out soft-delete leakage** — confirm `includeDeleted: true` filter presence per `CLAUDE.md` invariant; if a deleted set is being counted or excluded wrongly, that's its own fix
5. **Produce a one-page diagnosis** naming the dominant failure class; if multiple classes coexist, say so and rank

Only after diagnosis: design + implement + add regression fixture.

## Shape cues

- **Files to investigate (phase 1 evidence):**
  - `convex/sets.ts` — `listSets`, counting helpers
  - `convex/analytics.ts` — aggregation queries
  - `src/lib/coach/tools/*` — specifically tools in the `query_session` and `query_exercise_data` groups (per 012's consolidation map)
  - `src/lib/coach/presentation/compose.ts` — summary block composition
  - `src/lib/coach/agent-prompt.ts` — check whether the prompt instructs the model to sum/aggregate in prose vs trust the tool output
  - `src/components/coach/` — any SummaryBlock / MetricsGrid / DaySummary renderer

- **Files likely touched (phase 2 fix, scope depends on diagnosis):**
  - Likely one of: the relevant tool query, the prompt's aggregation-discipline rule, or the renderer's prop mapping
  - New: `src/lib/coach/tools/__fixtures__/summary-accuracy.ts` — regression fixture of N user messages + expected tool outputs + expected rendered totals

- **Gate impact:**
  - `bun run typecheck` — tighter return types on summary-producing tools (consider branding aggregate types)
  - `bun run test:affected` — unit tests for the tool + renderer
  - New **eval fixture** verified in CI — tool invocation returns expected totals for the repro cases documented
  - `bun run test:e2e` — a Playwright spec that logs a known set and asserts the rendered summary block matches
  - `bun run architecture:check` — unaffected

- **Invariants to preserve (CLAUDE.md):**
  - Convex mutation auth + ownership
  - Soft delete via `deletedAt` on exercises
  - `includeDeleted: true` on history views (this may be directly relevant to the bug)
  - No `@/lib/logger` in Convex runtime (use `console.warn`)
  - AI SDK `ModelMessage[]` conversation discipline

- **Related ADR / docs:** `project.md:62` (Quality Bar: "Agent handles the same request 5 different ways without breaking"); ADR-0002 (soft delete); ADR-0005 (platform stats precompute — same class of aggregation risk)

- **Related GH issues:** #411 (summary accuracy) — cross-link in the investigation doc

## Not in scope

- Redesigning summary UI visuals (017 territory)
- Adding new summary types beyond day / exercise
- Performance tuning of summary queries
- Retroactively correcting historical wrong summaries the user remembers — this is a forward-looking fix

## Acceptance

- [ ] ≥3 distinct repro cases captured with full trace (user msg → tool call → tool result → model output → rendered block → DB ground truth) and attached to the PR
- [ ] Diagnosis doc produced: root-cause class named, with file:line evidence
- [ ] Fix scope is defined by the diagnosis — do not expand beyond the identified class without re-scoping
- [ ] Regression fixture in `src/lib/coach/tools/__fixtures__/` or equivalent, wired into test suite, covering the 3+ repro cases
- [ ] Playwright end-to-end spec: log a known set pattern, ask for summary, assert block totals match
- [ ] `bun run quality:full` green; `bun run test:e2e` green
- [ ] `/volume-manual-qa` pass confirms user cannot reproduce the original symptom
- [ ] GH issue #411 referenced in PR description; close if resolved
