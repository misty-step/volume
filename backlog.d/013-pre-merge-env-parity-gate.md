# 013 Pre-merge env parity gate

**Status:** open
**Priority:** high
**Created:** 2026-04-20
**Source:** groom session (explore; convergence from Archaeologist + Velocity); incident class from 2026-01-16 postmortem

## Context

Four production incidents in the last 60 days — `INCIDENT-20260307T002835Z.md`, `-20260311T201508Z`, `-20260314T170559Z`, `-20260328T002018Z` — all converge on a single root-cause class: environment-variable drift between Vercel, Convex, and the code's expected surface. Missing `OPENROUTER_API_KEY` in Vercel, missing `NEXT_PUBLIC_CONVEX_URL` in the client bundle, `NEXT_PUBLIC_CANARY_*` set but initialisation never fired. `docs/postmortems/2026-01-16-stripe-env-vars.md` identified this pattern 60+ days earlier; the preventive work (items **005**, **006**, **007**) shipped in the last week but still only covers **pre-push on master** via Lefthook (`.lefthook.yml` pre-push `verify-prod-env`).

The remaining gap is **pre-merge**. Today a PR can land with env surface drift and only blow up on the master pre-push check after merge, or worse — during the first prod deploy. The Archaeologist also surfaced a related doc drift: `project.md:50` still says "Observability: **Helicone** via OpenRouter headers" while the live code uses Canary SDK (`packages/canary-sdk/`, `src/lib/canary.ts`, `src/instrumentation.ts`). Operators reading the runbook during an incident were paging Helicone context for a Canary failure.

`scripts/verify-env.sh` already exists, knows the expected surface, supports `--prod-only` and `--quiet`, and is invoked in pre-push. Promoting it to a required GitHub Actions job on every PR closes the loop. This is a one-day fix that would have prevented all four recent incidents and costs nothing at runtime.

## Outcome

A PR touching any code that reads `process.env.*` or `bunx convex env` fails its merge-gate if Vercel or Convex prod env vars are incomplete relative to `scripts/verify-env.sh`'s contract; `project.md:50` observability description matches the live code.

## Shape cues

- **Files likely touched:**
  - `.github/workflows/ci.yml` — add `env-parity` job as a peer of `lint`, `typecheck`, `architecture`, etc.; `merge-gate` job depends on it
  - `scripts/verify-env.sh` — minor flag addition if needed (e.g., `--ci-report` outputs a parseable summary)
  - `scripts/print-openrouter-policy.ts` — already consumed by verify-env.sh; no change anticipated but audit for CI compatibility
  - `project.md:50` — replace "Helicone via OpenRouter headers" with "Canary SDK — see `packages/canary-sdk/` and `src/instrumentation.ts`"
  - `CLAUDE.md` — add env-parity gate to the quality-gates table (pre-merge)
  - `.lefthook.yml` — cross-reference so pre-push and pre-merge remain the same contract (no drift between the two layers)
  - Optional: new `scripts/diff-env-surface.ts` that compares `rg "process\.env\." src/ convex/ packages/` output against verify-env.sh's declared surface, failing CI if code reads a var verify-env.sh doesn't know about

- **Gate impact:**
  - New required check on every PR: `env-parity`
  - `merge-gate` in `.github/workflows/ci.yml` already collects upstream job results — add `env-parity` to its `needs:` list
  - Pre-push Lefthook behaviour unchanged (stays as belt-and-braces for direct master pushes)
  - Running locally: operator uses existing `./scripts/verify-env.sh --prod-only` — no new command to learn

- **CI-side secrets required** for the `env-parity` job to actually query the live platforms:
  - `VERCEL_TOKEN` (read-only scope on the volume project)
  - `CONVEX_DEPLOY_KEY` OR an equivalent read-only prod token for `bunx convex env list`
  - Without these, the job degrades to a static check (verify code-declared surface matches `scripts/verify-env.sh` expectations) — still valuable; flag clearly.

- **Related ADR / docs:**
  - `docs/postmortems/2026-01-16-stripe-env-vars.md` (root-cause analysis for this incident class)
  - ADR-0003 (Stripe webhook — one of the recurring drift surfaces)
  - ADR-0008 (OpenRouter portfolio — another recurring drift surface)

- **Related incidents (should resolve the class):**
  - `INCIDENT-20260307T002835Z.md`
  - `INCIDENT-20260311T201508Z.md`
  - `INCIDENT-20260314T170559Z.md`
  - `INCIDENT-20260328T002018Z.md`

## Not in scope

- Automating env var _sync_ across Vercel and Convex — gate detects drift, does not fix it. Self-heal is a separate item.
- Rotating secrets — operational; outside gate scope.
- Pre-deploy `vercel deploy --dry-run` — narrower, covers only Vercel side; the gate must cover both platforms.
- Changing the verify-env.sh contract itself (it's stable — this item extends _where_ it runs, not _what_ it checks).
- Sentry/Canary dashboard alert rules — observability alerting is item **005** territory.

## Acceptance

- [ ] New `env-parity` job in `.github/workflows/ci.yml`, wired into `merge-gate` as a required upstream
- [ ] Job runs `scripts/verify-env.sh --prod-only --quiet` against the prod Convex deployment and Vercel project; exits non-zero on any missing required var
- [ ] Fallback mode documented: if CI secrets unavailable, the job runs a static surface diff (code-declared `process.env.*` ∩ verify-env.sh contract) and still fails on drift
- [ ] `project.md:50` observability line reflects Canary SDK, not Helicone
- [ ] `CLAUDE.md` "Quality Gates" section lists the new pre-merge gate
- [ ] One historical incident reproduced: create a test PR that removes an expected env var from the contract and confirm the gate fails
- [ ] Gate runtime < 60s p95 so it doesn't bottleneck PR velocity
- [ ] `bun run quality:full` green; new job passes on master head SHA
