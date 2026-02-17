# Volume

Workout tracker that makes logging sets fast and shows you what's working.

**Live:** [volume.fitness](https://volume.fitness)

![Lines](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/phrazzld/9cd2c922fff4686b6c97f03dfeccf167/raw/coverage-lines.json)
![Branches](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/phrazzld/9cd2c922fff4686b6c97f03dfeccf167/raw/coverage-branches.json)
![Functions](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/phrazzld/9cd2c922fff4686b6c97f03dfeccf167/raw/coverage-functions.json)

## Quick Start

```bash
pnpm install
pnpm dev        # Runs Next.js (port 3000) + Convex (cloud) together
```

Open [localhost:3000](http://localhost:3000).

**First time?** You need Clerk keys. See [First-Time Setup](#first-time-setup) below.

## Understanding the Codebase

| Doc                                | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System shape, data flow, where to start reading        |
| [CLAUDE.md](CLAUDE.md)             | Detailed reference (commands, env vars, observability) |
| [AGENTS.md](AGENTS.md)             | Conventions for AI assistants                          |
| [docs/adr/](docs/adr/)             | Architectural decisions                                |

**TL;DR architecture:**

- `src/` - Next.js frontend (React + Tailwind)
- `convex/` - Backend functions (mutations, queries, crons)
- Clerk handles auth, Stripe handles payments, OpenRouter generates insights

## Development

```bash
pnpm dev          # Both servers
pnpm typecheck    # TypeScript
pnpm lint         # ESLint
pnpm test         # Vitest (watch mode)
pnpm test --run   # Vitest (single run)
```

Quality gates run automatically via Lefthook (pre-commit, pre-push).

## First-Time Setup

### 1. Convex (backend)

```bash
pnpm convex dev   # Creates project, generates .env.local
```

### 2. Clerk (auth)

Get keys from [dashboard.clerk.com](https://dashboard.clerk.com) and add to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Then sync the JWT issuer to Convex:

```bash
pnpm convex env set CLERK_JWT_ISSUER_DOMAIN "https://<your-dev>.clerk.accounts.dev"
```

### 3. Start development

```bash
pnpm dev
```

## Troubleshooting

**"Could not find public function"** - Run `pnpm convex dev` to sync after pulling changes.

**Servers separately** - `pnpm dev:next` or `pnpm dev:convex` when isolating issues.

## Tech Stack

Next.js 15, TypeScript, Tailwind, Convex (BaaS), Clerk (auth), Stripe (payments), OpenRouter (insights)

## Features

- Create exercises (AI classifies muscle groups)
- Log sets (reps + optional weight, smart suggestions)
- View history (reverse-chronological, grouped by day)
- Weekly AI reports (PRs, volume, streaks)
- Subscription billing (14-day trial, then paid)

See `BACKLOG.md` for planned features.

## Rate Limits

AI endpoints are rate-limited per user:

- Exercise creation: 10/minute
- AI reports: 5/day

Override via `RATE_LIMIT_EXERCISE_PER_MIN`, `RATE_LIMIT_REPORTS_PER_DAY` env vars.

## Releases

Conventional Commits + release-please. Merging to `master` auto-creates Release PR. Merging Release PR bumps version + publishes changelog.

See CLAUDE.md "Release Management" for commit format.
