# Telemetry Architecture

## Architecture Overview

**Selected Approach**: Telemetry Facade + Adapter Mesh
**Rationale**: Centralizes analytics concerns behind one deep module so feature teams emit events with a single import while adapters hide Vercel/Sentry quirks, keeping privacy guarantees enforceable and testing simple. Beats service-heavy ideas by reusing existing Next.js/Convex infra without new latency or vendors.

**Core Modules**

- **EventCatalog** – authoritative schemas + metadata for every event.
- **SanitizationEngine** – recursive redaction + validation with perf budget.
- **ContextManager** – client-only user context plus SSR-safe guards.
- **TransportRouter** – routes sanitized payloads to Vercel, server-side tracker, and Sentry without leaking provider APIs.
- **InstrumentationHooks** – React/Next/Convex helpers that make correct usage the default.
- **TelemetryTestkit** – deterministic mocks + fixtures for Vitest/Playwright.
- **SelfTestSurfaces** – `/test-analytics` UI + CLI script keeping transports healthy.

**Data Flow**: User action → Feature code calls `trackEvent` → EventCatalog validates payload → SanitizationEngine redacts → ContextManager enriches → TransportRouter fan-out → Client transport (browser) or Server transport (Next/Convex) + optional Sentry breadcrumbs/logs.

**Key Decisions**

1. **Single in-repo facade** – Simplicity + module depth; no new services; lets us enforce privacy in TypeScript.
2. **Adapter layer per runtime** – Keeps transports shallow; provider upgrades isolated.
3. **Strict client/server guards** – Prevent user context bleed; matches Next.js request model.
4. **Testkit-first** – Instrumentation only shippable if assertions exist; avoids blind logging.

## Module: EventCatalog (`src/lib/analytics/events.ts`)

Responsibility: Tiny interface describing every event’s required/optional props, default metadata, docstrings.

Public Interface:

```typescript
export type AnalyticsEventName = keyof typeof AnalyticsEventDefinitions;
export type AnalyticsEventProperties<Name extends AnalyticsEventName> =
  AnalyticsEventDefinitions[Name] & Record<string, string | number | boolean>;
export const EventDefinitions: Record<AnalyticsEventName, EventMeta>;
```

Internal Implementation:

- `EventMeta` holds description, owner, lifecycle stage, default sample rate.
- CLI lint (simple PNPM script) compares definitions vs. docs, fails if unused entry.
- Optional JSON export for BI team.

Dependencies: `zod` (optional) for schema runtime validation during tests.
Used by: `analytics/core`, `testkit`, lint script.

Data Structures:

```typescript
type EventMeta = {
  description: string;
  required: readonly (keyof AnalyticsEventProperties<any>)[];
  piiFields?: readonly string[];
  owner: "growth" | "product" | "platform";
  rollout?: "beta" | "ga";
};
```

Error Handling:

- Invalid event name: throw at dev time (TypeScript + invariant check).
- Missing required prop at runtime: dev-only warning + Sentry breadcrumb.

## Module: SanitizationEngine (`src/lib/analytics/sanitizer.ts`)

Responsibility: Transform arbitrary payloads into safe `{[key]: string|number|boolean}`.

Public Interface:

```typescript
export function sanitizeProperties(
  raw: Record<string, unknown>
): SanitizedProps;
export function sanitizeString(value: string): string;
```

Internal Implementation:

- WeakSet for circular refs, JSON stringify fallback, `[EMAIL_REDACTED]` token idempotent.
- Handles UTF-8 / emoji via `TextEncoder` guard – invalid sequences replaced with `[INVALID_UTF8]`.
- Rejects payload >4KB (configurable) to protect perf; returns `{ droppedReason: "payload_too_large" }` plus console warn in dev.

Dependencies: none beyond stdlib.
Used by: `trackEvent`, `reportError`, server helpers.

Error Handling:

- Stringify failure → `[Unstringifiable Object]`.
- If sanitization throws, router catches, logs `[Telemetry] sanitize_failed` and drops event.

## Module: ContextManager (`src/lib/analytics/context.ts`)

Responsibility: Client-only store for userId/metadata, sync to Sentry, expose SSR-safe enrichment.

Public Interface:

```typescript
export function setUserContext(
  userId: string,
  metadata?: Record<string, string>
): void;
export function clearUserContext(): void;
export function withUserContext(props: SanitizedProps): SanitizedProps;
```

Internal Implementation:

- Guards check `typeof window !== "undefined"`; throws descriptive errors server-side.
- Stores sanitized copies; uses `Sentry.setUser` for parity with error logging.
- Provides `getUserContextForTests()` behind `__TEST__` flag for assertions.

Dependencies: `@sentry/nextjs` (already present).
Used by: React hook, `trackEvent`.

Error Handling:

- Server-side invocation → Error with remediation tips.
- Sentry failure → console warn in dev only.

## Module: TransportRouter (`src/lib/analytics/router.ts`)

Responsibility: Hide provider APIs, fan-out sanitized payloads per runtime.

Public Interface:

```typescript
export async function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties?: AnalyticsEventProperties<Name>
): Promise<void>;
export function reportError(
  error: Error,
  context?: Record<string, unknown>
): void;
```

Internal Implementation:

- Detect runtime (client vs. server) once per call via `typeof window`.
- Lazy-load client adapter (`@vercel/analytics/react`).
- Cache promise for server adapter (`@vercel/analytics/server`).
- Always call Sentry via sanitized extra when `shouldEnableSentry` true.
- Adds breadcrumbs like `analytics_event_sent` with event name/outcome.
- Emits structured log stub (`console.warn('[Telemetry]', ...)`) until pino lands; interface designed so logger drop-in later.

Dependencies: `SanitizationEngine`, `ContextManager`, `shouldEnableSentry`, `loadServerTrack` helper.
Used by: Feature code, instrumentation hooks, server helpers, testkit.

Error Handling:

- Transport errors swallowed after logging + optional Sentry breadcrumb `analytics_transport_failed` (non-fatal).
- Router respects enablement flags: `NEXT_PUBLIC_DISABLE_ANALYTICS`, `NEXT_PUBLIC_ENABLE_ANALYTICS`, `NODE_ENV`, `process.env.VERCEL_ENV`.

## Module: InstrumentationHooks (`src/lib/analytics/instrumentation/`)

Responsibility: Make correct usage the path of least resistance for UI + backend.

Components:

1. **`useAnalyticsUserContext`** (client hook in `instrumentation/useAnalyticsUserContext.ts`)

   ```typescript
   export function useAnalyticsUserContext(user: UserResource | null) {
     useEffect(() => {
       if (!user) {
         clearUserContext();
         return;
       }
       setUserContext(user.id, { plan: user.publicMetadata.plan ?? "free" });
       return () => clearUserContext();
     }, [user?.id]);
   }
   ```

   - Consumed by dashboard shell + marketing layout once; ensures ≥90% sessions enriched.

2. **`withServerAnalytics`** (`instrumentation/withServerAnalytics.ts`)

   ```typescript
   export function withServerAnalytics(handler: Handler): Handler {
     return async (req, ctx) => {
       const track = await getServerTrack();
       const scoped = createScopedTracker(track, ctx);
       return handler({ ...ctx, trackEvent: scoped });
     };
   }
   ```

   - Wrap Next route handlers + Convex actions/mutations.
   - Attaches correlation IDs (requestId or Convex ctx.requestId) into props automatically.

3. **`instrumentConvexMutation`**
   - HOC for Convex functions; ensures analytics calls await sanitized server transport but never block DB writes (fire-and-forget inside `void track()`).

4. **`AnalyticsGuard`** component
   - Wraps `/test-analytics` and other debug UIs with environment check (dev-only) returning 404 via `notFound()` otherwise.

Error Handling:

- All wrappers require explicit opts (e.g., `autoTrackSuccess`, `autoTrackFailure`), default false to avoid noise.

## Module: TelemetryTestkit (`src/lib/analytics/testkit/`)

Responsibility: Deterministic testing utilities so instrumentation is verifiable.

Public Interface:

```typescript
export function createAnalyticsMock(): AnalyticsMock;
export function expectAnalyticsEvent(
  mock: AnalyticsMock,
  name: AnalyticsEventName,
  matcher?: Partial<SanitizedProps>
): void;
export function resetAnalyticsState(): void;
```

Implementation Notes:

- Mock replaces client/server adapters during tests via Vitest `vi.mock`.
- Provides `mock.reportError` counters for ensuring failure paths tested.
- Works in Playwright via exposing `window.__ANALYTICS__` stub when `process.env.PLAYWRIGHT_ANALYTICS_STUB === "true"`.

## Module: SelfTestSurfaces

1. **`/test-analytics`** (client page already present): upgrade to show status cards (Brutalist tokens) for each transport. Uses `useAnalyticsHealth` hook to ping `/api/test-error?type=report` + `@vercel/analytics` ping.
2. **`scripts/test-error-handling.sh`**: Keep for CLI validation; add lint to enforce dev-only.
3. **CI smoke**: Playwright test hitting `/test-analytics` ensures gating works.

## Core Algorithms

### `trackEvent`

1. If analytics disabled (env flags, NODE_ENV test/dev) → return early.
2. Determine runtime (client/server), set `isDev` flag for logging.
3. Extract properties arg default `{}`; if event requires props and missing, throw in dev.
4. `sanitized = sanitizeProperties(props)`.
5. `enriched = withUserContext(sanitized)` (client only).
6. Attach `correlationId` (from `getRequestId()` if server) + timestamps.
7. Branch:
   - Client: `await clientAdapter.track(name, enriched)`.
   - Server: `await serverAdapter.track(name, enriched)` using cached import.
8. On error: log `[Telemetry] transport_failed`, capture breadcrumb, exit.

### `reportError`

1. If Sentry disabled → return.
2. `sanitizedContext = sanitizeProperties(context ?? {})`.
3. Invoke `Sentry.captureException(error, { extra: sanitizedContext })`.
4. On failure: dev-only warn.

### `withServerAnalytics`

1. `track = await loadServerTrack()`.
2. Create wrapper `scopedTrack(name, props)` adding `userId` from ctx (Convex identity, Clerk session) if missing.
3. Provide to handler via context argument; handler responsible for awaited call.
4. If track missing (e.g., adapter import failed) → log once, return noop.

### `sanitizeProperties`

1. Initialize `result`, `seen = new WeakSet()`.
2. For each `[key,value]`:
   - Skip null/undefined.
   - Numbers/booleans pass through.
   - Strings → `sanitizeString`.
   - Objects/arrays → if seen -> `[Circular]`; else `JSON.stringify` with replacer sanitizing nested strings, catch errors.
   - Non-serializable (function, symbol) → `[Unsupported:${typeof value}]`.
3. If `JSON.stringify(result)` length > 4096 bytes → return `{ droppedReason: "payload_too_large" }`.

### `instrumentConvexMutation`

1. Accept `mutation` and options (`eventsOnSuccess`, `eventsOnFailure`).
2. Return wrapper `async function(ctx, args)`:
   - `const correlationId = ctx.requestId`.
   - `const result = await mutation(ctx, args)`.
   - Fire-and-forget `Promise.resolve(track(eventName, {..., correlationId}))` for each configured event.
   - Catch track errors; log to `console.warn` + `ctx.log` (Convex logger) to keep parity.
   - Return result.

### `useAnalyticsUserContext`

1. `const { user } = useUser()`.
2. `useEffect(() => { if (!user) { clearUserContext(); return; } setUserContext(user.id, { plan: user.publicMetadata.plan ?? "free" }); return () => clearUserContext(); }, [user?.id]);`
3. `useEffect` depends on sanitized metadata to avoid unnecessary rerenders.

## File Organization

```
src/lib/analytics/
  events.ts
  sanitizer.ts
  context.ts
  router.ts
  transports/
    client.ts
    server.ts
    sentry.ts
  instrumentation/
    useAnalyticsUserContext.ts
    withServerAnalytics.ts
    instrumentConvex.ts
  testkit/
    index.ts
    mock.ts
    expect.ts
  __tests__/
    analytics.router.test.ts
    analytics.sanitizer.test.ts
    analytics.context.test.ts
```

Existing files updated:

- `src/lib/analytics.ts` becomes re-export barrel referencing new modules (maintain public API for gradual migration).
- `src/app/layout.tsx` imports `useAnalyticsUserContext` hook inside providers (client boundary) via dedicated component.
- `convex/` mutations wrap via `instrumentConvexMutation`.
- `e2e/critical-flow.spec.ts` uses Playwright stub to assert events.
- `scripts/test-error-handling.sh` gains router health checks.

## Integration Points

- **Sentry**: already configured via `src/lib/sentry.ts`. Add breadcrumbs `category: "analytics"`, `data: { name, status }`. Ensure `SENTRY_RELEASE` env remains in CI.
- **Vercel Analytics**: no new env. Ensure `AnalyticsWrapper` still filters sensitive URLs; extend filter list when new routes added.
- **Convex**: `instrumentConvexMutation` imports from `convex/server`. Needs Convex identity for userId enrichment; fallback to props.
- **Clerk**: `useAnalyticsUserContext` uses `@clerk/nextjs` `useUser`. Document requirement in README/CLAUDE.
- **Playwright**: `pnpm test:e2e` sets `PLAYWRIGHT_ANALYTICS_STUB=true` to avoid leaking real data; stub collects events for assertions.
- **Quality gates**: Husky + CI already run lint/type/test/build. Add `pnpm test:telemetry` (vitest focus + Playwright tag) to CI job matrix (before coverage extraction) to keep telemetry-specific signals visible.
- **Observability**:
  - Error tracking: `reportError` used by `/api/test-error` + error boundaries.
  - Structured logging: prepare for `pino`; until then, prefix logs `[Telemetry]`.
  - Performance monitoring: add optional `performance.mark('analytics:track:start')` when `process.env.ANALYTICS_PROFILE` to sample cost.
- **Env vars**: reuse `NEXT_PUBLIC_DISABLE_ANALYTICS`, `NEXT_PUBLIC_ENABLE_ANALYTICS`, `SENTRY_DSN`. No new secrets.

## State Management

- **Client**: `ContextManager` holds module-level state; only set via `useAnalyticsUserContext`. React components never touch global state directly otherwise.
- **Server**: No module state; each request builds correlation IDs + context via wrapper injection, preventing leakage.
- **Caching**: Dynamic import promises cached at module scope (server). Sanitizer caches regex; no data caching for events.
- **Concurrency**: Track calls fire-and-forget on server, but we guard with `.catch()` to avoid unhandled rejections. On client, call awaited but swallow errors.

## Error Handling Strategy

- **Categories**: validation (missing props), transport failures, guard violations, sanitization failures.
- **Propagation**: Validation errors throw in dev only (gated by `NODE_ENV !== 'production'`), degrade to warn in prod. Transport failures logged + Sentry breadcrumb; no user-facing errors.
- **API responses**: `/api/test-error` returns 404 prod, 200 dev. Backend wrappers never expose internal messages to clients.
- **Observability**: All failures emit `analytics_failure` breadcrumb with `errorType`, `eventName`, `env`.

## Testing Strategy

- **Unit**: `vitest` suites for sanitizer, router, context, instrumentation wrappers. Use TelemetryTestkit to assert sanitized output + guard behavior. Commands: `pnpm test src/lib/analytics/__tests__/analytics.router.test.ts` etc.
- **Type safety**: Keep `analytics.test-d.ts` updated; add new events and guard that invalid props fail compile.
- **Integration**: Component tests ensuring `useAnalyticsUserContext` invoked once per login; Next API route tests using `withServerAnalytics` verifying correlation injection; Convex tests via `convex-test` to ensure instrumentation optional.
- **E2E**: Playwright scenarios for logging a set + verifying stub receives `Set Logged`. Another scenario for gating `/api/test-error` in preview env (via env override).
- **Quality gates**: Extend Husky pre-push hook to run `pnpm test --run analytics` subset. CI adds `pnpm test:telemetry` before coverage; coverage thresholds: analytics files lines≥85, branches≥70 enforced via `vitest` `--thresholds-file analytics.thresholds.json`.

## Performance & Security Notes

- **Load targets**: Expect up to 10k events/day mid-term; sanitization budget ≤100µs per event; track call ≤1ms client average (excl. network).
- **Security**: All strings sanitized via regex; metadata limited to string map; user context stored client-only. Convex instrumentation ensures `userId` matches `identity.subject` before enrichment.
- **Threats**: PII leakage mitigated by sanitizer + tests; replay/resubmission of events inconsequential (idempotent). Avoid logging secrets by filtering `token=`, `secret=`, `key=` already in `AnalyticsWrapper`.
- **Observability requirements**:
  - Performance budget: ensure `trackEvent` adds <1% to Core Web Vitals; sample via `ANALYTICS_PROFILE` builds.
  - Error budget: <0.1% `analytics_transport_failed` per day; alert if exceeded via Sentry metric alert.
  - Metrics: add counter `analytics.events.sent` with tags {name, runtime}; exported via console log for now, ready for future metrics sink.
  - Alerting: extend `scripts/configure-sentry-alerts.sh` to add rule “Analytics Transport Failure >20/min”.
  - Release tracking: Continue `SENTRY_RELEASE`; add git hash to analytics self-test UI for quick correlation.

## Alternative Architectures Considered

| Option                                 | Description                                                         | Simplicity (40%) | Module Depth (30%) | Explicitness (20%) | Robustness (10%) | Weighted | Verdict                                                                           | Trigger to Revisit                                                      |
| -------------------------------------- | ------------------------------------------------------------------- | ---------------- | ------------------ | ------------------ | ---------------- | -------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Facade + Adapter Mesh (selected)**   | Current plan. Single-module facade, adapters per runtime.           | 9 (3.6)          | 8 (2.4)            | 9 (1.8)            | 8 (0.8)          | **8.6**  | ✅                                                                                | Revisit if transports multiply or structured logging lands elsewhere.   |
| **Convex Relay Service**               | All events POST to Convex mutation which forwards to Vercel/Sentry. | 5 (2.0)          | 6 (1.8)            | 7 (1.4)            | 6 (0.6)          | 5.8      | ❌ added hop latency, Convex auth/rate limits, extra maintenance.                 | Consider if we need event warehousing or queue semantics.               |
| **External CDP (Segment/RudderStack)** | Replace custom module with CDP SDK.                                 | 3 (1.2)          | 5 (1.5)            | 6 (1.2)            | 7 (0.7)          | 4.6      | ❌ new vendor cost, PII review, heavier bundles.                                  | Revisit if multi-destination fan-out + warehouse sync become must-have. |
| **Edge Worker Telemetry**              | Ship analytics from Vercel Edge middleware intercepting requests.   | 4 (1.6)          | 4 (1.2)            | 5 (1.0)            | 7 (0.7)          | 4.5      | ❌ limited to HTTP events, misses client interactions, adds edge cold-start risk. | Consider if server-only telemetry becomes priority.                     |

## Open Questions / Assumptions

1. **Scale target** (Product, due 2025-11-26) – influences batching + payload caps.
2. **Data retention beyond Vercel** (Leadership, 2025-12-03) – may demand Convex relay.
3. **Consent requirements for EU/CA** (Legal, 2025-12-10) – determine opt-out plumbing.
4. **BI export expectations** (Data, 2025-11-30) – drives schema metadata + CLI.
5. **Service user instrumentation** (Ops, 2025-11-28) – clarify to avoid noisy events.
6. **Backfill analytics** (AI/Reports, 2025-12-05) – whether to emit events for historical jobs.
7. **PII scope (phone/device)** (Security, 2025-11-27) – may extend sanitizer patterns.
8. **Alert routing destination** (On-call lead, 2025-11-25) – needed for new Sentry alert channel.
9. **CDP adoption plans** (Leadership, 2025-12-15) – determines whether to keep facade pluggable.
