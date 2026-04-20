---
name: code-review
description: |
  Parallel multi-agent code review. Launch reviewer team, synthesize findings,
  auto-fix blocking issues, loop until clean.
  Use when: "review this", "code review", "is this ready to ship",
  "check this code", "review my changes".
  Trigger: /code-review, /review, /critique.
argument-hint: "[branch|diff|files]"
---

# /code-review

Multi-provider, multi-harness code review for Volume (Next.js 16 + Convex +
Clerk + Stripe + OpenRouter/AI SDK v6 on bun). You are the marshal — read
the diff, select reviewers, craft prompts, dispatch everything in parallel,
synthesize results, fix blockers, loop until clean.

## Marshal Protocol

1. **Read the diff.** `git diff master...HEAD` (Volume base is always `master`).
   Classify: what changed? — convex/ mutations, AI SDK tool handlers, UI
   (`src/app/**`, `src/components/**`), Stripe webhooks, schema, packages/canary-sdk, infra.
   Pull branch-local context reviewers will need: `convex/schema.ts`,
   `convex/_generated/api.d.ts`, `src/lib/architecture-checker.ts`,
   `vitest.config.ts`, and relevant ADRs under `docs/adr/ADR-0001..0008`.
   Surface any active incident context (`INCIDENT-*.md` at repo root or
   `docs/postmortems/`).

2. **Select internal reviewers.** Default bench:
   `ousterhout + carmack + grug + critic`. Add `beck` when tests are
   load-bearing; add `a11y-critic` when UI changes land in `src/app/**`
   or `src/components/**`. Spawn ad-hoc Explore subagents for specific
   concerns (Convex auth/ownership, AI SDK `ModelMessage[]` shape, Stripe
   webhook invariants, `packages/canary-sdk` contract changes). All agents
   live at `/Users/phaedrus/Development/volume/.agents/` and are invoked
   via `subagent_type`. Cap the bench at 5; critic is pinned.

3. **Dispatch in parallel (one message, independent concerns):**

   | Tier             | What                                          | How                          |
   | ---------------- | --------------------------------------------- | ---------------------------- |
   | Internal bench   | 3-5 Explore sub-agents with philosophy lenses | Agent tool, tailored prompts |
   | Thinktank review | Cross-provider model diversity                | `thinktank review` CLI       |
   | Cross-harness    | Codex + Gemini CLIs (skip whichever you are)  | External harness review      |

   Thinktank-specific rule: wait for the process to exit, or for
   `trace/summary.json` to reach `complete` or `degraded` with a
   `run_completed` event in `trace/events.jsonl`, before you consume the run.
   Mid-run output directories are not final artifacts.

4. **Synthesize.** Collect all outputs. Deduplicate findings across tiers.
   Rank by severity: blocking (correctness, security, Volume invariants) >
   important (architecture, testing) > advisory (style, naming).

5. **Verdict.** If no blocking findings → **Ship**. If blocking findings exist →
   fix loop (below).

## Volume Blocking Concerns (reviewers MUST catch)

These are shipstoppers specific to this codebase. Any one = blocking.

- Convex mutation without `ctx.auth.getUserIdentity()` + ownership check
- Relative import inside `convex/` (must use `@/lib/...` alias)
- `@/lib/logger` imported inside a `convex/` file (illegal — Convex can't
  load Next.js modules; use `console.warn` there)
- AI SDK conversation flattened to `{role, content}` instead of
  `ModelMessage[]`; missing `response.messages` append after each turn
- Empty `catch {}` blocks (must `log.warn(msg, ctx)` or `reportError`)
- Re-validation of Convex args after `v.union` (unnecessary — validated pre-handler)
- Fake timers in Convex tests (banned — use time window assertions)
- Coverage threshold drift between `vitest.config.ts` and
  `scripts/verify-coverage.ts`
- Stripe code trusting TS types for mode-dependent params (docs > types)
- Hard delete of exercises (must soft-delete via `deletedAt`)
- History view missing `includeDeleted: true`
- PaywallGate bypass on premium features (subscription state per ADR-0006)
- Server-only env read in `.client` file (must be `NEXT_PUBLIC_*` or `NODE_ENV`)
- Rate-limit bypass on AI-invoking endpoints (per ADR-0001)
- Single-side border on rounded card; emoji in UI; wordmark without
  `safe-area-inset-top`; accent color used decoratively instead of on data
  numbers / peaks / totals

## Fix Loop

For each blocking finding, spawn a **builder** sub-agent with the specific
file:line and fix instruction. Builders fix strategically (Ousterhout) and
simply (grug). Builder fixes, runs the auto-fix gate, commits.

**Auto-fix gate loop** (run after every fix, converge before re-review):

```bash
bun run lint:fix && bun run format
bun run typecheck
bun run test:affected      # or bun run test:coverage before handoff
bun run architecture:check
dagger call check --source .   # Docker required; pre-settle CI parity
```

After all fixes land, **re-dispatch all three review tiers.** Full re-review,
not a spot-check. Loop until no blocking findings remain. Max 3 iterations —
escalate to human if still blocked.

**Exit state:** "review clean" = all reviewers PASS AND the auto-fix loop
converges. Hand off to `/qa` → `/settle`.

## Live Verification

**Trigger:** the diff touches user-facing surface — `src/app/**/*.tsx`,
`src/components/**`, `src/app/api/**/route.ts`, or coach tool handlers
under `convex/ai/`.

**Rule:** at least one reviewer must exercise the affected routes/components
via `bun run dev` (Next.js + Convex + Stripe forwarding). A11y touches also
require `a11y-critic`. **Ship** verdict is blocked until live verification passes.

**Skip:** pure refactors, config-only, test-only, Convex-internal backend
work with no client surface.

## Plausible-but-Wrong Patterns

LLMs optimize for plausibility, not correctness. Reviewers must hunt for:

- Convex mutations that compile but skip ownership checks
- AI SDK tool handlers that return shaped results but bypass the
  `close_matches` pattern from `docs/patterns/coach-tools.md`
- `PaywallGate` wrappers present but the underlying query leaks premium data
- Stripe handlers that trust TS types on mode-dependent params
- "Specification-shaped" Convex code — right function names, missing auth
- Tests that pass but assert against fake timers in Convex runtime

## Simplification Pass

After review passes, if diff > 200 LOC net:

- Look for code that can be deleted (Volume doctrine: code is a liability)
- Collapse unnecessary abstractions — especially shallow pass-throughs in
  `src/` that add nothing over direct Convex queries
- Simplify complex conditionals; kill dead branches
- Remove compatibility shims with no real users

## Review Scoring

After the final verdict, append one JSON line to `.groom/review-scores.ndjson`
at the Volume repo root (create `.groom/` if needed):

```json
{
  "date": "2026-04-20",
  "pr": 465,
  "correctness": 8,
  "depth": 7,
  "simplicity": 9,
  "craft": 8,
  "verdict": "ship",
  "providers": ["claude", "thinktank", "codex", "gemini"]
}
```

- Scores (1-10) reflect cross-provider consensus, not any single reviewer.
- `pr` is the PR number (e.g. #465, #472, #473), or `null` for branch-only review.
- `verdict`: `"ship"`, `"conditional"`, or `"dont-ship"`.
- `providers`: which review tiers contributed.
- This file is committed to git (not gitignored). `/groom` reads it for quality trends.

## Verdict Ref (git-native review proof)

After scoring, record the verdict as a git ref so `/settle` and pre-merge hooks
can enforce review requirements without relying on GitHub PR state.

```bash
source scripts/lib/verdicts.sh
verdict_write "<branch>" '{"branch":"<branch>","base":"master","verdict":"<ship|conditional|dont-ship>","reviewers":[...],"scores":{...},"sha":"<HEAD-sha>","date":"<ISO-8601>"}'
```

- Write on every review, not just "ship" — "dont-ship" verdicts block `/settle --land`.
- The `sha` field MUST be `git rev-parse HEAD` at the time of review. If the branch
  gets new commits after review, the verdict is stale and `/settle` will re-trigger review.
- Verdict refs live under `refs/verdicts/<branch>` and sync via `git push/fetch`.
- Also write a copy to `.evidence/<branch>/<date>/verdict.json` for browsability.
- The escape hatch (`SPELLBOOK_NO_REVIEW=1`) is handled at the caller
  (`scripts/land.sh`, `pre-merge-commit`), never inside `/code-review`.

Skip this step if `scripts/lib/verdicts.sh` does not exist locally.

## PR-Level Review

When reviewing an existing PR, fetch reviewer feedback from **all three**
GitHub endpoints — bots post to different places and missing one drops
entire review streams:

1. **Review threads** (GraphQL `reviewThreads`) — inline code comments from formal reviews
2. **PR comments** (REST `/pulls/<n>/comments`) — line-scoped review comments
3. **Issue comments** (REST `/issues/<n>/comments`) — general comments (Claude bot, CodeRabbit)

## Reviewer Ground Truth

Pass reviewers these links so they evaluate against the real contract:

- `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`
- `docs/patterns/coach-tools.md` for AI tool changes
- `docs/api-contracts.md` for route changes
- `docs/adr/ADR-0001..0008` for rate limits, soft delete, Stripe, AI, subscriptions
- `convex/schema.ts` + `convex/_generated/api.d.ts` for data shapes

## Gotchas

- **Self-review leniency:** Models overrate their own work. Reviewers must be separate sub-agents, not the builder evaluating itself.
- **Reviewing the whole codebase:** Review the diff, not the repo. `git diff master...HEAD` is the scope.
- **Skipping tiers:** Internal bench alone is same-model groupthink. Thinktank + cross-harness provide genuine model and harness diversity.
- **Misreading a live Thinktank run:** `review.md`, `summary.md`, and
  `agents/*.md` may not exist until late. Watch stderr progress or
  `trace/summary.json`, not just the directory listing.
- **Treating all concerns equally:** Volume blocking concerns (auth, logger import, AI SDK shape, paywall, env scope) gate shipping. Style preferences don't.
- **Env-induced false positives:** On service failures, reviewers sometimes blame code. Check `./scripts/verify-env.sh --prod-only` and `curl https://volume.fitness/api/health | jq` before accepting a "broken service" finding.
- **Over-prescribing prompts:** You are the marshal. Craft prompts that fit the diff.
