---
name: qa
description: |
  Browser-based QA, exploratory testing, evidence capture, and bug reporting.
  Drive running applications and verify they work — not just that tests pass.
  Use when: "run QA", "test this", "verify the feature", "exploratory test",
  "check the app", "QA this PR", "capture evidence", "manual testing",
  "scaffold qa", "generate qa skill".
  Trigger: /qa.
argument-hint: "[url|route|feature|scaffold]"
---

# /qa

QA for Volume spans two surfaces: automated Playwright in `e2e/` and the
tailored `/volume-manual-qa` companion skill. Route first, then execute.

## Execution Stance

You are the executive orchestrator.

- Keep test scope, severity classification, and final pass/fail call on the lead model.
- Delegate route execution and evidence capture to focused subagents.
- Use independent verification when the same agent captured the evidence.
- "Tests green" and `gh pr checks` clean are prerequisites, not QA.

## Routing

| Intent                                         | Action                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Auth / subscription / coach / quick-log change | `Skill(volume-manual-qa)` — critical-flow surface is already tailored          |
| Full regression before PR land                 | `bun run test:e2e` then `Skill(volume-manual-qa)` for evidence                 |
| Prod incident repro                            | Quick protocol against `https://volume.fitness`, write `INCIDENT-<UTC>.md`     |
| "scaffold qa"                                  | Critical-flow surface changed — re-scaffold `volume-manual-qa`, not this skill |
| Quick one-off on a single route                | Use the quick protocol below                                                   |

If first argument is `scaffold` and the critical-flow set has genuinely
shifted, regenerate `.agents/skills/volume-manual-qa/` — do not add a
parallel skill here.

## Automated Lane: Playwright

```bash
bun run dev              # http://localhost:3000 must be reachable
bun run test:e2e         # runs e2e/*.spec.ts
open playwright-report/  # HTML report after a run
```

Specs live in `/Users/phaedrus/Development/volume/e2e/`:

- `critical-flow.spec.ts` — quick-log, exercise CRUD, auth
- `coach-flows.spec.ts` — composer send, tool results, ModelMessage[] shape
- `error-scenarios.spec.ts` — paywall, network, auth-expiry edges

Fixtures: `auth-fixture.ts`, `auth.setup.ts`, `clerk-helpers.ts`,
`convex-helpers.ts`, `coach-helpers.ts`, `env.ts`, `global-setup.ts`.
Config: `playwright.config.ts`. Reuse `clerk-helpers.ts` patterns for
any manual Clerk sign-in during exploratory runs.

## Manual Lane: `/volume-manual-qa`

Invoke via `Skill(volume-manual-qa)` or `/volume-manual-qa`. Covers:

- `/api/health` → 200 JSON (Convex URL, Clerk, OpenRouter reachable)
- Clerk sign-in + `PaywallGate` behavior
- Today workspace set logging
- Coach composer send

Produces screenshots/GIFs as evidence. Run before PR land, after any
auth/subscription/coach diff, and whenever a user reports flow breakage.

## Golden Paths (cover when the domain is touched)

- Quick-log: `src/hooks/useQuickLogForm.ts` + `convex/sets.ts` — log a set from the dashboard
- Exercise CRUD + soft delete: `convex/exercises.ts` — create, delete, recreate same name (auto-restore per ADR-0002)
- Subscription gate: `PaywallGate` + `convex/users.ts` `getSubscriptionStatus` — trial vs expired UI (ADR-0006)
- Stripe webhook sync: `convex/http.ts` (ADR-0003) — forward via `stripe login` + `bun run dev:stripe`
- Coach tools: `src/lib/coach/tools/*` — `exerciseNotFoundResult` helper, `close_matches` flow, AI SDK v6 `ModelMessage[]` shape
- AI reports: `convex/analytics.ts` (OpenRouter portfolio, ADR-0008)
- History view with `includeDeleted: true`

## Quick One-Off QA

1. `bun run dev` — confirm http://localhost:3000 loads
2. Sign in via Clerk test account (mirror `e2e/clerk-helpers.ts`)
3. Exercise the affected route end-to-end; try one off-path edge
4. In parallel: `curl -s http://localhost:3000/api/health | jq` → expect `{ ok: true, ... }`
5. Tail `bunx convex logs` while clicking through; check Sentry dashboard for new issues in this session
6. Capture evidence to `walkthrough/<slug>/` or `/tmp/volume-qa-<date>/`
7. Classify: P0 (blocks ship), P1 (fix before merge), P2 (log to `backlog.d/`)

Prod variant: swap base URL to `https://volume.fitness` and curl
`https://volume.fitness/api/health | jq`.

## Design-Aware Invariants

Flag on inspection, not just functional failure:

- No single-side border on rounded cards (background tint or full low-opacity border instead)
- No emojis in UI — lucide-react SVGs only
- Wordmark not clipped by notch — `env(safe-area-inset-top)` respected
- Light, dark, AND system themes all render correctly
- Accent color only on data numbers, trend peaks, totals — never decorative

## Bug Report Output

Single markdown with: repro steps, expected, actual, env (local vs prod,
`bun --version`, branch SHA), evidence path, suspected file(s).

Prod incidents → `INCIDENT-<UTC-timestamp>.md` at repo root (see
`INCIDENT-20260307T002835Z.md` for the pattern) and link the Sentry event.
Follow-up tickets → `backlog.d/<next-id>-<slug>.md`.

## Escalation

- Reproduces with a clear domain → `/diagnose`
- UI-only regression → `/code-review` with `a11y-critic` on the bench
- Flake/intermittent → open issue, rerun `gh pr checks`, do NOT mark green until two consecutive stable passes

## Gotchas

- **"Tests pass" is not QA.** `bun run test` and `bun run test:e2e` green still leaves paywall state, Stripe sync, and coach `ModelMessage[]` continuity unverified.
- **Stripe TypeScript types lie.** Docs > types for mode-dependent params — verify webhook payloads live via `stripe listen`, not via compile success.
- **Convex can't import `@/lib/logger`.** When reading server-side output during QA, expect `console.warn`/`console.error` in `bunx convex logs`, not structured JSON.
- **Do not suppress `assistantText` when reproducing coach bugs.** It is the model's memory across turns — dropping it hides the real defect.
