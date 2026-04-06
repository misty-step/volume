# Tighten governance baselines

Priority: medium
Status: blocked
Estimate: S

## Goal

Require PR review and required checks on the default branch so governance matches the repo’s documented quality bar.

## Non-Goals

- Replacing GitHub as the forge
- Reworking every branch rule in the organization
- Changing status contexts unrelated to repository quality

## Oracle

- [ ] [behavioral] Default branch protection requires PR-based changes
- [ ] [behavioral] Required review and required status checks are enforced
- [ ] [behavioral] Repository docs reflect the actual policy

## Notes

Owner policy changed on 2026-04-06: for personal projects, GitHub-enforced PR
reviews and required checks are not the preferred governance model. The desired
direction is Git-first workflow with local hooks, local `dagger` checks, and
local agent review, using pull requests only when they materially help.

## Touchpoints

- GitHub branch protection settings
- `README.md`
- `CONTRIBUTING.md`

## What Was Built

- Re-opened this item as blocked because the owner no longer wants GitHub
  branch-protection rules to be the primary quality gate on personal repos.
- Updated contributor-facing docs to prefer local hooks, local `dagger`
  verification, and local review over mandatory GitHub PR/ruleset workflow.
- The remaining GitHub org/repo rules are now an external policy question, not
  a repository-docs completion.
