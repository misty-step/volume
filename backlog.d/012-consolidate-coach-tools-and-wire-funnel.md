# 012 Consolidate coach tools 34→10 + wire conversion funnel

**Status:** open
**Priority:** high
**Created:** 2026-04-20
**Source:** groom session (explore; absorbs GH #468, #469, #470, #471); locked direction in `project.md:47`
**Blocks:** follow-on "Theme 3 — instrument trial→paid funnel" (deferred)
**Blocked by:** **011** (route flip should land first so funnel signal is meaningful)

## Context

`project.md:47` locks the direction: "Consolidate 26 → ~10 capability groups — fewer, deeper tools = better model accuracy." The Archaeologist found **34** `defineTool(` invocations in `src/lib/coach/tools/registry.ts` — 8 over the original target, and no progress since the March 14 groom. GH issues **#468 (structured routing rules)**, **#469 (simplify discriminated-union schemas)**, **#470 (two-stage inference evaluation)**, **#471 (overlapping tool responsibilities)** are all sub-threads of this consolidation.

Velocity data shows the effect: 27 of 81 commits in 60 days touch the coach surface, with a 5-fix:6-feat ratio. Each new feature pulls a fix the following week. That cadence is what a bloated tool surface looks like — model confusion at routing time becomes a post-ship regression.

The funnel half of this item exists because Strategist flagged that PaywallGate is mechanically correct (ADR-0006 state machine) but conversion is opaque — no trial→paid instrumentation. PostHog is already wired (`src/lib/analytics.ts`), so the work is event wiring, not infrastructure. Bundling with tool consolidation is deliberate: a tighter tool surface makes upgrade-relevant suggestions more reliable, and the analytics tell us whether the consolidation actually moved conversion.

## Outcome

Coach registry has ≤12 tools enforced by CI; the 10-group map below is implemented; `Upgrade Click` + `Payment Success` events fire into PostHog with the schema below; coach eval fixture (new) passes pre- and post-consolidation.

## Shape cues

- **Proposed 10-group map** (from groom deep-dive; see that session for per-tool rationale):
  1. `log_workout` — consolidates log_set, log_sets, bulk_log (action: `log_single | log_multiple`)
  2. `query_session` — consolidates get_today_summary, get_workout_session, get_date_range_sets, get_history_overview, query_workouts (action: `today | specific_date | date_range | recent_history`)
  3. `query_exercise_data` — consolidates query_exercise, get_exercise_snapshot, get_exercise_trend, get_exercise_history (action: `snapshot | trend_14_day | history`)
  4. `manage_exercise` — keep (already 5-action union)
  5. `modify_workout` — consolidates modify_set, delete_set, edit_set (action: `edit | delete`)
  6. `manage_settings` — consolidates update_settings, set_weight_unit, set_sound, update_preferences (action: `weight_unit | sound | preferences`)
  7. `get_insights` — rename (already union of analytics + focus_suggestions)
  8. `manage_memories` — keep
  9. `read_library` — consolidates get_exercise_library, show_workspace (action: `library | workspace`)
  10. `read_reports` — rename get_report_history

- **Files likely touched:**
  - `src/lib/coach/tools/registry.ts` — central merge
  - `src/lib/coach/tools/schemas.ts` — discriminated-union definitions
  - `src/lib/coach/tools/*.ts` — per-tool handler consolidation
  - `src/lib/coach/agent-prompt.ts` — add explicit intent→tool routing examples (#468)
  - `src/lib/coach/presentation/compose.ts` — planner↔presenter decision log (#470)
  - `src/lib/coach/tools/helpers.ts` — preserve `exerciseNotFoundResult()` contract
  - `src/lib/analytics.ts` — add `Upgrade Click`, `Payment Success` event types
  - `src/components/subscription/paywall-gate.tsx` — fire `Upgrade Click` on CTA
  - `convex/http.ts` or checkout-success path — fire `Payment Success`
  - `convex/coach.ts`, `convex/coachSessions.ts` — if tool registry binding references Convex signatures, mirror any changes
  - E2E: `e2e/coach-flows.spec.ts` — tool-invocation flows re-asserted against new schema
  - New: `src/lib/coach/tools/__fixtures__/eval.ts` or `e2e/coach-eval.spec.ts` — regression fixture for tool routing quality
  - New: CI guard in `.github/workflows/ci.yml` OR `scripts/verify-coach-tool-count.ts` wired into `bun run architecture:check`

- **Event schema additions:**

  ```typescript
  "Upgrade Click":    { session_id: string; surface: "pricing_page" | "upsell_banner" | "coach_suggestion"; trial_day?: number };
  "Payment Success":  { session_id: string; price_id: string; trial_day?: number };
  ```

- **Gate impact:**
  - `bun run typecheck` — discriminated-union schemas must cover every prior action
  - `bun run test:affected` — unit tests for each consolidated handler; existing Convex tests stay green
  - `bun run test:coverage` — merged tools reduce surface; thresholds should hold or improve
  - `bun run architecture:check` — unchanged; tools stay under `src/lib/coach/tools/` boundary (`src/lib/architecture-policy.ts`)
  - `bun run test:e2e` — `coach-flows.spec.ts` assertions against tool-call shape update
  - New CI guard: `rg -c "defineTool\(" src/lib/coach/tools/registry.ts` must return ≤ 12

- **Related ADR / docs:**
  - `project.md:47` (locked direction)
  - `docs/patterns/coach-tools.md`
  - ADR-0006 (subscription state; funnel events align to states)
  - ADR-0008 (OpenRouter portfolio; tool count affects routing prompt size)

- **GH issues absorbed (close on merge):**
  - #468 → acceptance: coach prompt includes explicit intent→tool decision tree with ≥5 ambiguous-input examples
  - #469 → acceptance: legacy tool schemas removed; canonical tools use strict discriminated unions with passing validation tests
  - #470 → acceptance: planner→presenter boundary either collapsed or documented with decision log in `src/lib/coach/presentation/compose.ts`
  - #471 → acceptance: each tool description includes when-to-prefer guidance; ambiguous-input coverage ≥80%

## Not in scope

- Route flip / coach-as-default landing (shipped in **011**).
- `Kickoff Reached` / `First Message` / `First Log` events (shipped in **011**).
- Funnel dashboard / reporting UI in PostHog — events-only here; dashboard design is a separate product decision.
- A/B testing harness for tool variants — one-shot consolidation, not an ongoing experiment.
- Replacing OpenRouter or model swap — ADR-0008 governs model choice; this item is orthogonal.
- Migration of any remaining SSE/legacy streaming code paths.

## Acceptance

- [ ] `rg -c "defineTool\(" src/lib/coach/tools/registry.ts` returns ≤ 12 (CI-enforced)
- [ ] Each of the 10 canonical tools has: a discriminated-union schema, a when-to-prefer description, unit tests for every action branch
- [ ] Coach eval fixture exists and passes; post-consolidation routing accuracy ≥ pre-consolidation baseline (captured in PR body)
- [ ] GH #468, #469, #470, #471 closed by merge commit (trailer: `Closes #468, #469, #470, #471`)
- [ ] `Upgrade Click` + `Payment Success` events verified firing end-to-end (PaywallGate CTA → Stripe webhook → Convex)
- [ ] `bun run quality:full` green; `bun run test:e2e` green
- [ ] PR description documents the routing-accuracy delta and includes a screen capture of the funnel in PostHog (via `/demo`)
