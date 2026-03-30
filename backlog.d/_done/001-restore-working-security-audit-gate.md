# Restore working security audit gate

Priority: high
Status: done
Estimate: M

## Goal

Make dependency auditing real again so the repo has a working local and CI gate for high-severity package vulnerabilities.

## Non-Goals

- Rebuild the entire dependency stack
- Introduce a second package manager
- Chase low-severity advisories in the same diff

## Oracle

- [x] [command] `bun run security:audit` exits 0 in this worktree
- [x] [command] CI runs the dependency audit command and fails on high-severity findings
- [x] [test] Lefthook/config validation still passes after the audit command change
- [x] [behavioral] The repo no longer advertises a broken `security:audit` command

## Notes

## Problem

`package.json` currently defines `security:audit` as `bun pm scan`, but in Bun
1.3.x that command requires an external scanner configuration and exits with:
"no security scanner configured". After bootstrap, `bun audit --audit-level=high`
is the working Bun-native path and currently reports high-severity transitive
vulnerabilities.

## Outcome

The repository uses a working Bun-native audit command, the vulnerable package
set is remediated or otherwise resolved until the audit passes, and CI enforces
the same check.

## What Was Built

- Added a real `security-audit` pre-push gate in `.lefthook.yml` so local pushes
  execute the same audit path as CI.
- Kept `package.json` on the Bun-native audit command
  `bun audit --audit-level=high` and added a CI step that runs
  `bun run security:audit`.
- Tightened `src/lib/lefthook-validator.ts` to enforce the canonical contract:
  Lefthook must run `bun run security:audit`, and `package.json` must define
  `security:audit` as `bun audit --audit-level=high`.
- Expanded validator tests to cover the new contract and refreshed Stripe API
  version constants to match the currently installed Stripe types after the
  dependency refresh.
- Regenerated `bun.lock` with safe same-major dependency lifts so `bun audit`
  clears the previously reported high-severity transitive vulnerabilities.

## Workarounds

- Bun 1.3.x override support is top-level only, so the vulnerable transitive
  packages were remediated with narrow same-major `overrides` entries rather
  than version-qualified nested overrides.

## Context

- Existing touchpoints: `package.json`, `.github/workflows/ci.yml`,
  `src/lib/lefthook-validator.ts`, `src/lib/lefthook-validator.test.ts`
- The repo already treats security audit consistency as a load-bearing config
  invariant.
- Work within Bun and existing repo conventions; do not switch the project to
  npm or pnpm.

## Touchpoints

- `package.json`
- `.github/workflows/ci.yml`
- `src/lib/lefthook-validator.ts`
- `src/lib/lefthook-validator.test.ts`
- `bun.lock`
