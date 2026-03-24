# Coach Agent Architecture

Date: 2026-03-22  
Status: Implemented

## Core Contract

1. The planner model decides what work to do.
2. Deterministic tools fetch or mutate domain state.
3. A separate presentation composer decides whether the answer should be text, a compact scene, an analytic scene, or a workflow scene.
4. The client renders structured specs through a registry and executes typed actions locally.

This keeps tool execution deterministic while restoring genuinely generative UI.

## Runtime Flow

1. Client sends conversation history and local preferences to `POST /api/coach`.
2. Server planner runs the tool loop and returns natural-language assistant text plus semantic tool execution records.
3. Tools return domain outputs for the model and may also attach legacy block hints for transition purposes.
4. Presentation composer receives:
   - latest user request
   - planner assistant text
   - tools used
   - semantic tool outputs
   - follow-up prompts
   - user preferences
5. Presentation composer emits either:
   - plain text only, or
   - inline `json-render` scene specs plus text
6. Route streams the presentation result through `pipeJsonRender(...)`.
7. Client consumes structured parts with `useJsonRenderMessage(message.parts)` and renders them with the presentation registry.
8. Interactive surfaces dispatch typed actions such as `submit_prompt`, `prefill_prompt`, `undo_agent_action`, `set_preference`, `open_checkout`, and `quick_log_submit`.

## Presentation Model

The presentation catalog is intentionally deep.

- Layout surfaces: `Scene`, `ActionTray`
- Compact actions: `ActionChip`, `ChoiceCard`, `PreferenceCard`
- Domain scenes: `DailySnapshot`, `AnalyticsOverview`, `ExerciseInsight`, `HistoryTimeline`, `LibraryScene`, `SettingsScene`, `BillingState`, `LogOutcome`
- Workflow scenes: `ClarifyPanel`, `ConfirmationPanel`, `QuickLogComposer`

The model should choose the smallest effective surface:

- Text only for acknowledgements, short clarifications, and conversational replies
- Analytic scenes for trends, summaries, comparisons, and scan-heavy answers
- Workflow scenes when structured input or confirmation reduces user error

## Module Boundaries

- `src/app/api/coach/route.ts`
  - transport, auth, rate limiting, persistence, planner/composer orchestration
- `src/lib/coach/server/planner.ts`
  - planner-only tool loop; no UI generation
- `src/lib/coach/server/coach-tools.ts`
  - AI SDK tool definitions and semantic tool execution capture
- `src/lib/coach/server/orchestrator-prompt.ts`
  - planner system prompt
- `src/lib/coach/presentation/*`
  - presentation context, catalog, prompt, composer, and registry
- `src/lib/coach/tools/*`
  - deterministic domain tools
- `src/components/coach/CoachPrototype.tsx`
  - chat shell using structured message parts
- `src/components/coach/useCoachChat.ts`
  - chat state and typed local action handlers
- `src/components/coach/CoachSceneBlocks.tsx`
  - deep scene implementations
- `src/components/coach/CoachBlockRenderer.tsx`
  - `json-render` host

## Architectural Invariants

- Planner never emits UI specs.
- Tools never return final UI as the primary contract.
- Client never scrapes UI specs from assistant text.
- Interactive scenes use typed actions, not prompt strings hidden in React context.
- The catalog surface is job-shaped, not a bag of shallow widgets.

## Transitional Compatibility

The client registry still knows how to render legacy spec component types so persisted older turns do not go blank during rollout. New turns should be generated from the presentation catalog, not the legacy block vocabulary.

## Failure Behavior

- If runtime is unavailable, route returns a transport-level error response.
- If planning fails before useful work is done, route returns planner failure.
- If planning fails after tools ran, partial planner output is preserved and the failure is surfaced cleanly.
- Presentation stays read-only: it does not call tools or fetch missing data.

## Next Hardening Steps

1. Replace legacy block hints in tool outputs with resource-shaped semantic payloads.
2. Add eval coverage for scene selection quality, not just tool routing.
3. Persist presentation decisions separately from planner messages for analysis.
4. Expand typed action coverage for destructive management flows.
5. Remove the remaining legacy block/component compatibility layer after old sessions age out.
