# Spec: #341 Agentic UI Pivot

Date: 2026-02-24  
Status: Ready for execution  
Issue: #341

## Problem

Volume still has mixed interaction models (traditional UI + coach), which creates fragmented workflows and duplicated product logic.

## Goal

Deliver a chat-first product where the coach can handle logging, analytics, settings, and planning through a constrained generative UI catalog.

## Non-Goals

- Full polish pass for every visual detail
- Solving all future agent autonomy use cases
- Replacing deterministic backend calculations with model-generated numbers

## Users + Jobs

1. **Daily lifter**: log sets quickly and review progress without leaving chat.
2. **Beginner**: ask natural-language questions and get guided next steps.
3. **Returning user**: open app and immediately see relevant state/insights.

## Functional Requirements

### R1 — Agent runtime and orchestration

- Coach API uses AI SDK 6 Agent loop with scoped tool factory.
- Deterministic fallback remains available when runtime/provider is unavailable.

### R2 — Generative UI catalog

- Agent can emit only approved component schemas.
- Client renders blocks deterministically from typed catalog contracts.

### R3 — Memory and context

- Long conversations preserve useful context through compression/summarization.
- Agent uses profile + recent turn context before tool execution.

### R4 — Action safety and recoverability

- Agent mutations are logged with enough metadata to audit and undo.
- Destructive actions require confirmation and undo path.

### R5 — Session kickoff

- Opening the app preloads personalized coach state/blocks in <1s target.

### R6 — Theming and tokens

- Coach surfaces consume semantic CSS variable tokens only.
- Light/dark/system all render correctly.

## Child-Issue Mapping

- #342: AI SDK 6 agent migration ✅
- #349: Generative UI component registry
- #344: Conversation memory + persistence
- #350: Design token refresh
- #343: Action log + snapshot undo
- #345: Tool wave 1 (logging/history)
- #347: Tool wave 2 (analytics/exercise management)
- #348: Tool wave 3 (settings/planning/coaching)
- #346: Proactive kickoff payload

## Exit Criteria (Epic Done)

The epic can close only when all child issues above are complete and these checks pass:

1. End-to-end chat flow covers log + analytics + settings without navigation fallback.
2. 50+ message session retains coherent context (manual validation + test evidence).
3. Kickoff payload median latency meets <1s target in representative environment.
4. Agent mutation actions are auditable and reversible where required.
5. No hardcoded colors in coach components.

## Verification Plan

- Unit tests for tool factories, schema validation, memory adapters, action logging.
- Integration tests for `/api/coach` JSON + SSE behavior.
- UI tests for typed block rendering across themes.
- Regression checks for fallback mode.

## Risks

1. **Schema drift** between tool outputs and catalog blocks.  
   Mitigation: single source of truth for tool-to-block mapping + contract tests.
2. **Context quality regressions** in long sessions.  
   Mitigation: memory compression thresholds + golden conversation evals.
3. **Incremental migration complexity** while legacy UI still exists.  
   Mitigation: explicit boundary docs + feature-gated rollout.

## Rollout

1. Land child issues by dependency order (tokens/runtime/catalog/memory/tools/kickoff).
2. Enable coach-first entry path behind feature flag if needed.
3. Run quality bar checklist from `project.md` before final epic close.
