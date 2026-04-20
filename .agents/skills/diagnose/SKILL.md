---
name: diagnose
description: |
  Investigate, audit, triage, and fix. Systematic debugging, incident lifecycle,
  domain auditing, and issue logging. Four-phase protocol: root cause → pattern
  analysis → hypothesis test → fix.
  Use for: any bug, test failure, production incident, error spikes, audit,
  triage, postmortem, "diagnose", "why is this broken", "debug this",
  "production down", "is production ok", "audit stripe", "log issues".
  Trigger: /diagnose.
argument-hint: <symptoms or domain> e.g. "error in auth" or "audit stripe"
---

# /diagnose

Find root cause in Volume. Fix it. Prove it works.

## Execution Stance

Executive orchestrator: keep hypothesis ranking, root-cause proof, and fix
selection on the lead model. Delegate bounded evidence gathering and
implementation to focused subagents. Run parallel hypothesis probes when
multiple plausible causes exist.

## Routing

| Intent                                                             | Sub-capability                           |
| ------------------------------------------------------------------ | ---------------------------------------- |
| Debug a bug, test failure, unexpected behavior                     | This file (below)                        |
| Flaky test investigation                                           | `references/flaky-test-investigation.md` |
| Incident lifecycle: triage, investigate, postmortem                | `references/triage.md`                   |
| Domain audit: "audit stripe", "audit coach", "audit observability" | `references/audit.md`                    |
| Audit then fix highest priority issue                              | `references/fix.md`                      |
| Create GitHub issues from audit findings                           | `references/log-issues.md`               |

Route: Volume domain (stripe, coach, convex-auth, observability, rate-limits)
→ `references/audit.md`. "triage"/"incident"/"postmortem"/"production down" →
`references/triage.md`. "flaky"/"flake"/"intermittent" →
`references/flaky-test-investigation.md`. "fix" → `references/fix.md`.
"log issues" → `references/log-issues.md`. Else continue below.

**The user's symptoms:** $ARGUMENTS

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## Rule #1: Config Before Code

External service issues in Volume (Clerk / Stripe / Convex / OpenRouter) are
usually config, not code. Check in order:

1. **Env vars present?** `./scripts/verify-env.sh --prod-only` — compares
   Vercel with `bunx convex env list` for both deployments.
2. **Env vars valid?** No whitespace. Webhook secrets match the Stripe
   dashboard endpoint. `CLERK_JWT_ISSUER_DOMAIN` matches the Clerk instance.
3. **Health reachable?** `curl -s https://volume.fitness/api/health | jq` —
   surfaces `clerk`, `convex`, `stripe`, `openrouter` status.
4. **Then** examine code. Server-only env reads must never appear in `.client`
   files; `NEXT_PUBLIC_*` only in the browser.

## Sub-Agent Patterns

### Quick investigation (default)

Spawn a single **Explore** subagent against the relevant Volume domain
(`convex/`, `src/app/api/`, `src/lib/coach/`, `packages/canary-sdk/`) to
reproduce via `bun run dev` or Vitest, trace data flow, and report root
cause + evidence + proposed fix. It does NOT implement. You decide if
root cause is proven, then dispatch a **builder**.

### Multi-Hypothesis Mode

When >2 plausible causes span subsystems (Stripe webhook + Convex auth +
Clerk JWT drift), spawn parallel **Explore** subagents — one per
hypothesis tracing one subsystem (`convex/http.ts`, `convex/users.ts`,
`src/middleware.ts`). Synthesize into consensus, then dispatch a **builder**.

Use when: ambiguous stack trace, multiple services, flaky failures.
Don't use when: obvious single cause, config issue, simple regression.

### What you keep vs what you delegate

| You (lead)                           | Sub-agents (investigators)                        |
| ------------------------------------ | ------------------------------------------------- |
| Ranking hypotheses                   | Tracing one subsystem                             |
| Declaring root cause proven          | Comparing working vs broken                       |
| Choosing the fix                     | Gathering `bunx convex logs` + Sentry breadcrumbs |
| Deciding when evidence is sufficient | Running `bun run test:affected`                   |

## Instrumented Reproduction Loop

When you can't reproduce yourself (auth-gated Clerk flows, mobile safe-area,
Stripe checkout, coach streaming timing):

```
INSTRUMENT → USER REPRODUCES → READ LOGS → REFINE → REPEAT
```

1. **Hypothesize** — 2-3 candidate causes.
2. **Instrument** — in Next routes, `createChildLogger({ route: '/api/coach' })`
   then `log.debug(...)` from `@/lib/logger`. In `convex/`, use `console.warn`
   (can't import Next modules). Tag each line: `[H1] subscription stale: ${status}`.
   Shared sink: `LOG_FILE="${HOME}/Desktop/volume-debug-$(date +%s).log"`.
3. **Hand off** — "Run `bun run dev`, reproduce, then say done."
4. **Analyze** — supported → narrow; disproved → strip instrumentation;
   insufficient → add one layer deeper.
5. **Iterate** — max 3 rounds; else escalate to Multi-Hypothesis Mode.
6. **Clean up** — strip all instrumentation before the fix. Empty `catch {}`
   must still `log.warn(msg, ctx)` or `reportError` — never silently swallow.

## The Four Phases

### Phase 1: Root Cause Investigation

BEFORE attempting ANY fix:

1. **Read error messages carefully** — full stack traces, Sentry event IDs,
   Convex function names, line numbers.
2. **Reproduce consistently** — exact steps via `bun run dev`, targeted
   Vitest (`bunx vitest run path/to/test.test.ts`), or a Playwright spec.
3. **Check recent changes** — `git log --oneline --since="14 days ago" -- <path>`;
   scan `backlog.d/` and recent ADR additions under `docs/adr/`.
4. **Gather evidence across components** — Next route → Convex mutation →
   external service. Log at each boundary once; identify the failing layer.
   Prod logs: `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs --history 100`;
   Vercel: `vercel logs <deployment>` / `vercel inspect <deployment>`.
5. **Trace data flow** — bad value origin traced backward to source. For
   coach issues, inspect `ModelMessage[]` conversation shape — flattened
   `{role, content}` pairs break multi-turn tool context.

### Phase 2: Pattern Analysis

1. **Find working examples** — similar mutations/queries in `convex/`, other
   coach tools in `src/lib/coach/tools/`.
2. **Compare completely** — read reference implementations fully. Coach tool
   patterns: `docs/patterns/coach-tools.md`.
3. **Identify all differences** — auth check? ownership check? `includeDeleted`
   on history queries? soft-delete handling per ADR-0002?
4. **Scope count** — is this a class of bug or a one-off?
   `rg -n "<symbol>" src/ convex/ packages/`. If many hits, widen scope and
   hand to `/refactor` for a concerted cleanup.

### Phase 3: Hypothesis and Testing

Scientific method. One experiment at a time. No stacking.

1. **Form single hypothesis** — "I think X causes Y because Z" (write it down).
2. **Design experiment** — smallest possible change, one variable. Vitest
   reproducer beside source, or Playwright spec under `e2e/`. Justify
   what the experiment will tell you.
3. **Run experiment** — `bun run test:affected` or `bunx vitest run <path>`;
   or hit `/api/health` and `bunx convex logs` live.
4. **Evaluate**:
   - **Disproved** → eliminate, form NEW hypothesis. Progress.
   - **Supported** → design next experiment; explain the full causal chain.
   - **Ambiguous** → experiment too broad. Narrow and rerun.
5. **Repeat** until root cause proven.

"Just try X" is a red flag. If you can't explain what the experiment will
teach you, you don't understand the problem yet.

### Phase 4: Implementation

1. **Write failing test first** — Vitest next to source, or Playwright spec
   under `e2e/`. Reproduce the bug before any fix.
2. **Verify test fails for the right reason** — not a syntax/import error.
3. **Implement single fix** — address root cause. ONE change. If schema
   change: update `convex/schema.ts`, run `bunx convex dev` locally, plan
   prod migration (ADR-0002 / ADR-0006, never hard-delete).
4. **Verify** — `bun run quality:full` (typecheck, lint, tests, build);
   `bun run architecture:check` for boundary regressions.
5. **Env changes touch both sides** — update Vercel _and_
   `bunx convex env set <KEY> "..."` for dev and prod deployments.
6. **If 3+ fixes failed** — STOP. Question the architecture. See
   `references/systematic-debugging.md`.

## Volume Bug Classes & Canonical Root-Cause Paths

| Class                   | Primary suspects                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth / ownership        | Missing `ctx.auth.getUserIdentity()` or `row.userId !== identity.subject` check in `convex/*.ts`                                                 |
| Stripe webhook          | `convex/http.ts` signature verification; `STRIPE_WEBHOOK_SECRET` drift; ADR-0003                                                                 |
| Subscription regression | `convex/users.ts:getSubscriptionStatus`; state machine per ADR-0006; `PaywallGate` mount path                                                    |
| Coach tool misfire      | `src/lib/coach/tools/**`; missing `exerciseNotFoundResult()` helper; conversation must be `ModelMessage[]`, append `response.messages` each turn |
| OpenRouter outage       | Model swap per ADR-0008; `OPENROUTER_API_KEY` / `OPENROUTER_COACH_MODEL_OVERRIDE`; `/api/health`                                                 |
| Schema drift            | Regenerate `convex/_generated/api.d.ts` with `bunx convex dev`; `includeDeleted: true` for history                                               |
| Rate limit trip         | `rateLimits` table + `assertRateLimit` helper (ADR-0001); window vs counter                                                                      |
| Architecture regression | `bun run architecture:check`; no relative imports in `convex/`, no `@/lib/logger` inside `convex/`                                               |
| Test flake              | `bun run test:affected` twice; inspect `vitest.config.ts` thresholds; `scripts/verify-coverage.ts`                                               |
| Client env leak         | `NEXT_PUBLIC_*` in `.client` only; server-only env never in browser bundle                                                                       |
| Empty catch block       | `rg "catch\s*\(\s*\)?\s*\{\s*\}" src/ convex/` — all must `log.warn` or `reportError`                                                            |

## Root Cause Discipline

For each hypothesis, categorize:

- **ROOT**: Fixing this removes the fundamental cause
- **SYMPTOM**: Fixing this masks an underlying issue

Post-fix question: "If we revert in 6 months, does the problem return?"

## Demand Observable Proof

Before declaring "fixed", show:

- `/api/health` response transitioning to healthy
- `bunx convex logs` line proving the new path executed
- Sentry event count dropping, or canary SDK telemetry confirming
- Database state via Convex dashboard or a read query

Mark as **UNVERIFIED** until observables confirm.

## Classification

| Type                | Signals                            | Approach                                     |
| ------------------- | ---------------------------------- | -------------------------------------------- |
| Test failure        | Vitest assertion, Playwright flake | Read test, trace expectation                 |
| Runtime error       | Sentry event, `convex logs` stack  | Stack trace → source → state                 |
| Type error          | `bun run typecheck` fails          | Read error, check `convex/_generated/` drift |
| Build failure       | `bun run build` fails              | Check deps, Next config, env surface         |
| Behavior mismatch   | "Does Y, should do X"              | Trace Next route → Convex → external         |
| Performance         | Slow coach stream, timeout         | Timing instrumentation via `log.debug`       |
| Production incident | Sentry alert, health endpoint red  | Create `INCIDENT-<UTC>.md`, timeline         |

## Incident Lifecycle

- **New**: `INCIDENT-<UTC-timestamp>.md` at repo root — summary, timeline (UTC),
  impact, hypothesis, evidence, checkpoints. Precedent: `INCIDENT-20260307T002835Z.md`,
  `-20260311T201508Z.md`, `-20260314T170559Z.md`, `-20260328T002018Z.md`.
- **Ongoing**: update live with commands tried and outputs. Never
  `git reset --hard` during an incident — evidence is load-bearing.
- **Resolved**: move learnings to `docs/postmortems/<YYYY-MM-DD-<slug>.md`
  (see `2026-01-16-stripe-env-vars.md`); link from the INCIDENT file.
  Observability gaps → follow-up in `backlog.d/` referencing
  `005-harden-runtime-observability-paths.md`.

## Audit Mode (Broad Domain Check)

- Pick a domain: **stripe**, **coach**, **convex-auth**, **observability**,
  **rate-limits**.
- Systematic pass with `rg` + targeted reads. `audit stripe`: trace every
  handler in `convex/http.ts`, verify signatures, cross-check
  `STRIPE_WEBHOOK_SECRET` across Stripe dashboard, Vercel, and
  `bunx convex env list` (both deployments).
- Produce findings + severity + follow-up items under `backlog.d/`.

## Red Flags — STOP and Return to Phase 1

- "Quick fix for now, investigate later"
- "Just try changing X and see"
- Multiple simultaneous changes
- Proposing solutions before tracing data flow
- Two consecutive tool/test failures — re-read the error, don't retry blindly
- Three edits to the same file — stop, re-read, plan all remaining changes, make ONE edit

## Toolkit

- **Health**: `curl -s https://volume.fitness/api/health | jq`; local `localhost:3000/api/health`
- **Convex logs**: `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex logs --history 100`
- **Vercel**: `vercel logs <deployment>`, `vercel inspect <deployment>`
- **Sentry** (`@sentry/nextjs`): `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- **Canary SDK**: `packages/canary-sdk/`; `./scripts/deploy-observability.sh`
- **Git**: `git bisect`, `git blame`, `git log --oneline -10`
- **Sub-agents**: parallel hypothesis investigation (above)
- **/research thinktank**: multi-model hypothesis validation

## Hand-offs

- Fix applied with tests → `/code-review` → `/settle`
- Broad scope / codebase-wide cleanup → `/refactor`
- Scope too fuzzy for a single fix → `/groom` (file a `backlog.d/` item)

## Output

- **Root cause**: what's actually wrong
- **Fix**: how it was resolved
- **Verification**: observable proof — `/api/health`, `bunx convex logs`, Sentry, test output

## Gotchas

- **Assuming code bug on service failure.** `./scripts/verify-env.sh --prod-only`
  and `/api/health` before reading code.
- **Symptom vs root cause.** "Webhook 401s" is symptom. "`STRIPE_WEBHOOK_SECRET`
  in Convex prod drifted from Stripe dashboard" is root cause.
- **Skipping reproduction.** No `bun run dev` or Vitest repro → gather more data.
- **Trusting Stripe TS types fully.** Stripe docs > types for mode-dependent params.
- **Re-validating after `v.union` in Convex.** Convex validates before the handler.
- **Using `@/lib/logger` inside `convex/`.** Can't import Next modules — `console.warn`.
- **Destroying evidence.** Never delete `INCIDENT-*.md` once opened; commit it.
- **Stacking changes.** One variable per experiment. Config is almost always the answer.
