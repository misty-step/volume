# Design: #341 Agentic UI Pivot

Date: 2026-02-24  
Status: Approved direction (execution in child issues)  
Issue: #341

## Architecture Decision Summary

- **Generative UI:** `json-render` catalog-constrained blocks
- **Agent runtime:** AI SDK 6 Agent (`prepareStep`, tool loop, stop conditions)
- **Tool interface:** `createCoachTools(userId)` scoped factory
- **Memory:** Mastra Observational Memory with compression thresholds
- **Design system:** CSS variables mapped to Tailwind semantic tokens

## System Boundaries

1. **Coach API boundary** (`src/app/api/coach/route.ts`)
   - Owns request validation, auth/rate-limit enforcement, stream format.
2. **Agent orchestration boundary** (`src/lib/coach/server/*`)
   - Owns planning/tool-calling loop and fallback orchestration.
3. **Tool execution boundary** (`src/lib/coach/tools/*` + Convex)
   - Owns deterministic mutations/queries and domain validation.
4. **UI contract boundary** (`src/lib/coach/schema.ts` + catalog layer)
   - Owns typed block schemas and renderer compatibility.
5. **Client rendering boundary** (`src/components/coach/*`)
   - Owns block rendering, streaming UX, local action handling.

## Target Turn Flow

1. Client sends message history + local preferences.
2. API authenticates, rate-limits, validates payload.
3. Agent `prepareStep` builds prompt context (profile + memory summary + recent turns).
4. Agent selects tools from scoped factory.
5. Tool results map into constrained catalog blocks.
6. Server emits incremental stream events and final canonical response.
7. Client applies local actions and renders blocks from schema contracts.

## Data Contracts

- **Input**: `CoachRequest` with bounded message history and preferences.
- **Output**: `CoachResponse` with `assistantText`, typed `blocks`, and `trace` metadata.
- **Streaming**: `CoachStreamEvent` frames (`start`, `tool_start`, `tool_result`, `final`, `error`).

## Dependency Rules

- Route handlers may call orchestration modules, never raw Convex domain internals.
- Orchestration modules may call tool factory interfaces, never UI components.
- Tool modules may depend on Convex/domain utils, never rendering schemas from UI package.
- Renderer depends only on schema contracts, never planner internals.

## Sequencing Plan

1. #350 tokens foundation
2. #349 catalog contract stabilization
3. #344 memory integration
4. #343 action log + undo framework
5. #345/#347/#348 tool surface expansion
6. #346 proactive kickoff pipeline

(#342 already complete and serves as runtime baseline.)

## Test Strategy by Layer

- **Route/API:** auth/rate-limit/validation/stream compatibility tests.
- **Orchestration:** tool loop behavior, fallback transitions, contract invariants.
- **Tools:** deterministic business logic and ownership guard tests.
- **Renderer:** block contract rendering tests across themes.
- **E2E:** representative chat journeys + undo safety scenarios.

## Open Decisions

1. Accent token final value and accessibility targets.
2. Feature-flag strategy for making coach the default entry point.
3. Observability dashboard shape for long-session memory quality.

## Definition of Architecture Done

- No duplicated tool registries.
- One canonical tool→block contract path.
- Explicit memory adapter boundary with test doubles.
- Clear fallback boundary that does not leak into UI contracts.
