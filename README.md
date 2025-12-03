# Volume - Workout Tracker MVP

![Lines](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/phrazzld/9cd2c922fff4686b6c97f03dfeccf167/raw/coverage-lines.json)
![Branches](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/phrazzld/9cd2c922fff4686b6c97f03dfeccf167/raw/coverage-branches.json)
![Functions](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/phrazzld/9cd2c922fff4686b6c97f03dfeccf167/raw/coverage-functions.json)

Simple workout tracking app with Convex backend and Clerk auth.

**Live at: [volume.fitness](https://volume.fitness)**

## ⚠️ IMPORTANT: Dual Server Architecture

This project requires **TWO** dev servers running simultaneously:

1. **Next.js** (port 3000) - Frontend application
2. **Convex** (cloud) - Backend functions & database

The `pnpm dev` command now runs **BOTH** servers concurrently with color-coded output.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start BOTH servers (Next.js + Convex)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First-Time Setup

### 1. Set up Convex

```bash
pnpm convex dev
```

This will:

- Create a new Convex project (first time only)
- Generate `.env.local` with your `NEXT_PUBLIC_CONVEX_URL`
- Start the Convex dev server

Press Ctrl+C to stop, then use `pnpm dev` for ongoing development.

### 2. Set up Clerk

- Go to [Clerk Dashboard](https://dashboard.clerk.com)
- Create a new application
- Copy the API keys and add them to `.env.local`:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```

### 3. Sync Convex auth issuer

Clerk tokens are rejected unless Convex knows which issuer signed them. Set the
matching domain per deployment:

```bash
# Local dev & Vercel preview (uses *.clerk.accounts.dev)
pnpm convex env set CLERK_JWT_ISSUER_DOMAIN "https://<your-dev>.clerk.accounts.dev" \
  --deployment-name curious-salamander-943

# Production (uses custom domain clerk.volume.fitness)
pnpm convex env set CLERK_JWT_ISSUER_DOMAIN "https://clerk.volume.fitness" \
  --deployment-name whimsical-marten-631
```

If you ever rotate Clerk instances, rerun the command for the affected
deployment(s) and restart `pnpm dev`.

### 4. Start Development

```bash
pnpm dev  # Runs BOTH Next.js and Convex
```

## Troubleshooting

### "Could not find public function" Error

If you see this error after pulling changes:

```bash
pnpm convex dev  # Syncs Convex functions to your deployment
```

This is required whenever you pull code with new/modified Convex functions.

### Running Servers Separately

If needed, you can run servers individually:

```bash
pnpm dev:next    # Next.js only (port 3000)
pnpm dev:convex  # Convex only (cloud)
```

## Verifying Deployment Configuration

Verify that Vercel environments are configured correctly:

```bash
# Check production environment variables
vercel env ls production | grep CONVEX

# Should show ONLY:
# CONVEX_DEPLOY_KEY    Encrypted    Production

# Should NOT show:
# CONVEX_DEPLOYMENT
# NEXT_PUBLIC_CONVEX_URL
```

Verify production site connects to correct deployment:

```bash
# Check which Convex deployment the site uses
curl -sL https://volume.fitness | grep -o 'https://[^"]*convex.cloud'

# Should output:
# https://whimsical-marten-631.convex.cloud
```

See `.env.example` for detailed deployment architecture documentation.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Convex** - Backend-as-a-service (database, real-time sync)
- **Clerk** - Authentication and user management
- **release-please** - Automated versioning + changelog from conventional commits

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
└── ...
convex/               # Convex backend functions
├── schema.ts         # Database schema
├── exercises.ts      # Exercise CRUD
└── sets.ts          # Set logging
```

## Development

```bash
pnpm dev          # Start Next.js dev server
pnpm convex dev   # Start Convex dev server (in separate terminal)
pnpm typecheck    # Run TypeScript checks
pnpm lint         # Run ESLint
pnpm test         # Run unit tests
```

## Rate Limits (AI endpoints)

- Exercise creation: 10 per minute per user (override with `RATE_LIMIT_EXERCISE_PER_MIN`).
- On-demand AI reports: 5 per day per user (override with `RATE_LIMIT_REPORTS_PER_DAY`).
- Cron/backfill/admin paths are exempt by default. Limits enforced in Convex via `rateLimits` table; errors include retry-after metadata.

## MVP Features

- ✅ User authentication (Clerk)
- ✅ Create/list/delete exercises
- ✅ Log sets (reps + optional weight)
- ✅ View history (reverse-chronological)
- ✅ Mobile responsive

See `BACKLOG.md` for post-MVP enhancements.

## Release & Versioning Contract

- Version precedence: `SENTRY_RELEASE` → git SHA (`VERCEL_GIT_COMMIT_SHA`/`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, short) → `npm_package_version` → `dev`.
- Build-time version is exposed as `NEXT_PUBLIC_APP_VERSION` and shown in the footer; health endpoint and Sentry use the same resolution.
- **Conventional Commits**: All commits to `master` must follow [Conventional Commits](https://www.conventionalcommits.org/) format (`<type>: <description>`)
- **Automated Release PR**: release-please (`.github/workflows/release-please.yml`) automatically creates/updates a Release PR when changes are pushed to `master`
- **Changelog & Versioning**: Merging the Release PR updates `CHANGELOG.md`, bumps `package.json` version, and creates a GitHub release with tags (no npm publish)
- See `CLAUDE.md` Release Management section for detailed workflow and commit format examples.
