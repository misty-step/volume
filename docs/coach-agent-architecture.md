# Coach Agent Architecture

Date: 2026-02-16
Status: Implemented (prototype)

## Core Contract

1. Model decides what to do.
2. Tools decide how it is done.
3. UI schema decides how it is rendered.

This keeps the system agentic without becoming fragile.

## Runtime Flow

1. Client sends conversation history + local preferences to `POST /api/coach`.
2. Server planner (`OpenAI/OpenRouter`) runs tool-calling loop.
3. Deterministic tool handlers execute against Convex.
4. Tool outputs are converted into typed UI blocks.
5. Client renders blocks and applies any declared local actions.

## Streaming

`POST /api/coach` supports SSE when the request `Accept` header includes `text/event-stream`.

Events:

- `start` (model selected)
- `tool_start` (tool began)
- `tool_result` (append typed blocks; may repeat per tool as blocks are produced)
- `final` (canonical full response: assistant text + blocks + trace)
- `error` (planner failed; final still follows with partial/fallback response)

## Modules

- `src/app/api/coach/route.ts`
  - planner loop, auth, fallback mode, response assembly.
- `src/lib/coach/agent-tools.ts`
  - deterministic tool handlers and tool definitions.
- `src/lib/coach/schema.ts`
  - request/response + UI block contracts.
- `src/components/coach/CoachPrototype.tsx`
  - thin chat client and typed block renderer.

## Tool Surface

- `log_set`
- `get_today_summary`
- `get_exercise_report`
- `get_focus_suggestions`
- `set_weight_unit` (client action)
- `set_sound` (client action)

## Fallback Behavior

If no model runtime is configured (or planner errors), the route uses deterministic fallback intent handling so core flows still work.

## Next Hardening Steps

1. Add route-level tests for planner + tool loop.
2. Add structured eval dataset for common prompts.
3. Persist server conversation IDs for stronger long-turn memory.
4. Add safety/approval layer for destructive actions before expanding tool set.
