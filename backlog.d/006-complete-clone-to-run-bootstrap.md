# Complete clone-to-run bootstrap

Priority: medium
Status: in-progress
Estimate: M

## Goal

Make the repository friendlier to fresh clones by extending setup automation and documenting the remaining external-service dependencies precisely.

## Non-Goals

- Eliminate external SaaS dependencies entirely
- Introduce Docker or devcontainers just to satisfy a checklist
- Mock production services in ways the team does not already use

## Oracle

- [ ] [command] `bun run setup` checks for required tooling and explains missing prerequisites clearly
- [ ] [behavioral] First-run docs match the actual bootstrap path
- [ ] [behavioral] Required environment variables and one-time setup steps are fully enumerated
- [ ] [command] The bootstrap path avoids surprising failures where possible

## Notes

A setup script now exists, but the repo still depends on hosted Convex, Clerk,
Stripe, and OpenRouter. This item is about reducing friction and ambiguity, not
pretending those dependencies are local-first.

## Touchpoints

- `scripts/setup.sh`
- `README.md`
- `CLAUDE.md`
- `.env.example`
