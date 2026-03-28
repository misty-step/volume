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

GitHub branch protection currently requires only the `merge-gate` status and no
required PR reviews. This is blocked on repository settings access and owner
policy decisions.

## Touchpoints

- GitHub branch protection settings
- `README.md`
- `CONTRIBUTING.md`
