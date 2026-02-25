# Pi Local Workflow (Volume)

This repository uses a lean local Pi foundation in `.pi/` to keep agent work repo-grounded, auditable, and easy to evolve.

## What is configured

- `settings.json`: local intent + prompt allow-list
- Agent overlays:
  - `.pi/agents/planner.md`
  - `.pi/agents/worker.md`
  - `.pi/agents/reviewer.md`
- Team topology: `.pi/agents/teams.yaml`
- Delivery pipelines: `.pi/agents/pipelines.yaml`
- Prompt templates:
  - `/discover`
  - `/design`
  - `/deliver`
  - `/review`

## Core loop (explore -> design -> implement -> review)

1. Run `/discover <goal>` to gather repo evidence and define the smallest safe slice.
2. Run `/design <goal>` to produce an implementation contract.
3. Run `/deliver <goal>` while implementing the approved design.
4. Run `/review <goal>` for adversarial pass/fail triage before handoff.

## Pipeline selection

- **volume-feature-delivery**: default for `src/**`, `convex/**`, `packages/core/src/**`
- **coach-runtime-delivery**: coach API/runtime/block-rendering changes
- **integration-safety-delivery**: Stripe/Clerk/Convex/env/workflow/deploy changes

## Validation expectations

Use the lightest proof that matches risk, then escalate:

- Targeted: `bun run test --run ...` or `bun run test:affected <changed-files>`
- Baseline: `bun run typecheck`, `bun run lint`
- Release-safety parity: `NODE_ENV=test CI=true bun run test:coverage`, `bun run build`
- Integration safety: `./scripts/verify-env.sh --prod-only --quiet`

## Local conventions this setup assumes

- Package manager: `bun`
- Convex owns mutation/auth/ownership rules
- Conventional commits are enforced
- Lefthook pre-commit/pre-push gates are authoritative for local sharing quality

## Maintenance

- Add new prompt templates by updating `.pi/settings.json` allow-list (`prompts` with `+path`).
- If new agent overlays are added, update both `teams.yaml` and `pipelines.yaml` together.
- Revisit `.pi/bootstrap-report.md` after major workflow/tooling changes.
