# Harden runtime observability paths

Priority: medium
Status: ready
Estimate: M

## Goal

Improve production diagnosis by removing silent catch paths and adding targeted request/runtime logging where failures currently disappear.

## Non-Goals

- Full observability platform migration
- Verbose logging of every request field
- Rewriting existing analytics architecture end-to-end

## Oracle

- [ ] [command] Silent `catch {}` paths in runtime-critical code are removed or instrumented
- [ ] [behavioral] Server request flows expose enough context to diagnose failures without leaking secrets
- [ ] [test] Updated paths have focused tests for failure handling
- [ ] [behavioral] New logging follows existing structured logger patterns

## Notes

The readiness review found structured logging and health checks, but request
logging is inconsistent and several runtime paths still use bare `catch {}`.

## Touchpoints

- `src/lib/logger.ts`
- `src/app/api/coach/route.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/lib/analytics.ts`
