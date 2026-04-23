# Volume — Repo Brief

Single source of truth for "what is this repo" — every installed skill anchors
to this file. Overwritten by `/tailor` each run.

_Installed: 2026-04-20 · Tailor run: adoption (pre-existing tailoring preserved, markers added)_

## Vision & Purpose

Volume is a workout tracker: log sets fast, see what's working. The thesis is
speed-of-capture + signal-on-exit. A lifter opens the app, logs a set in under
five seconds, and on the way out gets something useful — PRs, streaks, trends,
or a coach turn that remembers their training history.

Audience: serious-but-not-professional lifters who already track. The bar is
"faster than a spreadsheet, smarter than a note." Not a social product. Not a
programming app. A measurement instrument with opinions.

## Stack & Boundaries

| Layer                  | Stack                                | Owns                                                                  |
| ---------------------- | ------------------------------------ | --------------------------------------------------------------------- |
| `src/app/`             | Next.js 16 App Router + React 19     | Routes, layouts, pages — no business logic                            |
| `src/components/`      | Tailwind 3 + shadcn/Radix            | UI primitives + composed views — no persistence, no direct fetch      |
| `src/hooks/`           | React                                | Derived state, form logic — no side effects beyond what's wrapped     |
| `src/lib/`             | Node/browser                         | Pure utilities — dates, math, analytics, logger, architecture-checker |
| `convex/`              | Convex runtime                       | ALL data mutations, auth checks, subscription state                   |
| `packages/canary-sdk/` | Workspace lib                        | `@canary-obs/sdk` — custom observability SDK                          |
| `e2e/`                 | Playwright                           | End-to-end specs, Clerk/Convex fixtures                               |
| `dagger/`              | Dagger TS SDK                        | Local-equals-remote CI pipeline                                       |
| External               | Clerk · Stripe · OpenRouter · Canary | Auth · payments · AI via AI SDK v6 · observability                    |

Package manager is **bun 1.3.9**. Workspaces: `packages/*`. Lockfile: `bun.lock`.
No `pnpm`, `npm install`, or `yarn` — if a skill reaches for those, it's wrong.

## Load-Bearing Gate

**`dagger call check --source .` IS the gate.** Everything else — Lefthook
hooks, GitHub Actions `ci.yml`, `bun run quality:full` — is a component of or
shortcut to that same pipeline. Skills that talk about gates cite this verbatim.

The three enforcement layers:

1. **Lefthook hooks** (`.lefthook.yml`) — local, pre-commit + pre-push:
   trufflehog secret scan, prettier, eslint, typecheck, `validate-lefthook-config`,
   convex-warning on commit; `bun run test:coverage`, `bun run security:audit`,
   `bun run architecture:check`, `bun run build` (or `analyze` on master),
   `./scripts/verify-env.sh --prod-only --quiet` (master only) on push.
2. **Dagger pipeline** (`dagger/src/`, `dagger.json`) — canonical pipeline.
   Runs `dagger call check --source .` identically locally and remote.
3. **GitHub Actions** (`.github/workflows/ci.yml` + siblings) — remote
   thin wrapper: checkout the tested SHA → `dagger call check --source=.` via
   `dagger/dagger-for-github` → publish the merge-gate status. E2E,
   trufflehog, release-please, Claude bot, PR size labeler run in sibling
   workflows.

Emergency bypass: `SKIP_QUALITY_GATES=1 git push`. Always documented in the
PR/release notes. Never silent.

## Invariants (hard rules — never relax)

### Convex

- Every mutation/query: `const identity = await ctx.auth.getUserIdentity()`;
  throw on null; then ownership check (`row.userId === identity.subject`).
- Exercises **soft-delete** via `deletedAt`. Same-name create auto-restores
  (ADR-0002). Never hard-delete. History queries pass `includeDeleted: true`.
- Use `@/lib/...` alias — **never** relative imports from `convex/`.
- **Never** import `@/lib/logger` inside `convex/` (Convex can't load Next.js
  modules). Use `console.warn` / `console.error`.
- `v.union` validates pre-handler — do not re-validate inside.
- Fake timers banned in convex-test — use time-window assertions.

### AI / Coach

- Conversation history uses `ModelMessage[]` from `'ai'` (AI SDK v6). Never
  flatten to `{role, content}`.
- After every turn, append `response.messages` from `streamText` — tool-call +
  tool-result parts are the model's memory.
- Coach tool errors use `exerciseNotFoundResult()` from
  `src/lib/coach/tools/helpers.ts` — no inline error blocks.
- Coach prompt handles `close_matches` — do NOT call `get_exercise_library`
  to disambiguate.

### UI

- No single-side border (`border-l-4`, `border-t-*`) on rounded cards — use
  background tint or leading icon/dot.
- No emojis in UI — `lucide-react` SVGs or `@radix-ui/react-icons` only.
- Wordmark respects `env(safe-area-inset-top)`.
- Theme parity: light, dark, **and** system — always all three.
- Accent color only on data numbers, peaks, totals, 1–2 hero keywords. Never
  decorative.
- Server-only env never read in `.client` files — `NEXT_PUBLIC_*` and
  `NODE_ENV` only client-side.

### Testing

- Vitest tests colocate with source (`foo.ts` + `foo.test.ts`). Convex tests
  live inside `convex/`.
- Coverage thresholds must stay in sync between `vitest.config.ts` and
  `scripts/verify-coverage.ts` — `scripts/validate-lefthook-config.ts`
  enforces this pre-commit.

### Errors

- No empty `catch {}` blocks. `log.warn(msg, ctx)` from `@/lib/logger`
  (Next/API routes) or `reportError` (unexpected). In Convex,
  `console.warn` / `console.error`.

### Stripe

- Stripe **docs** outrank TypeScript types for mode-dependent params — types
  lie about some shapes.
- Webhook signature verification lives in `convex/http.ts` (ADR-0003). Never
  disable. Rotating `STRIPE_WEBHOOK_SECRET` touches Vercel env AND
  `bunx convex env set` on prod.

### Commits & Branching

- Conventional Commits enforced by commitlint (`feat`, `fix`, `docs`, `style`,
  `refactor`, `perf`, `test`, `chore`).
- Never `git push --no-verify`. Never `--amend` after a pre-commit hook
  failure — the commit didn't happen; amend would clobber the previous one.
- Branches: `feat/<NNN>-<slug>` / `fix/<NNN>-<slug>` (NNN from `backlog.d/`).
  Never commit on master.
- PR merge: squash-only (release-please sequences tags).
- Prod Convex deployment: `prod:whimsical-marten-631`.

## Known Debts

Active issues as of 2026-04-20:

- `backlog.d/004-add-repository-license.md` — license not yet filed.
- `backlog.d/010-evaluate-byok-open-source-api-first-pivot.md` — BYOK / API-first pivot evaluation.
- `backlog.d/011-017-*.md` — coach UX, funnel, env-parity, canonical quick-views; filed 2026-04-20 grooming cycle.
- `backlog.d/_done/` — 002, 003, 005, 006, 007, 008, 009 shipped.

Hot files / recurring failure modes:

- `lib/analytics.ts`, `convex/crons.ts` — flagged shallow modules (ARCHITECTURE.md). Consolidate before expanding.
- `src/components/ui/*` — intentionally shallow shadcn wrappers; don't refactor.

Incident ledger (traces live at repo root; postmortems land under `docs/postmortems/`):

- `INCIDENT-20260307T002835Z.md`
- `INCIDENT-20260311T201508Z.md`
- `INCIDENT-20260314T170559Z.md`
- `INCIDENT-20260328T002018Z.md`
- `docs/postmortems/2026-01-16-stripe-env-vars.md` — env-drift class postmortem.

ADRs (`docs/adr/`): ADR-0001 rate limits · ADR-0002 soft-delete · ADR-0003 Stripe
webhook in `convex/http.ts` · ADR-0004 AI report versioning · ADR-0005 platform
stats precompute · ADR-0006 subscription state machine · ADR-0007 action vs
mutation for exercise creation · ADR-0008 OpenRouter model portfolio.

## Terminology

- **Set** — one bout of an exercise: reps × weight at a point in time. The
  atomic unit of data.
- **Quick-log** — the fast capture flow. `useQuickLogForm` is its deep module.
- **Coach** — the AI-assistant surface (AI SDK v6 + OpenRouter). Has tools
  that read/write Convex under the user's auth.
- **Paywall / PaywallGate** — subscription-gated UI. `getSubscriptionStatus`
  query + `PaywallGate` component. Stripe webhooks keep state in sync
  (ADR-0006).
- **Soft delete** — exercises only. `deletedAt` timestamp. Same-name create
  auto-restores (ADR-0002).
- **Canary** — `packages/canary-sdk`, the custom observability SDK. Consumed
  by `src/instrumentation.ts` + `src/components/canary-client-reporter.tsx`.
- **Incident trace** — `INCIDENT-<UTC-timestamp>.md` at repo root during an
  active incident; moves to `docs/postmortems/` after resolution.
- **Backlog item** — `backlog.d/<NNN>-<slug>.md`. Archive to `backlog.d/_done/`
  when shipped.

## Session Signal

### Recurring user corrections

1. **Don't rationalize red CI as "informational."** All checks must pass. Bot
   review comments posted to issue-endpoint (#3 of three GitHub comment types)
   must be checked, not just review-thread endpoints.
2. **Don't mock the database in Convex tests.** Use `convex-test`; prefer
   time-window assertions over fake timers.
3. **Don't use `--amend` after a pre-commit hook failure.** The commit didn't
   happen; amend clobbers the previous one.
4. **Don't touch `.env` with a broken symlink pattern** (`~/.env` walk). See
   `memory/feedback_dagger_env_symlink.md` — touch `.env` in project root
   before `dagger init`.
5. **Don't use `|`-separated Lefthook excludes.** Excludes are YAML arrays.

### Validated patterns (user-ratified)

1. **Flush-block layout with zero gap and low radius** — "THE FLUSH BLOCK RULE"
   from memory; applies to all coach block types, not just metrics grid.
2. **Left-aligned hero with strong hierarchy** — landing page direction.
   Subheading at readable size. No wall-of-text headers.
3. **Conventional Commits + squash-only PR merge** — works with release-please.
   Don't propose per-commit merge schemes.
4. **ModelMessage[] conversation history** — don't reinvent; don't suppress
   `assistantText` for display (it's the model's memory). UI hides visually,
   state keeps the full text.
5. **Analyze entire log history**, not "14-day" — copy honesty. No fake user
   numbers in marketing copy.

## Harness State

- Shared skill root: `.agents/skills/`. `.claude/skills/` is a symlink bridge.
- Agent bench: `.claude/agents/` (installed from spellbook: ousterhout,
  carmack, grug, beck, critic, planner, builder, a11y-auditor, a11y-critic,
  a11y-fixer).
- 26 local skills in the shared root. 25 are marked `installed-by: tailor`,
  plus `/ship` synced from spellbook and tightened to own the final quality
  triad on 2026-04-23. Category mix spans
  universal / workflow / domain-invented (`volume-manual-qa`). Added
  `/harness` and `/agent-readiness` during the 2026-04-20 migration pass.
- Per-harness settings: `.claude/settings.local.json` (existing, preserved),
  `.codex/config.toml` (new), `.pi/settings.json` (existing).
