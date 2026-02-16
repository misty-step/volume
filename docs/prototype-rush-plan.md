# Agentic Prototype Rush Plan

Date: 2026-02-16
Owner: Volume

## Objective

Ship a compelling, demoable agentic prototype fast.
Optimize for learning speed, not production completeness.

## Product Slice (Prototype v0)

User can do these by chat:

1. Log a set from short natural language ("10 pushups").
2. Request today's summary.
3. Request exercise-specific trend/report.
4. Change at least one preference by command (weight unit).

Each response returns generated UI blocks:

- Status
- Metrics
- Trend visualization
- Follow-up suggestions

## Scope Boundaries

### In Scope

- New `/coach` route in authenticated app.
- Deterministic intent parsing and tool execution.
- Real Convex reads/writes using existing data model.
- Small, composable UI block renderer for generated responses.

### Out of Scope

- Full LLM planning/orchestration.
- Full migration from existing Today/Analytics/Settings pages.
- Production observability and hardening depth.
- Pixel-perfect design polish.

## Fastest Technical Path

1. Build deterministic intent parser first (cheap, reliable).
2. Reuse existing Convex mutations/queries (`createExercise`, `logSet`, set queries).
3. Render typed UI blocks in chat timeline.
4. Add suggestion chips to accelerate follow-up loops.
5. Keep architecture swappable so an LLM planner can replace parser later.

## Architecture (Prototype)

- `src/app/(app)/coach/page.tsx`: route entry
- `src/components/coach/CoachPrototype.tsx`: chat orchestration + rendering
- `src/lib/coach/prototype-intent.ts`: intent parsing
- `src/lib/coach/prototype-analytics.ts`: deterministic summary/trend calculations

## Acceptance Criteria

1. "10 pushups" logs to Convex and returns:
   - success state
   - today's totals
   - pushup trend block
2. "show today's summary" returns totals + top exercises.
3. "show pushup trend" returns pushup-focused trend + insights.
4. "set unit to kg" persists user weight unit preference locally and confirms.
5. Unknown command returns useful guidance + example prompts.

## Execution Sequence

1. Branch and scaffold docs.
2. Implement parser + analytics helpers with tests.
3. Implement `/coach` route and prototype chat UI.
4. Wire nav links for quick access.
5. Typecheck + lint + targeted tests.
6. Demo pass and note next hardening steps.

## Hardening Backlog (Post-Prototype)

1. Replace heuristic parser with model-based planner + tool calling.
2. Add idempotency guards and duplicate-action prevention.
3. Add action-level analytics and error observability.
4. Expand settings/tools coverage.
5. Add eval harness for prompt/tool quality regression.
