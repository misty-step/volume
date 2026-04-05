# Contributing

Volume uses Bun, Next.js, Convex, Lefthook, and Vitest. Keep changes small,
behavior-focused, and documented where contracts change.

## Bootstrap

```bash
./scripts/setup.sh --check
bun run setup
bunx convex dev
```

`bun run setup` installs dependencies, creates `.env.local` from
`.env.example` when missing, and prints the remaining external credentials you
need before `bun run dev` will succeed.

Canonical order: `bun run setup` -> `bunx convex dev` -> `bun run dev`.

Before the core local app flow is useful, fill in these `.env.local` values:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`

Then sync the Clerk issuer into Convex:

```bash
bunx convex env set CLERK_JWT_ISSUER_DOMAIN "https://<your-dev>.clerk.accounts.dev"
```

Optional full-feature parity:

- Add `OPENROUTER_API_KEY` locally and in Convex for coach features and `/api/health`.
- Add Stripe keys and price IDs locally for checkout/billing flows.
- Install Stripe CLI and run `stripe login` if you want local webhook forwarding.

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
- Pre-push hooks run coverage, build verification, and the `security-audit`
  gate via `bun run security:audit`.
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
- Changes to `master` land through pull requests with one approving review plus
  a passing `merge-gate` status on the PR head commit.
- Summarize user-visible behavior changes and any env or schema impact.
- Include screenshots for UI changes.
- Call out any follow-up work instead of hiding it in the diff.
