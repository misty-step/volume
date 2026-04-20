---
name: deliver
description: |
  Inner-loop composer. Takes one backlog item to merge-ready code. Composes
  /shape → /implement → {/code-review + /ci + /refactor + /qa} (clean loop)
  and stops. Does not push, does not merge, does not deploy. Communicates
  with callers via exit code + receipt.json — no stdout parsing.
  Every run also ends with a tight operator-facing brief plus a full
  /reflect session.
  Use when: building a shaped ticket, "deliver this", "make it merge-ready",
  driving one backlog item through review + CI + QA.
  Trigger: /deliver.
argument-hint: "[backlog-item|issue-id] [--resume <ulid>] [--abandon <ulid>] [--state-dir <path>]"
---

# /deliver

Inner-loop composer for Volume (Next.js 16 + Convex + Clerk + Stripe +
OpenRouter/AI SDK v6 on bun). One item from `backlog.d/` → merge-ready
code on a feature branch. **Delivered ≠ shipped.** `/settle` lands the
PR; `/deploy` cuts the release. Humans merge.

## Invariants

- Compose atomic phase skills. Never inline phase logic.
- Fail loud. A red gate is a red gate — never mask it as "best effort."

## Closeout Contract

Every `/deliver` run ends with two operator-facing outputs, in order:

1. A tight delivery brief (5 bullets: what shipped, gates passed,
   residual risk, suggested reviewer, follow-up tickets filed under
   `backlog.d/`).
2. A full `/reflect` session — emits codification suggestions to
   `~/.claude/projects/-Users-phaedrus-Development-volume/memory/` and
   fresh items into `backlog.d/`.

`receipt.json` remains the machine source of truth. The brief and
reflection are for the human operator.

The delivery brief must answer:

- Which `backlog.d/` item was worked and what changed.
- Why making it merge-ready matters now (user value + operator value).
- What structurally distinct alternatives existed and why the chosen
  design won under current constraints. If it is merely "good enough,"
  say so plainly.
- What was verified — `quality:full` result, Playwright flow(s) touched,
  manual-QA notes (invoke `/volume-manual-qa` whenever the change touches
  health, auth, paywall, Today workspace, or the coach composer).
- Residual risk before merge or deploy (env-var drift, Convex schema
  migration, Stripe mode assumptions, etc.).

`/reflect` is mandatory and separate. Brief explains the delivered
result; reflect captures harness mutations.

## Composition

```
/deliver [backlog-item|issue-id] [--resume <ulid>] [--state-dir <path>]
    │
    ▼
  pick (if no arg) — top-priority file in backlog.d/ (skip _done/)
    │
    ▼
  /shape            → context packet (goal + oracle + sequence)
    │
    ▼
  /implement        → TDD on feat/<topic> or fix/<topic>
                      inner loop per edit: bun run test:affected
                                            bun run typecheck
    │
    ▼
┌── CLEAN LOOP (max 3 iterations) ──────────────────────────┐
│  /code-review    → critic + philosophy bench               │
│  /ci             → `dagger call check --source .` (Docker) │
│                    fallback: `bun run quality:full`        │
│  /refactor       → diff-aware simplify                     │
│  /qa             → bun run test:e2e (Playwright) +         │
│                    /volume-manual-qa when UX touched       │
│                    + curl localhost:3000/api/health | jq   │
└───────────────────────────────────────────────────────────┘
    │ all green → merge-ready (exit 0)
    │ cap hit or hard fail → fail loud (exit 20/10)
    ▼
  receipt.json written to .agents/worktrees/<cycle>/deliver-receipt.json
  Stop. No push. No merge. No deploy. Hand off to /settle or /deploy.
```

Pre-review batch (runs before `/code-review`):
`bun run lint:fix && bun run format && bun run typecheck && bun run test:coverage`

Full gate (equivalent to pre-push): `bun run quality:full`
= `typecheck && lint && architecture:check && test:coverage && build`

## Phase Routing

| Phase     | Skill          | What it owns                                                                                                                                            | Skip when                                         |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| shape     | `/shape`       | context packet, oracle, sequence                                                                                                                        | packet already has executable oracle              |
| implement | `/implement`   | TDD red→green→refactor on `feat/<topic>` or `fix/<topic>`, Conventional Commits                                                                         | —                                                 |
| review    | `/code-review` | parallel bench review, synthesized findings                                                                                                             | —                                                 |
| ci        | `/ci`          | `dagger call check --source .`, fallback `bun run quality:full`                                                                                         | `/ci` itself decides — do not pre-filter          |
| refactor  | `/refactor`    | diff-aware simplification                                                                                                                               | trivial diffs (<20 LOC, single file)              |
| qa        | `/qa`          | Playwright (`e2e/auth.setup.ts`, `coach-flows.spec.ts`, `critical-flow.spec.ts`, `error-scenarios.spec.ts`) + `/volume-manual-qa` + `/api/health` probe | pure library/refactor with no user-facing surface |

Each skill has its own contract and receipt. `/deliver` reads those
receipts; it never re-implements the phase.

## Cross-Cutting Invariants

- **No claims.** Single local workspace. Concurrent worktrees coordinate
  via state-dir isolation under `.agents/worktrees/<cycle>/`.
- **Never re-deliver stale backlog.** If the target `backlog.d/<item>.md`
  already carries `## What Was Built`, or `git log` on the current branch
  contains `Closes backlog:<item-id>` / `Ships backlog:<item-id>`, or the
  file has been moved to `backlog.d/_done/`, stop and route to
  `/groom tidy`. That is drift, not fresh work.
- **Never push.** `/settle` owns `git push` and PR land.
- **Never merge.** `gh pr merge` is a human decision; release-please
  handles master merges for releases.
- **Never deploy.** Convex prod deploy
  (`CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx convex deploy -y`)
  and Vercel promotion are `/deploy`'s concern.
- **Never commit to master.** Feature branch only (`feat/<topic>` or
  `fix/<topic>`). Master moves only through release-please.
- **Conventional Commits.** commitlint + Lefthook enforce on commit.
  Never use `--no-verify`. `SKIP_QUALITY_GATES=1` is an emergency escape
  and must be documented in the PR comment.
- **Fail loud.** Coverage under threshold (lines 52, branches 83,
  functions 73, statements 52) is red. `bun run architecture:check`
  boundary/cycle violations are red. trufflehog secret hits are red.
- **Evidence is out-of-band.** `/deliver` writes zero artifacts itself;
  per-phase skills emit under `.agents/worktrees/<cycle>/`; receipt
  records pointers only.

## Contract (exit code + receipt)

`/deliver` communicates exclusively via its exit code and the receipt at
`.agents/worktrees/<cycle>/deliver-receipt.json`. Callers — human,
`/settle`, or an outer loop — do not parse stdout.

| Exit | Meaning                                                                                           | Receipt `status`       |
| ---- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| 0    | merge-ready (quality:full green + QA smoke + review clean)                                        | `merge_ready`          |
| 10   | phase handler hard-failed (Docker daemon absent, `bunx convex dev` out of sync, tool infra error) | `phase_failed`         |
| 20   | clean loop exhausted (3 iterations, still dirty)                                                  | `clean_loop_exhausted` |
| 30   | user/SIGINT abort                                                                                 | `aborted`              |
| 40   | invalid args / missing dep skill                                                                  | `phase_failed`         |
| 41   | double-invoke on an already-delivered `backlog.d/` item                                           | `phase_failed`         |

## Resume & Durability

State is filesystem-backed and resumable.

- **State root:** `.agents/worktrees/<cycle>/` (gitignored). Override
  with `--state-dir <path>`.
- **Checkpoint:** after each phase, `state.json` rewritten atomically
  (write → fsync → rename) alongside `deliver-receipt.json`.
- **`--resume <ulid>`:** loads `state.json`, skips completed phases,
  re-enters at `current_phase`. Phase handlers must be idempotent.
- **`--abandon <ulid>`:** removes state-dir; leaves branch as-is.
- **Double-invoke:** `/deliver <already-delivered-item>` → exit 41.

## Gotchas (judgment, not procedure)

- **Retry vs escalate.** Dirty on iteration 1 → retry. Dirty on
  iteration 3 → exit 20, write receipt, hand to human. The cap is
  load-bearing.
- **What counts as "dirty".** `/code-review` blocking verdict, `/ci`
  non-zero (`dagger call check` fail or `quality:full` red), `/qa`
  P0/P1 (including Playwright failures and broken `/api/health`). P2
  findings are logged in the receipt and do NOT block. Review "nit"
  and "consider" are not blocking.
- **Coverage drift.** `vitest.config.ts` thresholds and
  `scripts/verify-coverage.ts` must stay in sync. If one moves, the
  other moves in the same commit — otherwise CI will whiplash.
- **Convex types stale.** After any `convex/schema.ts` change, run
  `bunx convex dev` before `bun run typecheck`. Stale types are a
  classic phase-10 hard fail.
- **AI SDK conversation shape.** Coach-touching changes must use
  `ModelMessage[]` from `'ai'` and append `response.messages` each
  turn. Flat `{role, content}` pairs will silently re-trigger tools.
- **Dagger Docker daemon absent.** `/ci` falls back to
  `bun run quality:full` and records the fallback in the receipt.
  Never silently skip architecture or coverage gates.
- **Inlining a missing phase.** `/implement` missing → exit 40. Do not
  fall back to your own TDD build.
- **Silent push.** A phase skill that "helpfully" runs `git push` is a
  bug in that phase skill. Surface it.
- **Re-shaping mid-delivery.** If `/implement` or `/qa` reveals the
  shape is wrong (e.g., the ticket asks for a feature that collides
  with soft-delete or PaywallGate assumptions), stop the clean loop
  and exit with `remaining_work` pointing at re-shape. Do not spin.
- **Skipping shape.** Building without a context packet yields
  plausible garbage. If the `backlog.d/` item has no oracle, `/shape`
  runs first. Always.
- **Review without verdict = dirty.** If `/code-review` runs but no
  `refs/verdicts/<branch>` points at HEAD afterward, treat the review
  phase as failed.
- **Stale active item.** A `backlog.d/` item can be "open" and still
  already shipped because someone landed it manually. Refuse to treat
  that as new work; move the file into `backlog.d/_done/` first.
- **Merging.** Never. End-state is merge-ready, not merged.

## References

- `backlog.d/` — input queue (one `.md` per item); `backlog.d/_done/` — archive
- `.agents/worktrees/<cycle>/deliver-receipt.json` — per-run receipt
- `vitest.config.ts` + `scripts/verify-coverage.ts` — coverage thresholds
- `src/lib/architecture-checker.ts` + `scripts/verify-architecture.ts` — boundaries + cycles
- `e2e/` — Playwright flows
- `CLAUDE.md` — project invariants and pitfalls

## Non-Goals

- Deploying — `/deploy` owns Convex prod + Vercel promotion
- Merging — humans merge; release-please lands master merges
- Pushing — `/settle` owns `git push` and PR land
- Multi-ticket operation — one `backlog.d/` item per invocation
- Version-controlled evidence — gitignored under `.agents/worktrees/`

## Related

- Upstream escape hatch: `/ceo-review` (invoke before `/shape` when the
  ticket's framing is suspect)
- Phases: `/shape`, `/implement`, `/code-review`, `/ci`, `/refactor`,
  `/qa`, `/volume-manual-qa`
- Downstream: `/settle` (push + PR), `/deploy` (release), `/reflect`
  (always fires at session end)
