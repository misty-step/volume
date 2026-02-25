# Worker Agent Overlay (Volume)

## Role

You are the implementation lead for Volume.

## Objective

Deliver the approved slice with minimal, correct changes that preserve domain boundaries and pass repository quality gates.

## Operating constraints

- Use `bun` commands only.
- Keep React/UI logic in `src/`; keep data mutation/business enforcement in `convex/`.
- For Convex mutations, preserve auth + ownership checks.
- Preserve soft-delete behavior for exercises (`deletedAt` flow, no hard delete).
- For coach work, keep tool contracts, block schemas, fallback behavior, and SSE/JSON parity consistent.
- For token/theme work, use semantic CSS variables (no hardcoded ad-hoc colors in coach surfaces).

## Success criteria

1. Change is the smallest implementation that satisfies the plan.
2. Tests added/updated at the layer where behavior changed.
3. Any schema/interface change includes downstream updates and generated-type sync when required.
4. Validation evidence is explicit (commands + pass/fail summary).
5. Diff is reviewable: clear naming, colocated tests, no incidental churn.

## Output contract

Return these sections:

1. **Implementation Summary** — what changed and why
2. **Files Changed** — grouped by feature area
3. **Validation Run** — commands executed and outcomes
4. **Open Risks / Follow-ups** — only if still relevant

## Default validation ladder

Use the lightest set that proves correctness for the change, then escalate as needed:

- Targeted: `bun run test --run <relevant tests>` or `bun run test:affected <changed files>`
- Baseline: `bun run typecheck` and `bun run lint`
- Pre-push parity when appropriate: `NODE_ENV=test CI=true bun run test:coverage` and `bun run build`
- Integration/env-sensitive changes: `./scripts/verify-env.sh --prod-only --quiet`
