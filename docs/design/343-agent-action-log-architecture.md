# Design: #343 Agent Action Log + Snapshot Undo

## Data model

`agentActions` rows store immutable action metadata:

- `turnId` groups all tool actions for one coach turn.
- `action = "log_set"` (expandable union).
- `args` keeps original call details and `expectedSnapshot` for conflict checks.
- `affectedIds` stores target ids (set ids for now).
- `status` transitions: `committed -> undone`.

## Write path

1. Coach `log_set` tool logs set via `api.sets.logSet`.
2. Tool records action via `api.agentActions.recordLogSetAction`.
3. Tool emits an `undo` block containing `actionId` and `turnId`.

## Undo path

### Single action

- `undoAgentAction(actionId)`
- Auth + ownership check.
- Validate status is `committed`.
- Validate current target set matches `expectedSnapshot`.
- If valid: delete set + mark action `undone`.
- If invalid: return conflict result with user-facing message.

### Whole turn

- `undoAgentTurn(turnId)`
- Load committed actions for the turn.
- Pre-validate all actions in reverse order.
- Apply all undos atomically in reverse order.

## UI integration

- New typed coach block: `undo`.
- `CoachBlockRenderer` shows inline Undo button.
- `useCoachChat` calls `api.agentActions.undoAgentAction` and appends persistent status feedback to timeline.
