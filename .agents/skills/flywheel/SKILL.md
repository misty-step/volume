---
name: flywheel
description: |
  Outer-loop shipping orchestrator. Composes /deliver, landing, /deploy,
  /monitor, and /reflect cycle per backlog item, then applies reflect
  outputs to the harness and backlog before looping.
  Use when: "flywheel", "run the outer loop", "next N items",
  "overnight queue", "cycle".
  Trigger: /flywheel.
argument-hint: "[--max-cycles N]"
---

# /flywheel

Compose cycles of: pick from `backlog.d/` → `/deliver` → land via `/settle`
→ `/deploy` (Vercel + `CONVEX_DEPLOYMENT=prod:whimsical-marten-631 bunx
convex deploy -y`) → `/monitor` (`/api/health`, Sentry, Canary, convex
logs) → `/reflect cycle <id>` → apply reflect's outputs to `backlog.d/`
and `~/.claude/projects/-Users-phaedrus-Development-volume/memory/` → loop.

You already know how to do each of these. This skill exists only to
encode the invariants that aren't inferable from the leaf names.

## Invariants

- Flywheel composes. Phase logic lives in the leaf skill (`/deliver`,
  `/settle`, `/deploy`, `/monitor`, `/reflect`).
- State lives in leaf receipts (`.agents/worktrees/<cycle-id>/receipt.json`),
  git, and `backlog.d/`. Flywheel holds none in memory.
- Pick lowest-open ID from `backlog.d/*.md` (currently 002, 003, 004, 005,
  006, 007, 009, 010) unless the user names one. Move shipped items to
  `backlog.d/_done/` during reflect, not before.
- Branch per item: `feat/<NNN>-<slug>` or `fix/<NNN>-<slug>`.
- Clean loop before `/settle`: `bun run quality:full` + `/code-review`
  bench + `/qa` (or `/volume-manual-qa` for user-flow changes).
- Land before deploy. Always. `/settle` runs `gh pr merge <n> --squash
--auto` — never direct-merge (breaks release-please sequencing).
- `/deploy` is gated on `./scripts/verify-env.sh --prod-only`. No exceptions.
- Deploy order: Convex prod first, then Vercel auto-promotes on master.
  Receipt records SHA, tag, `/api/health` status, rollback handle.
- `/monitor` holds a 10-minute grace window (30s→60s→120s cadence) before
  the cycle closes. Red trips → write `INCIDENT-<UTC>.md`, pause flywheel,
  hand to `/diagnose`. Flywheel does NOT auto-rollback.
- Reflect's mutations land before the cycle closes: `backlog.d/` moves,
  follow-up files, and harness memory updates under
  `~/.claude/projects/-Users-phaedrus-Development-volume/memory/`. If
  reflect surfaces a CI gap, patch `.lefthook.yml`,
  `.github/workflows/ci.yml`, or `dagger/src/` in the same cycle. SKILL
  body gaps → update `.agents/skills/<name>/SKILL.md`. ADR-level
  decisions → draft `docs/adr/ADR-NNNN.md`. Harness edits never touch
  product master.
- Human gate required before `/deploy` on ADR-reference commits, before
  advancing past a red monitor, and before flipping a
  subscription/state-machine path live (see ADR-0006).

## Gotchas

- `/deliver`'s receipt is the contract — don't peer inside. If the
  receipt says clean, trust it; rerun the clean loop if you don't.
- An item can be open in `backlog.d/` but already shipped in git (common
  after manual hotfix). Reconcile the stale entry into `_done/` before
  starting a cycle on it — don't re-deliver.
- Review threads live in THREE GitHub endpoints: GraphQL `reviewThreads`,
  REST `/pulls/$PR/comments`, and REST `/issues/$PR/comments`. Claude
  and CodeRabbit post to the third. `/settle` must check all three.
- Two `/flywheel` runs in the same checkout collide on git state and on
  the shared Convex dev deployment. Use `.agents/worktrees/` for parallel
  experimentation; serialize deploys against
  `prod:whimsical-marten-631`.
- Convex runtime code cannot import `@/lib/logger` — don't let reflect
  file that as a "fix" action. Convex uses `console.warn`.
- Skipping `/reflect` to "move faster" decays the outer loop. Two
  consecutive cycle failures → stop and escalate to user. Queue
  invalidation by user signal → stop immediately.

## Non-Goals

- No cycle state machine, event enum, lock, or pick scoring. The
  backlog order and `/monitor` verdict are the only signals.
- No USD tracking — Volume's agents run under subscription; per-token
  accounting belongs to OpenRouter-billed paths, not the orchestrator.
- No auto-rollback. Incident authority stays with the human gate.
- No cross-item parallelism on the shared master branch. Single-threaded
  by default; worktrees are for experimentation, not concurrent ships.
