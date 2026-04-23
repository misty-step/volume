# Add domain action contract

Priority: high
Status: done
Estimate: M

## Goal

Implement the first runtime slice of the API-first pivot by moving the canonical
action contract out of coach-specific ownership and into a domain-owned action
boundary that future HTTP, OpenAPI, and MCP surfaces can share.

## Non-Goals

- Add `/api/v1/*` routes
- Add OpenAPI generation
- Add BYOK model credentials
- Add MCP adapters
- Remove legacy coach tool compatibility

## Oracle

- [x] [behavioral] Canonical action schemas live under `src/lib/domain/actions/`
- [x] [behavioral] Existing coach schema imports keep working through a
      compatibility adapter
- [x] [behavioral] Domain actions define stable names, descriptions, scopes,
      audit categories, idempotency metadata, and public/coach exposure
- [x] [behavioral] Coach canonical tool definitions reuse the domain action
      schema and description objects
- [x] [behavioral] A domain action executor validates input, checks exposure and
      scopes, dispatches to registered runners, and emits audit events
- [x] [behavioral] Domain modules cannot import coach modules; the architecture
      checker enforces this boundary

## Touchpoints

- `src/lib/domain/actions/schemas.ts`
- `src/lib/domain/actions/registry.ts`
- `src/lib/domain/actions/execute.ts`
- `src/lib/domain/memory.ts`
- `src/lib/coach/tools/registry.ts`
- `src/lib/coach/tools/schemas.ts`
- `src/lib/coach/memory.ts`
- `src/lib/architecture-policy.ts`
- `src/lib/architecture-checker.ts`

## What Was Built

- Added a domain action registry for the first public action surface:
  `log_sets`, `modify_set`, `query_workouts`, `query_exercise`,
  `manage_exercise`, and `get_settings_overview`.
- Added coach-only domain action metadata for existing coach capabilities so
  the registry remains single-source without exposing every tool publicly.
- Added `executeDomainAction` as the public action runtime kernel for
  validation, authorization metadata checks, runner dispatch, and audit events.
- Moved memory constants/types into `src/lib/domain/memory.ts` and kept
  `src/lib/coach/memory.ts` as a compatibility export.
- Enforced the domain-to-coach boundary in the architecture checker.
