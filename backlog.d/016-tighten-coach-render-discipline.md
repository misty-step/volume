# 016 Tighten coach render discipline — fewer blocks, higher relevance

**Status:** open
**Priority:** high
**Created:** 2026-04-20
**Source:** operator feedback (daily-user report during groom session 2026-04-20)

## Context

Volume's competitive moat — the thing Fitbod and Hevy cannot copy without repudiating their product decisions — is **focus and simplicity**. The daily user reports that the coach currently violates that moat from inside: it renders "too many" UI blocks, and not the ones the user wants. The generative UI surface, which should feel like a disciplined coach answering exactly what was asked, feels like a dashboard dump.

This is a prompt + catalog policy problem, not an architecture problem. The json-render catalog (`project.md:47`) constrains block _types_; it doesn't constrain _how many_ or _which ones_ the model emits per turn. The model needs both a harder ceiling on block count per turn AND a clearer rubric for which block is justified by the user's ask vs which is the model showing off.

This item is distinct from **012** (which consolidates the _tool_ surface) even though they're thematically linked: 012 gives the model fewer, deeper tools to pick from; 016 gives the model a tighter rule for turning tool results into rendered output. Both can ship independently; shipping 016 alone produces immediate user-perceived improvement.

Related operator signals from `project.md`:

- `project.md:62` Quality Bar item: "Agent handles the same request 5 different ways without breaking" — discipline includes not over-responding
- `project.md:120` lesson: `buildEndOfTurnSuggestions` was deleted because it was "130 lines of hardcoded if/else for what the LLM already does" — the inverse risk is now in play: the LLM emits _too much_, and we need the prompt to cap it

## Outcome

For the 10 most common user asks (to be enumerated during shape), the coach emits a defensible number of blocks (baseline: median ≤ 2 per turn, p95 ≤ 4) and every block is justified by either (a) the user's explicit request, (b) a named "proactive" rule in the prompt, or (c) confirmation of an action the user took. Noise blocks — tangential charts, redundant summaries, "just in case you wanted this" — do not ship.

## Shape cues

- **Files likely touched:**
  - `src/lib/coach/agent-prompt.ts` — add a **Render Budget** section with explicit rules and examples
  - `src/lib/coach/presentation/compose.ts` — post-model discipline layer that can drop low-value blocks (guardrail, not a replacement for prompt work)
  - `src/lib/coach/presentation/registry.tsx` — annotate block types with a "when to emit" description that flows into the prompt
  - `src/lib/coach/tools/__fixtures__/` — new render-budget fixture: N canonical user asks, each with an expected block-type set and upper bound on block count
  - `src/lib/analytics.ts` — add `Coach Turn Rendered` event with `block_count`, `block_types[]`, `user_turn_length` for post-ship telemetry

- **Enumerated asks to anchor the rubric (starting set, finalize during shape):**
  1. "log 10 pushups"
  2. "how's today?"
  3. "show me pushups"
  4. "what's my streak?"
  5. "undo that"
  6. "delete the last set"
  7. "how was this week?"
  8. "should I deload?"
  9. "what's next?"
  10. "settings" (or equivalent config touch)

- **Render Budget rule sketch (to refine in prompt):**
  - One direct-answer block minimum (can be prose, not a block)
  - At most one supplementary block unless explicitly requested
  - Never emit a trend chart unless the user asked about trends or a milestone was crossed
  - Never emit a settings/config block except in response to a config-touching turn
  - Confirmation blocks after mutations are permitted but should be terse (MetricsGrid 2×2, not a full dashboard)

- **Gate impact:**
  - `bun run typecheck` — strict `AnalyticsEventDefinitions` addition for `Coach Turn Rendered`
  - `bun run test:affected` — unit tests for compose.ts discipline pass
  - New **render-budget fixture** in the test suite — for each canonical ask, assert block-type set and count bounds
  - `bun run test:e2e` — optional spec that logs a set and asserts the response block count stays under budget
  - `bun run architecture:check` — unaffected

- **Related ADR / docs:** `project.md:47` (json-render locked direction); `docs/patterns/coach-tools.md`; `docs/agentic-rebuild-vision.md`

- **Related backlog items:**
  - **012** — tool consolidation; bundle the render-discipline fixture with 012's eval fixture if that item is live when 016 lands
  - **017** — canonical quick-views define what _good_ blocks look like; this item defines how few of them per turn

## Not in scope

- Tool consolidation (012)
- Adding or redesigning block types (017)
- Changing the generative UI framework (json-render stays per `project.md:47`)
- Per-user personalization of render verbosity (a power-user "verbose mode" toggle is deferred)
- Streaming-vs-batched emission changes

## Acceptance

- [ ] 10 canonical user asks enumerated, each with an expected block-type set and block-count bound
- [ ] `src/lib/coach/agent-prompt.ts` contains a Render Budget section that explicitly names the rules and includes ≥3 worked examples
- [ ] Render-budget fixture in test suite; all 10 canonical asks pass
- [ ] `Coach Turn Rendered` PostHog event fires with `block_count` + `block_types[]` every turn (data to judge whether the discipline holds in production)
- [ ] Before/after measurement on the fixture: documented in PR body (median blocks/turn, p95 blocks/turn)
- [ ] `bun run quality:full` green
- [ ] `/volume-manual-qa` pass: operator reports the coach feels more focused, not busier
- [ ] PR includes `/demo` GIF of one canonical ask before/after
