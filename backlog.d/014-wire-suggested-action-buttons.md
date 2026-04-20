# 014 Wire suggested-action buttons end-to-end

**Status:** open
**Priority:** high
**Created:** 2026-04-20
**Source:** operator feedback (daily-user report during groom session 2026-04-20)

## Context

The coach renders suggested-action buttons (chips/buttons presented at the end of a turn or inline in response blocks), but **pressing them does nothing** in daily use. This is reported as consistent, not intermittent. For a chat-first product whose North Star is "direct manipulation + natural language both paths converge" (`project.md:18`), dead buttons in the agent's own output are a direct violation of the core UX contract. Every unhandled click is a user learning that Volume's coach can't be trusted to follow through on what it just offered.

Most likely failure modes (to narrow during investigation):

- `onClick` handler missing or wired to a no-op placeholder
- Click fires but the dispatched payload doesn't map to a real coach command or tool call
- Handler exists but the turn-submission path for synthetic messages is broken (e.g., sends to a stale session, or the model never receives it)
- Component renders from a catalog type that the client-side renderer doesn't have a registered interaction handler for

Historical context: `project.md:120` notes that `buildEndOfTurnSuggestions` (130 lines of hardcoded if/else) was deleted in favor of letting the model generate contextual suggestions. The replacement path may have shipped rendering without wiring the interaction side.

This is a bug fix. It should not wait behind 011/012; fix-on-sight.

## Outcome

Every suggested-action button visible in the coach UI, when pressed, executes its declared action — either submitting a new user turn with the button's prompt text, or invoking the named tool/command — with a visible confirmation (new turn appears, tool result renders, or direct navigation completes). Zero dead clicks across the current block catalog.

## Needs-more-evidence step (do first)

Before implementation, investigate in one session:

1. `rg -n "suggestion|suggested.action|ActionTray|action.?chip" src/components/coach/ src/lib/coach/` — enumerate every suggestion-rendering surface
2. Read each rendering component: does it receive an `onClick` / `onAction` prop? Is it wired?
3. Trace dispatch: how is a suggested action supposed to become a coach turn? Which hook owns that path? (`src/components/coach/useCoachChat.ts` is the likely site given its 10× churn in 60d)
4. Check the json-render catalog types (`src/lib/coach/presentation/`) — are suggestion blocks declaring interactive props the renderer ignores?
5. Manual repro via `bun run dev`: log a set, read the coach response, click every suggestion, observe browser console + network tab + Convex logs; document which suggestions do nothing and why
6. Produce a one-page "where clicks die" map — file:line for each dead path

Only after this map exists: write the fix.

## Shape cues

- **Files likely touched (confirm during investigation):**
  - `src/components/coach/useCoachChat.ts` — dispatch for synthetic user turns
  - `src/components/coach/CoachPrototype.tsx` — suggestion rendering
  - `src/lib/coach/presentation/registry.tsx` — block-type handler registration
  - `src/lib/coach/presentation/compose.ts` — suggestion emission decisions
  - Likely one or more `src/components/coach/*Suggestion*` / `*ActionTray*` components
  - `src/lib/analytics.ts` — fire a `Suggestion Clicked` event for future diagnostic signal (optional but cheap)

- **Gate impact:**
  - `bun run typecheck` — typed action payloads; no stringly-typed dispatch
  - `bun run test:affected` — unit tests for the dispatch hook + rendering components
  - `bun run test:e2e` — add a Playwright spec that logs a set, receives suggestions, clicks each, and asserts a follow-on turn renders
  - `bun run architecture:check` — unaffected

- **Related ADR / docs:** `project.md:18` (core UX principle); `docs/patterns/coach-tools.md`

- **Related issues:** none direct in GH; partially adjacent to #468 (structured routing) because routing guidance improves what suggestions _should_ dispatch to

## Not in scope

- Redesigning the suggestion UX (visual layout, placement, animation) — that's 016/017 territory
- Introducing new suggestion block types
- Model-side prompt tuning for _which_ suggestions to emit — this item is about the interaction layer only, assuming whatever the model emits today should work
- Analytics dashboards for suggestion CTR (fire the event; dashboard is later)

## Acceptance

- [ ] "Where clicks die" investigation map produced and attached to PR description
- [ ] Every suggestion block type in the current catalog has a wired, typed `onClick` / `onAction` handler
- [ ] Playwright spec asserts ≥3 distinct suggestion-click → follow-on-turn flows
- [ ] `bun run quality:full` green
- [ ] `bun run test:e2e` green
- [ ] Manual QA via `/volume-manual-qa` confirms: log a set → click every rendered suggestion → all dispatch correctly
- [ ] PR includes a `/demo` GIF showing suggestion clicks firing turns
- [ ] (Optional) `Suggestion Clicked` PostHog event fires with block type, surface, session id
