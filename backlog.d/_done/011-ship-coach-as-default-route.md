# 011 Ship coach as default post-auth route

**Status:** done
**Priority:** high
**Created:** 2026-04-20
**Source:** groom session (explore; convergence from Archaeologist + Strategist + Velocity)

## Context

Volume's North Star (per `project.md:5-7`) is "one conversation surface replaces everything — no dedicated pages for logging, analytics, settings, or history." The architecture to deliver this is shipped — json-render catalog, AI SDK 6 `streamText`, Convex persistence, memory, kickoff payload, 14-day trial gating. But the post-auth entry point still lands users on `/today`: `src/app/(app)/coach/page.tsx:9` unconditionally redirects coach seekers back to the dashboard.

The result is that the coach reads as an _optional_ advanced feature rather than the default experience. Users who want to realise the North Star have to navigate to it; users who don't know it exists never find it. The Strategist lens named this as the central product gap; Velocity data confirms 33% of commits (27/81 in 60d) land in the coach surface with a 5-fix:6-feat ratio — the team is pouring effort into a feature they haven't made primary.

Route infrastructure is route-agnostic today (PaywallGate + `layout.tsx` don't care about the path), so the actual flip is small. This item isolates the safe, fast half of the "North Star" groom theme. The complementary tool-consolidation + funnel work lives in **012** so behavioural risk doesn't couple to the route flip.

## Outcome

After auth, visiting `/` renders the coach workspace (not `/today`), and `Kickoff Reached` + `First Message` + `First Log` events fire into PostHog with the schema below; `bun run test:e2e` is green against the new default route.

## Shape cues

- **Files likely touched:**
  - `src/app/page.tsx` — render public landing for signed-out visitors and coach workspace for signed-in users
  - `src/app/(app)/coach/page.tsx` — preserve `/coach` as a compatibility redirect to `/`
  - `src/components/layout/app-shell.tsx` — share authenticated shell between root and app routes
  - `e2e/coach-flows.spec.ts:22` — change entry URL `/coach` → `/`
  - `e2e/subscription-flow.spec.ts` — assert `/coach` compatibility redirect resolves to the workspace
  - `e2e/critical-flow.spec.ts` — audit for hardcoded `/coach` or `/today` route assumptions
  - `src/lib/analytics.ts` — add 3 `AnalyticsEventDefinitions` entries: `Kickoff Reached`, `First Message`, `First Log`
  - `src/lib/coach/run-turn.ts` (or nearest turn-handler) — fire `First Message` + `First Log` events
  - coach workspace mount point — fire `Kickoff Reached` on first paint per session
  - `src/components/layout/nav` — verify `/today` still navigable (it remains a valid route)

- **Gate impact:**
  - `bun run typecheck` — strict `AnalyticsEventDefinitions` additions must compile
  - `bun run test:affected` — unit tests for new event call-sites
  - `bun run test:e2e` — route change requires spec updates
  - `bun run architecture:check` — unaffected (no boundary changes)
  - `bun run test:coverage` — `(app)/page.tsx` is under the `**/src/app/**/page.tsx` exclude in `vitest.config.ts:40`; thresholds hold

- **Event schema (strict typing in `src/lib/analytics.ts`):**

  ```typescript
  "Kickoff Reached": { session_id: string; source: "page_load" | "deeplink"; trial_day?: number };
  "First Message":   { session_id: string; turn_index: number; tool_calls_count: number };
  "First Log":       { session_id: string; exercise: string; time_to_first_log_ms: number };
  ```

- **Related ADR / docs:**
  - `project.md:5-7, 39-41` (North Star + current focus)
  - `docs/agentic-rebuild-vision.md`
  - `docs/coach-agent-architecture.md`
  - ADR-0006 (subscription state machine; PaywallGate is already route-agnostic)

- **Related postmortem / incident:** none directly; Velocity identified obs drift risks — addressed in **013** not here.

## Not in scope

- Tool consolidation (34 → 10 capability groups) — lives in **012**.
- `Upgrade Click` + `Payment Success` funnel events — lives in **012** (they touch PaywallGate + checkout flow, which is a separate blast radius).
- Onboarding tour / first-run experience in the coach.
- Pricing page UX redesign.
- Removing `/today` as a route (it remains, nav-accessible; just not the default).
- Mobile-vs-desktop split reflow (`DashboardMobile`/`DashboardDesktop` unaffected).

## Acceptance

- [x] `GET /` (authenticated, active subscription) renders coach workspace; no redirect
- [x] `GET /today` still renders dashboard (backwards compatibility)
- [x] `/coach` remains a compatibility redirect to the canonical root workspace
- [x] PostHog `Kickoff Reached`, `First Message`, `First Log` events verified firing in local dev (PostHog `captureEvent` mock asserted in tests)
- [x] `bun run quality:full` green
- [x] `bun run test:e2e` green (coach-flows + critical-flow)
- [x] PR descriptions include verification evidence for the new default landing
