# Contributing

Volume uses Bun, Next.js, Convex, Lefthook, and Vitest. Keep changes small,
behavior-focused, and documented where contracts change.

## Bootstrap

```bash
bun run setup
```

`bun run setup` installs dependencies, creates `.env.local` from
`.env.example` when missing, and prints the remaining external credentials you
need before `bun run dev` will succeed.

## Daily Workflow

```bash
bun run dev
bun run typecheck
bun run lint
bun run test --run
bun run test:coverage
bun run build
```

Prefer `bun run quality:check` for a quick confidence pass and
`bun run quality:full` before opening a PR.

## Quality Gates

- Pre-commit hooks run formatting, lint, typecheck, secret scanning, and
  config validation through Lefthook.
- Pre-push hooks run coverage and build verification.
- Commit messages must follow Conventional Commits.
- Do not lower lint, type, test, or coverage gates to land a change.

## Change Scope

- Fix the area you touch. Do not leave nearby breakage behind.
- Add or update tests for behavioral changes.
- Keep public contracts documented in
  [`docs/api-contracts.md`](docs/api-contracts.md).
- Update [`CLAUDE.md`](CLAUDE.md) or [`README.md`](README.md) when setup,
  commands, or operational expectations change.

## Pull Requests

- Keep PRs focused and easy to review.
- Summarize user-visible behavior changes and any env or schema impact.
- Include screenshots for UI changes.
- Call out any follow-up work instead of hiding it in the diff.
