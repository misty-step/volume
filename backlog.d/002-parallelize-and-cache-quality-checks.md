# Parallelize and cache quality checks

Priority: high
Status: done
Estimate: M

## Goal

Cut agent and human feedback latency by parallelizing both CI workflows and local
pre-push hooks, with dependency caching to avoid redundant installs.

## Non-Goals

- Replace GitHub Actions
- Rework product tests or coverage policy in the same change
- Optimize every workflow in the repository at once
- Reduce test suite duration (separate concern — setup overhead is 48s vs 26s execution)

## Oracle

- [x] `bun run typecheck && bun run lint` completes in parallel during pre-push (wall time < max of the two, not sum)
- [x] CI workflow runs lint, typecheck, tests, and build as separate parallel jobs
- [x] CI caches `node_modules` between runs (via `bun.lock` hash key + restore-keys fallback)
- [x] CI still publishes the required `merge-gate` status on PR heads
- [x] Pre-push wall time < 50s (measured: 30.83s, down from ~82s serial)
- [x] `bundle-analysis` does not conflict with `build-check` on `.next/lock`

## Notes

### Local Pre-push (Primary Bottleneck)

Current `.lefthook.yml` pre-push is `parallel: false` (line 59) because
`build-check` and `bundle-analysis` both access `.next/lock`. Measured times:

| Hook            | Time  | Can Parallelize              |
| --------------- | ----- | ---------------------------- |
| test-suite      | 43.4s | Yes (no .next dependency)    |
| lint            | 16.3s | Yes (runs in pre-commit too) |
| security-audit  | <1s   | Yes                          |
| build-check     | 13.1s | No (creates .next/lock)      |
| bundle-analysis | ~5s   | No (reads .next/lock)        |
| verify-prod-env | <1s   | Yes (master only)            |

**Fix**: Split into two groups:

- Group 1 (parallel): test-suite, security-audit, verify-prod-env
- Group 2 (sequential after group 1): build-check → bundle-analysis

Or move `bundle-analysis` to CI-only (not pre-push) and parallelize everything else.
Estimated new wall time: ~45s (test-suite dominates).

### CI Workflow

`.github/workflows/ci.yml` runs install → security audit → lint → typecheck → test
sequentially in one job. Split into parallel jobs with shared cache.

### Stale Branches

113 unmerged branches (98 local, 15 remote). Pruning these improves `git branch`
ergonomics and reduces cognitive load. Safe cleanup: `git branch --merged | grep -v master | xargs git branch -d`.

## What Was Built

PR: https://github.com/misty-step/volume/pull/459

**Lefthook:** Set `parallel: true` on pre-push. Split build commands: `build-check`
(non-master, skipped on master via `skip: ref: master`) and `build-and-analyze`
(master-only via `only: ref: master`). This eliminates the `.next/lock` conflict
while keeping bundle analysis on master pushes.

**CI:** Split single sequential job into 4 parallel jobs (lint, typecheck, test,
security-audit) with a shared `setup` job for `node_modules` caching. A `merge-gate`
aggregator job depends on all 4 and publishes the PR status.

**Validator:** Generalized `validateBranchReferences` to check both `only` and `skip`
refs across all pre-push commands (was previously hardcoded to `bundle-analysis` only).

Stale branch cleanup (noted in backlog) was deferred — separate concern.

## Touchpoints

- `.lefthook.yml` (pre-push parallel groups)
- `.github/workflows/ci.yml` (job parallelization + caching)
- `src/lib/lefthook-validator.ts` (generalized branch ref validation)
- `src/lib/lefthook-validator.test.ts` (updated fixtures + new skip ref test)
