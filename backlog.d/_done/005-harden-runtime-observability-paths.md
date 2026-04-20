# Harden runtime observability paths

Priority: medium
Status: done
Estimate: M

## Goal

Improve production diagnosis by removing silent catch paths and adding targeted request/runtime logging where failures currently disappear.

## Non-Goals

- Full observability platform migration
- Verbose logging of every request field
- Rewriting existing analytics architecture end-to-end

## Oracle

- [x] [command] Silent `catch {}` paths in runtime-critical code are removed or instrumented
- [x] [behavioral] Server request flows expose enough context to diagnose failures without leaking secrets
- [x] [test] Updated paths have focused tests for failure handling
- [x] [behavioral] New logging follows existing structured logger patterns

## Notes

The readiness review found structured logging and health checks, but request
logging is inconsistent and several runtime paths still use bare `catch {}`.

## What Was Built

Wired the existing `src/lib/logger.ts` (previously unused in production) into all
runtime-critical server paths:

- **Stripe checkout/portal routes**: Wrapped previously-unhandled Convex queries in
  try/catch with structured error logging and `reportError`. Replaced raw `console.error`
  with `routeLog.error` including error objects for structured log diagnosis.
- **Coach route**: Instrumented 3 silent catches (`deserializeStoredMessage`,
  `request.json()`, `convertToModelMessages`) and replaced 3 `console.warn` calls
  with structured `routeLog.warn`/`routeLog.info`.
- **Coach tools/turn-runner**: Added `log.warn` to silent catches in `findExercise`
  and `abortTurn`.
- **Analytics**: Replaced `isDev`-gated `console.warn` with unconditional `log.warn`
  so PostHog capture failures surface in production structured logs.
- **OpenRouter (Convex runtime)**: Added `console.warn` (cannot import `@/lib/logger`
  in Convex runtime).
- **Tests**: Added Convex query failure tests for both Stripe routes.

## Touchpoints

- `src/lib/logger.ts`
- `src/app/api/coach/route.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/checkout/route.test.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/app/api/stripe/portal/route.test.ts`
- `src/lib/analytics.ts`
- `src/lib/coach/tools/data.ts`
- `src/lib/coach/server/turn-runner.ts`
- `convex/lib/openrouter.ts`
