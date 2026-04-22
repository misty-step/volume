# AGENTS

Volume is a workout tracker: log sets fast, see what's working. This file is the router — it points agents at what matters. Prose and philosophy live in `~/.claude/CLAUDE.md`; Volume-specific runbooks live in `CLAUDE.md`; this file names the rails.

Subagents: before dispatch, read `.spellbook/repo-brief.md` — the shared spine (vision, stack, invariants, debts, terminology, session signal) every installed skill anchors to.

## Stack & Boundaries

| Layer                  | Owns                                                                                            | Runtime                           | Constraints                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| `src/app/`             | Routes, layouts, pages (App Router)                                                             | Next.js 16 + React 19             | No business logic; data via Convex hooks              |
| `src/components/`      | UI primitives + composed views                                                                  | React + Tailwind 3 + shadcn/Radix | No persistence; no direct fetch                       |
| `src/hooks/`           | Derived state, form logic                                                                       | React                             | No side effects beyond what the hook wraps            |
| `src/lib/`             | Pure utilities (dates, math, analytics, logger, architecture-checker)                           | Node/browser                      | No Convex/Clerk imports except as typed utilities     |
| `convex/`              | ALL data mutations, auth checks, subscription state                                             | Convex runtime                    | No Next.js imports; `@/lib/...` alias only            |
| `packages/canary-sdk/` | Custom observability SDK (`@canary-obs/sdk`)                                                    | Workspace lib                     | Consumed by `src/instrumentation.ts` + server configs |
| `e2e/`                 | Playwright specs, Clerk/Convex fixtures                                                         | Node                              | Runs against `bun run dev`                            |
| `dagger/`              | Local-equals-remote CI pipeline                                                                 | Dagger TS SDK                     | `dagger call check --source .`                        |
| External               | Clerk (auth), Stripe (payments), OpenRouter (AI via AI SDK v6), Sentry + Canary (observability) | —                                 | See env-var contract below                            |

Package manager: **bun 1.3.9**. Workspaces: `packages/*`. Lockfile: `bun.lock`.

## Ground Truth (read these; don't guess from training data)

| File                              | What it defines                                                                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `convex/schema.ts`                | Data shapes, tables, indexes — single source of truth                                                                                                       |
| `convex/_generated/api.d.ts`      | Canonical Convex API signatures (run `bunx convex dev` to regenerate)                                                                                       |
| `src/lib/architecture-checker.ts` | Import boundaries + cycle rules (driven by `bun run architecture:check`)                                                                                    |
| `vitest.config.ts`                | Coverage thresholds: lines 52, branches 83, functions 73, statements 52; excludes                                                                           |
| `.lefthook.yml`                   | Local quality gates (pre-commit, commit-msg, pre-push, post-checkout)                                                                                       |
| `.github/workflows/ci.yml`        | Remote merge-gate thin wrapper: checkout → `dagger call check --source .` → merge-gate status                                                               |
| `dagger.json` + `dagger/src/`     | Canonical pipeline                                                                                                                                          |
| `docs/adr/ADR-0001..0008.md`      | Rate limits · soft delete · Stripe webhook · AI report versioning · platform stats · subscription state machine · action-vs-mutation · OpenRouter portfolio |
| `docs/patterns/coach-tools.md`    | Coach tool development pattern                                                                                                                              |
| `docs/api-contracts.md`           | Route contracts + runtime invariants                                                                                                                        |
| `scripts/verify-env.sh`           | Prod env-var contract                                                                                                                                       |

## Invariants (hard rules — never relax)

**Convex:**

- Every mutation/query: `const identity = await ctx.auth.getUserIdentity(); if (!identity) throw …`, then ownership check (`row.userId === identity.subject`) before any read/write.
- Exercises are **soft-deleted** via `deletedAt`. Same-name create auto-restores the soft-deleted row (ADR-0002). Never hard-delete.
- History/list queries on exercises pass `includeDeleted: true` when soft-deleted rows are relevant.
- Use `@/lib/...` alias — **never** relative imports from `convex/`.
- **Never** import `@/lib/logger` inside `convex/` — Convex can't load Next.js modules. Use `console.warn` / `console.error`.
- `v.union` validates args pre-handler — do not re-validate inside.
- Fake timers banned in Convex tests (convex-test) — use time-window assertions.

**AI / Coach:**

- Conversation history uses `ModelMessage[]` from `ai` (AI SDK v6). Never flatten to `{role, content}`.
- After every turn, append `response.messages` from `streamText` — tool-call + tool-result parts are the model's memory.
- Coach tool errors use `exerciseNotFoundResult()` from `src/lib/coach/tools/helpers.ts` — no inline error blocks.
- The coach prompt handles `close_matches` — do NOT call `get_exercise_library` to disambiguate.

**UI:**

- No single-side border (`border-l-4`, `border-t-*`, etc.) on rounded cards. Use background tint or a leading icon/dot.
- No emojis in UI — `lucide-react` SVGs or `@radix-ui/react-icons` only.
- Wordmark respects `env(safe-area-inset-top)` (notch/dynamic island).
- Theme parity required: light, dark, **and** system — all three.
- Accent color only on data numbers, peaks, totals, 1–2 hero keywords. Never decorative.
- Server-only env never read in `.client` files — `NEXT_PUBLIC_*` and `NODE_ENV` only client-side.

**Testing:**

- Vitest tests colocate with source (`foo.ts` + `foo.test.ts`). Convex tests live inside `convex/`.
- Coverage thresholds must stay in sync between `vitest.config.ts` and `scripts/verify-coverage.ts` — `scripts/validate-lefthook-config.ts` enforces this pre-commit.

**Errors:**

- No empty `catch {}` blocks. Use `log.warn(msg, ctx)` from `@/lib/logger` (Next/API routes) or `reportError` (unexpected). In Convex, `console.warn` / `console.error`.

**Stripe:**

- Stripe **docs** outrank TypeScript types for mode-dependent params — types lie about some shapes.
- Webhook signature verification lives in `convex/http.ts` (ADR-0003). Never disable. Rotating `STRIPE_WEBHOOK_SECRET` touches Vercel env AND `bunx convex env set` on prod.

**Commits:**

- Conventional Commits enforced by commitlint (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`).
- Never `git push --no-verify`. Never `--amend` after a pre-commit hook failure — the commit didn't happen; amend would clobber the previous one.

## Gate Contract

### Run locally

| Command                                            | What it does                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `bun run setup` / `setup:check`                    | Install + bootstrap `.env.local`; check validates tooling         |
| `bunx convex dev`                                  | Provision/sync personal Convex dev deployment, regenerate types   |
| `bun run dev`                                      | Next + Convex + Stripe forwarding concurrently                    |
| `bun run typecheck`                                | `tsc --noEmit`                                                    |
| `bun run lint` / `lint:fix`                        | eslint, `--max-warnings=0`                                        |
| `bun run architecture:check`                       | `tsx scripts/verify-architecture.ts` (boundaries + cycles)        |
| `bun run test` / `test:affected` / `test:coverage` | Vitest (jsdom, forks, maxForks 4)                                 |
| `bun run test:e2e`                                 | Playwright (specs in `e2e/`)                                      |
| `bun run security:audit` / `security:scan`         | `bun audit --audit-level=high` / trufflehog                       |
| `bun run build` / `analyze`                        | `next build` / `ANALYZE=true next build`                          |
| `bun run quality:full`                             | typecheck && lint && architecture:check && test:coverage && build |
| `dagger call check --source .`                     | Full local-equals-remote CI (Docker required)                     |

### Automated gates

| Layer                                              | Trigger                 | What runs                                                                                                                                                                                                           |
| -------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lefthook `pre-commit`                              | `git commit` (parallel) | trufflehog secret scan · prettier {staged} · eslint --fix {staged} · typecheck · `validate-lefthook-config` · convex-warning                                                                                        |
| Lefthook `commit-msg`                              | commit                  | commitlint (Conventional Commits)                                                                                                                                                                                   |
| Lefthook `pre-push`                                | `git push` (parallel)   | `NODE_ENV=test CI=true bun run test:coverage` · `bun run security:audit` · `bun run architecture:check` · `bun run build` (master: `bun run analyze`) · `./scripts/verify-env.sh --prod-only --quiet` (master only) |
| Lefthook `post-checkout`                           | branch switch           | Convex type regeneration reminder                                                                                                                                                                                   |
| GitHub Actions `ci.yml`                            | push/PR                 | Thin wrapper around `dagger call check --source .` that publishes the merge-gate commit status                                                                                                                      |
| GitHub Actions `e2e.yml`                           | PR                      | Playwright                                                                                                                                                                                                          |
| GitHub Actions `trufflehog.yml`                    | PR                      | Secret scan                                                                                                                                                                                                         |
| GitHub Actions `release-please.yml`                | master merge            | Release PR / tag / GitHub release                                                                                                                                                                                   |
| GitHub Actions `claude.yml`, `pr-size-labeler.yml` | PR                      | Review bot, size label                                                                                                                                                                                              |

**Emergency bypass:** `SKIP_QUALITY_GATES=1 git push`. Document in PR/release notes. Never silent.

### Env-var contract (verified by `./scripts/verify-env.sh`)

| Vercel (Next)                          | Convex (both deployments) |
| -------------------------------------- | ------------------------- |
| `STRIPE_SECRET_KEY`                    | `STRIPE_SECRET_KEY`       |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID`  | `STRIPE_WEBHOOK_SECRET`   |
| `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID`   | `CLERK_JWT_ISSUER_DOMAIN` |
| `NEXT_PUBLIC_CONVEX_URL`               | `OPENROUTER_API_KEY`      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`    |                           |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` |                           |
| `OPENROUTER_API_KEY`                   |                           |

Prod Convex deployment: `prod:whimsical-marten-631`.

## Known-Debt Map

| Pointer                                                                                                   | Debt                                                                    |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `backlog.d/004-add-repository-license.md`                                                                 | Repository license not yet filed                                        |
| `backlog.d/010-evaluate-byok-open-source-api-first-pivot.md`                                              | BYOK open-source pivot evaluation                                       |
| `backlog.d/011-017-*.md`                                                                                  | Coach UX + funnel + env-parity work filed 2026-04-20                    |
| `backlog.d/_done/`                                                                                        | Prior items already shipped (002, 003, 005, 006, 007, 008, 009)         |
| `INCIDENT-20260307T002835Z.md` · `-20260311T201508Z.md` · `-20260314T170559Z.md` · `-20260328T002018Z.md` | Prior incident traces at repo root                                      |
| `docs/postmortems/2026-01-16-stripe-env-vars.md`                                                          | Env-drift class postmortem                                              |
| `src/components/ui/*`                                                                                     | Intentionally shallow shadcn wrappers; don't refactor                   |
| `lib/analytics.ts`, `convex/crons.ts`                                                                     | Flagged shallow modules (ARCHITECTURE.md); consolidate before expanding |

## Harness Index

The tailored inner/outer loop. Invoke via slash trigger; each skill's SKILL.md body is Volume-specific.

### Problem diamond (before building)

| Skill                           | What it does here                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/office-hours`                 | Six forcing questions on a fuzzy idea before `/shape`                                          |
| `/groom`                        | Backlog grooming against `backlog.d/`; routes between `/shape`, `/office-hours`, `/ceo-review` |
| `/ceo-review`                   | Premise challenge + mandatory alternatives before committing to a spec                         |
| `/research` · `/model-research` | Web / multi-AI lookup; `/model-research` for OpenRouter portfolio decisions (ADR-0008)         |

### Solution diamond → inner loop

| Skill               | What it does here                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/shape`            | Produces a context packet: target files in `convex/`/`src/`, schema diff, gate impact, ADR refs               |
| `/implement`        | TDD on feature branch: Red (`*.test.ts` colocated) → Green (`bun run test:affected`) → Refactor               |
| `/code-review`      | Parallel bench: `ousterhout + carmack + grug + critic` (+ `beck` / `a11y-critic`); enforces Volume invariants |
| `/refactor`         | Branch diff simplification; on master, identifies highest-impact simplification                               |
| `/qa`               | Browser + exploratory QA router                                                                               |
| `/volume-manual-qa` | Tailored Volume regression: health, auth, paywall, today workspace, coach composer                            |
| `/a11y`             | WCAG 2.2 AA audit → fix → verify; stacked Radix/shadcn/Tailwind context                                       |
| `/ci`               | Audit/drive the three-layer gate (Lefthook + Dagger + GHA merge-gate)                                         |
| `/deliver`          | Composes shape → implement → {code-review + ci + refactor + qa}; ends clean                                   |

### Outer loop (merge → prod → watch → learn)

| Skill                   | What it does here                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/settle` (`/land`)     | GitHub mode: fixes CI/conflicts/reviews; three bot-comment endpoints; squash-merge policy                                      |
| `/yeet` (`/ship-local`) | Slices worktree into Conventional Commits; push; never master                                                                  |
| `/deploy`               | Dual-target: Vercel auto + `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex deploy -y`; verifies env; produces receipt |
| `/monitor`              | 10-min grace window over `/api/health`, Sentry, Canary, Convex logs, Vercel state                                              |
| `/diagnose`             | Four-phase (root cause → pattern → hypothesis → fix); opens `INCIDENT-<UTC>.md` at repo root                                   |
| `/flywheel`             | Drives backlog items through the full outer loop                                                                               |
| `/reflect`              | Session/cycle retro; codifies into hooks, skills, memory, backlog                                                              |

### Maintenance

| Skill              | What it does here                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/deps`            | Volume-specific bump ladder (typecheck → lint → architecture → test → e2e → build → audit → dagger); respects pinned overrides + patches |
| `/demo`            | Evidence artifacts via Claude-in-Chrome; upload via `gh release --draft`; `walkthrough/` as canonical evidence dir                       |
| `/harness`         | Meta-skill for the harness itself — create/eval/lint/sync/audit skills and agents; used when `/tailor` output needs tuning               |
| `/agent-readiness` | Parallel pillar audit (style, CI, tests, docs, env, code quality, observability, security) — scores + highest-impact fixes               |

### Reviewer agents (dispatched from `/code-review` and others)

Installed at `.claude/agents/` with `installed-by: tailor` markers:
`ousterhout` · `carmack` · `grug` · `beck` · `critic` · `planner` · `builder` · `a11y-auditor` · `a11y-fixer` · `a11y-critic`

Skills live at `.agents/skills/` (shared root); `.claude/skills/` symlinks to it. Cross-harness settings: `.claude/settings.local.json`, `.codex/config.toml`, `.pi/settings.json`.

## Anti-patterns (catch these before they ship)

- Convex mutation without auth/ownership check
- Relative import from `convex/` (must be `@/lib/...`)
- `@/lib/logger` imported inside `convex/` (Convex can't load Next.js modules)
- AI SDK conversation flattened to `{role, content}` or missing `response.messages` append
- Empty `catch {}` without `log.warn` / `reportError`
- Coverage thresholds drifting between `vitest.config.ts` and `scripts/verify-coverage.ts`
- Hard-deleting exercises; history view missing `includeDeleted: true`
- PaywallGate bypass on premium features
- Server-only env read in `.client` file
- Single-side border on rounded card; emoji in UI; wordmark without safe-area-inset-top
- Using `--amend` after a pre-commit hook failure (commit didn't happen)
- Deploying with uncommitted code; deploying without running `./scripts/verify-env.sh --prod-only`
- Assuming code bug on service failure before verifying env

## Conventions

- **Branch:** `feat/<NNN>-<slug>` or `fix/<NNN>-<slug>` (NNN from `backlog.d/`); never commit on master.
- **Commit message:** Conventional Commits, scope optional (`feat(coach): ...`), HEREDOC for multi-line bodies (see CLAUDE.md template).
- **PR merge:** squash-only (release-please sequences tags).
- **Incident:** create `INCIDENT-<UTC-timestamp>.md` at repo root; resolve → postmortem under `docs/postmortems/`.
- **ADR:** new load-bearing decisions → `docs/adr/ADR-NNNN-<slug>.md`.
