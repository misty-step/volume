# Parallelize and cache quality checks

Priority: high
Status: in-progress
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

- [ ] `bun run typecheck && bun run lint` completes in parallel during pre-push (wall time < max of the two, not sum)
- [ ] CI workflow runs lint, typecheck, tests, and build as separate parallel jobs
- [ ] CI caches `node_modules` and `.next` between runs
- [ ] CI still publishes the required `merge-gate` status on PR heads
- [ ] Pre-push wall time < 50s (down from ~82s serial)
- [ ] `bundle-analysis` does not conflict with `build-check` on `.next/lock`

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

## Touchpoints

- `.lefthook.yml` (pre-push parallel groups)
- `.github/workflows/ci.yml` (job parallelization + caching)
- `.github/workflows/e2e.yml`
- `CLAUDE.md`
