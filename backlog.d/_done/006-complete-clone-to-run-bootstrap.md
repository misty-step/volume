# Complete clone-to-run bootstrap

Priority: medium
Status: done
Estimate: M

## Goal

Make the repository friendlier to fresh clones by extending setup automation and documenting the remaining external-service dependencies precisely.

## Non-Goals

- Eliminate external SaaS dependencies entirely
- Introduce Docker or devcontainers just to satisfy a checklist
- Mock production services in ways the team does not already use

## Oracle

- [x] [command] `bun run setup` checks for required tooling and explains missing prerequisites clearly
- [x] [behavioral] First-run docs match the actual bootstrap path
- [x] [behavioral] Required environment variables and one-time setup steps are fully enumerated
- [x] [command] The bootstrap path avoids surprising failures where possible

## Notes

A setup script now exists, but the repo still depends on hosted Convex, Clerk,
Stripe, and OpenRouter. This item is about reducing friction and ambiguity, not
pretending those dependencies are local-first.

## Touchpoints

- `scripts/setup.sh`
- `README.md`
- `CLAUDE.md`
- `.env.example`
- `CONTRIBUTING.md`
- `package.json`
- `src/lib/setup-script.test.ts`

## What Was Built

- Added `./scripts/setup.sh --check` plus `bun run setup:check` so a fresh clone can validate required tooling without side effects.
- Hardened `scripts/setup.sh` to group required vs optional tooling, preserve `.env.local` idempotently, and print a canonical next-steps block with the exact Convex, Clerk, OpenRouter, and Stripe bootstrap actions.
- Updated `README.md`, `CLAUDE.md`, and `CONTRIBUTING.md` to align on the same bootstrap order: `setup` -> `convex dev` -> `dev`.
- Reworked the top of `.env.example` to call out the minimum first-run variables, optional feature parity variables, and the fact that `bunx convex dev` refreshes the local Convex values.
- Added focused Vitest coverage for the new setup script behaviors: check mode, missing-tool failure, first-run `.env.local` creation, and rerun idempotency.

## Workarounds

- Repo-wide `bun run format:check` still fails on many unrelated pre-existing files outside this item. The touched Prettier-managed files in this diff were checked directly instead.
