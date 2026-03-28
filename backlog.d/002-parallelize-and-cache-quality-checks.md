# Parallelize and cache quality checks

Priority: high
Status: ready
Estimate: M

## Goal

Reduce CI wall-clock time by splitting lint, typecheck, tests, and build into parallel cached jobs.

## Non-Goals

- Replace GitHub Actions
- Rework product tests or coverage policy in the same change
- Optimize every workflow in the repository at once

## Oracle

- [ ] [command] The main CI workflow runs lint, typecheck, tests, and build in separate jobs
- [ ] [command] Dependency or build caching is configured in the CI workflow
- [ ] [behavioral] CI still publishes the required `merge-gate` status on PR heads
- [ ] [command] Any workflow-specific tests or validation commands continue to pass

## Notes

The current `.github/workflows/ci.yml` runs install, lint, typecheck, and test
sequentially in one job and does not cache build artifacts. This keeps the repo
at L3 Build & CI maturity even though the verification surface is already strong.

## Touchpoints

- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`
- `README.md`
- `CLAUDE.md`
