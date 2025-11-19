# Telemetry Reliability PRD

## 1. Executive Summary

Analytics core in `src/lib/analytics.ts` currently sits at 35.84% coverage and only marketing/test pages call `trackEvent`, so leadership cannot trust event-driven KPIs or privacy posture. Missing tests around `sanitizeEventProperties` and `reportError` mean we could leak emails to Sentry or drop server events without alarms. This PRD delivers a deep analytics module plus developer tooling so every critical workout flow emits typed, sanitized events across Next.js + Convex without leaking implementation complexity. Success metrics: analytics.ts ≥85% line/function coverage, five critical flows tracked within 1 second of action (p95), zero redacted-field regressions per release, `/api/test-error` unreachable in preview/prod, self-test dashboard green in CI.

## 2. User Context & Outcomes

- **Athletes logging sets**: want trustworthy history + insights; telemetry lets us prove regressions fast so workouts stay uninterrupted.<br>- **Product + Growth**: need funnel + retention dashboards; typed catalog ensures analysts get consistent properties.<br>- **Engineering/On-call**: need to pinpoint failures; PII-safe Sentry context shortens MTTR from hours→minutes.<br>- **Compliance & Support**: need assurance no sensitive data hits third parties; deterministic sanitization + tests create audit trail.
- Measurable impact: `<24h` turnaround for telemetry incidents, ≥90% of Clerk-auth sessions add user context, Sentry issue resolution time down 30% once context auto-attached.

## 3. Requirements

### Functional

1. **Event Catalog**: single `analytics/events.ts` export enumerating event names + schemas; CLI lint prevents unused/broken events.
2. **Transport Abstraction**: facade chooses `@vercel/analytics/react` client, `@vercel/analytics/server` on server, and Sentry reporting w/ fire-and-forget promises guarded by timeouts.
3. **User Context Bridge**: client hook wraps `@clerk/nextjs` to call `setUserContext` inside `useEffect`, plus SSR guard to avoid leaking across reqs.
4. **Server Instrumentation**: helper for Convex/Next server handlers returns noop when analytics disabled, sanitizes payloads, and logs fallback warnings to structured logger once available.
5. **PII Sanitization Guarantees**: cover nested objects, arrays, circular refs, and invalid UTF-8; rejection logging when sanitization fails.
6. **Instrumentation Coverage**: track events for exercise create/delete, set log/edit, session start/finish, marketing CTA, auth (sign-in/out). Provide usage docs + codemods.
7. **Developer Self-Test**: `/test-analytics` + `scripts/test-error-handling.sh` stay dev-only and assert all transports reachable; page must surface red/yellow states for each transport.
8. **Docs & Playbook**: README + CLAUDE sections updated with instrumentation recipes, privacy guarantees, and rollback steps.

### Non-functional

- Reliability: telemetry never blocks user work; failure budgets <100ms overhead per call; auto-fallback to noop when env misconfigured.
- Privacy: zero plain emails/IPs forwarded; sanitizers treat ASCII/Unicode, ensure `[EMAIL_REDACTED]` idempotent.
- Coverage: analytics-related files ≥85% lines/functions, ≥70% branches; Playwright smoke ensures user context + events emitted on login.
- Observability resilience: instrumentation exports log correlation IDs to Sentry breadcrumbs + (future) Pino logger.
- Compatibility: works under dual-server dev command (`pnpm dev`) and Vercel edge/serverless deployments without extra env vars beyond DSN + toggles already documented.

### Infrastructure requirements

- **Quality gates**: Husky lint-staged before commit, CI `.github/workflows/ci.yml` already runs `pnpm typecheck`, `pnpm lint`, `pnpm test --run --coverage`, `pnpm build`, `pnpm test:e2e`; Telemetry PR must keep pipeline green and add targeted Vitest suites under `src/lib/` plus Playwright tags.
- **Observability**: keep Sentry config via `src/lib/sentry.ts` + scripts `scripts/deploy-observability.sh` and `scripts/configure-sentry-alerts.sh`; ensure release info (`SENTRY_RELEASE`) stays wired; extend `AnalyticsWrapper` filters if new sensitive paths emerge.
- **Design consistency**: any developer UI or status badges reuse Brutalist tokens from `DESIGN_SYSTEM.md` (e.g., 3px borders, uppercase labels, `danger-red` states) and lives inside `src/components/dashboard` or `/test-analytics` client components.
- **Security**: `/api/test-error` 404s when `process.env.NODE_ENV === "production"`; Convex backfill actions moved behind `internalAction` or identity check; env secrets stored in `.env.local` and Vercel envs per README; telemetry helpers must not expose tokens to client bundles.

## 4. Architecture Decision

### Selected approach: Deep analytics facade + adapters + testkit

- Keep analytics logic in one module tree: `analytics/events.ts` (types), `analytics/core.ts` (sanitize, context, enablement), `analytics/transports/{client,server}.ts`, `analytics/testkit.ts` (helpers/mocks), and `analytics/instrumentation.ts` (Clerk + Convex bridges).
- Domain code imports a single `trackEvent`/`reportError` facade; no component reaches into transports. Guards ensure SSR never reuses client context. Adapters report failures to Sentry breadcrumbs + (future) logger but never throw.
- Provide `createAnalyticsMock()` for Vitest + `expectAnalyticsEvent()` helper so components can assert instrumentation without brittle spies.
- Rationale: best ratio of user value (immediate telemetry), simplicity (no new infra), explicitness (typed catalog), and risk control (existing dependencies only).

### Alternatives

| Approach                             | Description                                                                 | User Value (0-10) | Simplicity (0-10) | Explicitness (0-10) | Risk (10=low) | Weighted Score | Verdict                                                              |
| ------------------------------------ | --------------------------------------------------------------------------- | ----------------- | ----------------- | ------------------- | ------------- | -------------- | -------------------------------------------------------------------- |
| A) Deep facade + adapters (selected) | Keep logic inside Next repo, add adapters/testkit.                          | 8                 | 8                 | 9                   | 7             | 8.1            | ✅ Highest score, incremental, zero new services.                    |
| B) Convex event relay                | Write Convex mutation to ingest events then forward to analytics providers. | 7                 | 4                 | 7                   | 5             | 6.1            | ❌ Adds network hop + queuing complexity, Convex auth + rate limits. |
| C) Adopt Segment/RudderStack         | External CDP handles schema + delivery.                                     | 9                 | 2                 | 6                   | 4             | 5.7            | ❌ Requires new vendor, contracts, client bundles, PII review.       |

### Module boundaries

- **`analytics/events.ts`**: exports `AnalyticsEventDefinitions`, `AnalyticsEventName`, `AnalyticsEventProperties<Name>`. Dependents read-only; implementation hides sanitizers.
- **`analytics/core.ts`**: owns sanitization, enablement flags, WeakSet tracking. Interface: `{ trackEvent, reportError, setUserContext, clearUserContext }`. Only depends on `events` + environment helpers.
- **`analytics/transports/client.ts`**: lazily loads `@vercel/analytics/react`, handles retries + dev warnings. Interface: `sendClientEvent(name, props)`. No component touches `Analytics` component directly besides `AnalyticsWrapper`.
- **`analytics/transports/server.ts`**: caches dynamic import of `@vercel/analytics/server`. Interface: `sendServerEvent`, exposes hook for Convex/resolvers.
- **`analytics/testkit.ts`**: exports `createAnalyticsMock`, `resetAnalyticsState`, `expectSanitized(eventName, property)`. Depends only on `events`.
- **`analytics/instrumentation.tsx`**: React client component/hook hooking into Clerk's `useUser`, calling `setUserContext` inside `useEffect`, and clearing on sign-out. Server variant wraps Next route handlers.

### Layering / vocabulary shifts

1. **Feature layer (components, Convex mutations)** speak in workout terms (“Set Logged”).
2. **Analytics facade** speaks telemetry vocabulary (event payload objects) and hides environment toggles.
3. **Transports** speak provider vocabulary (Vercel track, Sentry capture) and own retries/timeouts; nothing higher knows provider-specific APIs.
4. **Foundations** (sanitizers, env detection) speak security/perf vocabulary.

## 5. Data & API Contracts

- **Event schema** (initial catalog):
  - `Exercise Created` `{ exerciseId: string; source?: "manual"|"ai"|"import"; userId?: string; }`
  - `Exercise Deleted` `{ exerciseId: string; userId?: string; reason?: "user"|"stale"; }`
  - `Set Logged` `{ setId: string; exerciseId: string; reps: number; weight?: number; userId?: string; rpe?: number; }`
  - `Set Edited` `{ setId: string; fields: string[]; userId?: string; }`
  - `Workout Session Started/Completed` as existing, plus `device?: "web"|"mobile"`.
  - `Marketing CTA Click`, `Marketing Page View`, `Marketing FAQ Toggle`, `Marketing Nav Click` unchanged.
  - `Auth Signed In/Out` `{ userId: string; method: "email"|"passkey"|"oauth"; }` for Clerk instrumentation.
- **Properties contract**: sanitized output always `Record<string, string|number|boolean>`; nested data stringified JSON with `[EMAIL_REDACTED]` tokens; `[Circular]` placeholder for recursive references; `[Unstringifiable Object]` fallback when JSON.stringify fails.
- **User context contract**: `setUserContext(userId: string, metadata?: Record<string,string>)` client-only; `clearUserContext()` removes Sentry user via `Sentry.setUser(null)`. Guard throws when called server-side.
- **Server helper**: `withServerAnalytics<T>(fn: (track: ServerTrack) => Promise<T>)` ensures server track import available; `ServerTrack` signature `track(name: AnalyticsEventName, props?: AnalyticsEventProperties<Name>): Promise<void>`.
- **Test endpoint** `/api/test-error`: GET with `type=throw|report|pii` returns 404 in production, 200 on manual report, throws for invalid type. Observability gate ensures Vercel previews safe.

## 6. Implementation Phases

- **Phase 0 (Design, 0.5d)**: finalize event catalog doc, confirm data consumers, add ADR summary referencing this PRD.
- **Phase 1 (MVP, 2d dev)**:
  1. Split `src/lib/analytics.ts` into `events`, `core`, `transports`, `testkit` without changing exports.
  2. Expand Vitest coverage: sanitize edge cases, server/client track permutations, failure fallbacks, user context leak guards.
  3. Add `useAnalyticsContext` hook in marketing + dashboard shells; wire instrumentation for exercise create/delete + set log flows.
  4. Gate `/api/test-error` + add Playwright smoke verifying dev/test gating.
- **Phase 2 (Hardening, 2d)**:
  1. Build Convex-friendly helper (wrapper around dynamic import) + instrument `convex/sets.ts` mutations for server events.
  2. Add Playwright scenario logging workout set and asserting analytics stub invoked (via browser-exposed mock).
  3. Document procedures in README + CLAUDE; add `pnpm test:telemetry` script bundling focused suites.
  4. Configure Sentry alerts via script + ensure release health dashboards include telemetry coverage badge.
- **Phase 3 (Future, backlog)**:
  - Introduce structured logging (`pino`) to capture fallback warnings, evaluate OpenTelemetry instrumentation, consider sending analytics to Convex for retention/export, hook uptime monitor to `/api/health` verifying telemetry dependencies.

## 7. Testing & Observability

- **Unit**: Vitest suites for sanitizers, enablement toggles, server/client adapters, user context guard (existing tests extend). Use `src/lib/analytics.test.ts[x]` + new snapshot of sanitized payloads. Add regression cases for Unicode emails + nested arrays.
- **Type safety**: keep `analytics.test-d.ts` but add optional schema for new events; run via `pnpm typecheck`.
- **Integration**: Component tests for `PageAnalyticsTracker`, new `useAnalyticsContext`, and instrumentation wrappers using `analytics/testkit`. Mock Clerk to simulate login/out.
- **Playwright**: Extend `e2e/critical-flow.spec.ts` to assert instrumentation stub gets calls when logging a set; use `page.exposeFunction` or `window.__ANALYTICS__` test hook toggled only in test env.
- **Error tracking**: `reportError` continues to wrap Sentry; ensure Sentry options from `src/lib/sentry.ts` reference sanitized breadcrumbs. PII redaction tested via `scripts/test-error-handling.sh` + automated Vitest cases.
- **Structured logging**: until Pino lands, fallback to `console.warn` w/ `[Telemetry]` prefix; once logger exists, integrate correlation IDs and pass to Sentry extra.
- **Performance monitoring**: Use Vercel Speed Insights to confirm instrumentation not shifting Core Web Vitals; if overhead >50ms client-side, move heavy sanitization to Web Worker (future).
- **Analytics verification**: Add `pnpm test:telemetry` (vitest --run analytics suites + Playwright tag). Provide Datadog-style checklist verifying event counts once per release.
- **Deployment tracking**: keep `SENTRY_RELEASE=$GITHUB_SHA` (already set in CI) plus coverage badge updates. Document rollback via `scripts/deploy-observability.sh`.
- **Alerting**: Use `scripts/configure-sentry-alerts.sh` to ensure new issue + error-rate + performance alerts exist. Add uptime monitor hitting `/api/test-error?type=report` in staging only; production monitors hit `/api/health`.

## 8. Risks & Mitigations

| Risk                                                                       | Likelihood | Impact | Mitigation                                                                                                                                               | Owner           |
| -------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| PII leakage due to missed sanitizer case (e.g., base64 strings)            | Medium     | High   | Add fuzz tests + red Team review; sanitize strings before base64 decode; run `pnpm test:telemetry` in CI.                                                | Telemetry owner |
| setUserContext accidentally called server-side causing cross-request bleed | Medium     | High   | Keep runtime guard + Vitest coverage; add Playwright check ensuring hook only runs client after `window` ready.                                          | Frontend lead   |
| Analytics transport failures hidden                                        | Medium     | Medium | Instrument fallback logger + Sentry breadcrumb `analytics_transport_failed` w/ env + event name; track occurrences in dashboard.                         | Platform        |
| Event schema drift vs. data consumers                                      | Medium     | Medium | Add lint script comparing `analytics/events.ts` to docs; enforce PR checklist entry; schedule monthly schema review.                                     | Product analyst |
| Performance hit on large payloads                                          | Low        | Medium | Limit payload size (<4KB) enforced via dev assert; use JSON.stringify replacer skipping large arrays; include instrumentation in Speed Insights budgets. | Perf champion   |
| Devs bypass instrumentation in new flows                                   | Medium     | Medium | Add Danger/CI rule blocking PR if new pages lack analytics import when hooking `convex` mutations; documentation emphasises requirement.                 | Repo maintainer |

## 9. Open Questions / Assumptions

1. **Scale**: What is target peak concurrent user count + daily event volume for 2026 roadmap? Owner: Product, Needed by: 2025-11-26.
2. **Data retention**: Do we need to persist analytics events in Convex/Postgres for audits beyond Vercel Analytics retention? Owner: Leadership, Needed by: 2025-12-03.
3. **Consent/opt-out**: Will EU/CA users require opt-in toggles for analytics, and should that propagate to Vercel + Sentry simultaneously? Owner: Legal, Needed by: 2025-12-10.
4. **Third-party exports**: Are we expected to forward events to BI tools (BigQuery, Mixpanel) soon? Influences interface design. Owner: Data, Needed by: 2025-11-30.
5. **Auth edge cases**: Should service users (admin scripts) emit analytics or skip to avoid noise? Owner: Ops, Needed by: 2025-11-28.
6. **Backfill jobs**: When Convex `backfillWeeklyReports` runs, should we emit analytics or skip to avoid double counting? Owner: AI team, Needed by: 2025-12-05.
7. **PII scope**: Are phone numbers + device IDs considered sensitive for this stack (should we redact)? Owner: Security, Needed by: 2025-11-27.
8. **Alert destinations**: Where should telemetry failure alerts route (Slack channel, PagerDuty)? Owner: On-call lead, Needed by: 2025-11-25.

Assumptions pending answers: analytics provider remains Vercel + Sentry for next quarter, no paid CDP planned, marketing can tolerate 1-second delay before events appear.
