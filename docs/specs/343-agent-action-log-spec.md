# Spec: #343 Agent Action Log + Snapshot Undo

## Goal

Add a recoverable audit trail for coach mutations so users can safely undo agent mistakes.

## Scope (this PR)

- Add `agentActions` table with user+turn indexes.
- Record `log_set` coach mutations as committed actions.
- Add `undoAgentAction` and `undoAgentTurn` mutations.
- Add conflict detection before undo when target set no longer matches recorded snapshot.
- Render a persistent `undo` block in coach chat with a working Undo button.

## Out of scope

- Undo for edit/delete/bulk tools (future actions).
- Full timeline/history UI outside coach chat stream.

## Acceptance mapping

- Schema + indexes: ✅
- Internal `recordAgentAction`: ✅
- `undoAgentAction`: ✅
- `undoAgentTurn`: ✅
- `log_set` action recording: ✅
- Undo block + button in chat: ✅
- Conflict detection: ✅
- Tests: ✅ (record, undo single, undo turn, conflict, internal record)
