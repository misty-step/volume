# Tighten governance baselines

Priority: medium
Status: done
Estimate: S

## Goal

Require PR review and required checks on the default branch so governance matches the repo’s documented quality bar.

## Non-Goals

- Replacing GitHub as the forge
- Reworking every branch rule in the organization
- Changing status contexts unrelated to repository quality

## Oracle

- [x] [behavioral] Default branch protection requires PR-based changes
- [x] [behavioral] Required review and required status checks are enforced
- [x] [behavioral] Repository docs reflect the actual policy

## Notes

Verified and completed on 2026-04-05: repository branch protection requires one
approving review, the `merge-gate` status check, and now enforces the same rule
for admins (`enforce_admins: true`).

## Touchpoints

- GitHub branch protection settings
- `README.md`
- `CONTRIBUTING.md`

## What Was Built

- Re-verified the live `master` branch protection settings through the GitHub
  API instead of trusting the stale backlog note.
- Enabled admin enforcement on `master` so the PR review and required-check
  policy cannot be bypassed by repository admins.
- Updated contributor-facing docs to state that changes to `master` land
  through pull requests with one approving review and a passing `merge-gate`
  status on the PR head commit.
- Closed the backlog item with the verified final policy instead of the stale
  blocked note.
