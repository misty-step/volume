# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Volume - Workout Tracker MVP

A simple workout tracking app built with Next.js 15, Convex backend, and Clerk authentication. Users can create exercises, log sets (reps + optional weight), and view their workout history.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, next-themes
- **Backend**: Convex (BaaS with real-time sync)
- **Auth**: Clerk (integrated with Convex)
- **Package Manager**: pnpm (v10.17.1)
- **Build Tool**: Turbopack (Next.js dev mode)

## Development Commands

```bash
# Development
pnpm dev                # Start Next.js dev server (Turbopack)
pnpm convex dev         # Start Convex dev server (run in separate terminal)

# Type Checking & Linting
pnpm typecheck          # Run TypeScript compiler checks (tsc --noEmit)
pnpm lint               # Run ESLint

# Testing
pnpm test               # Run tests (watch mode)
pnpm test:ui            # Run tests with UI
pnpm test:coverage      # Run tests with coverage report

# Production
pnpm build              # Build for production
pnpm start              # Start production server
```

## Testing Strategy

### Test Pyramid

1. **Backend (Convex)** ⭐⭐⭐⭐⭐ - Full coverage of mutations/queries
2. **Utilities & Hooks** ⭐⭐⭐⭐⭐ - Pure functions, business logic
3. **Components** ⭐⭐⭐ - Smoke tests + critical integration
4. **Manual QA** ⭐⭐⭐⭐ - PR checklist (see `.github/PULL_REQUEST_TEMPLATE.md`)
5. **E2E (Future)** ⭐⭐ - Playwright when patterns emerge

### Running Tests

```bash
pnpm test              # All tests (watch mode)
pnpm test:coverage     # Coverage report
pnpm test path/to/file # Single file
pnpm test:ui           # Vitest UI
pnpm test --run        # Run once without watch mode
```

### When Tests Fail

- **Backend/Utility tests** → Fix immediately (business logic)
- **Hook tests** → Fix immediately (business logic)
- **Component tests** → Evaluate: test issue or code issue?
- **Flaky component test** → Extract logic to hook, test there

### Adding New Features

1. Write backend tests first (TDD)
2. Extract complex logic to hooks
3. Test hooks thoroughly
4. Component tests: smoke + critical integration only
5. Add to manual QA checklist

### Philosophy

- Test **behavior**, not **implementation**
- Test **business logic**, not **third-party libraries**
- Test **what matters**, not **everything possible**

## Observability Stack

Volume uses Vercel Analytics for product metrics and Sentry for error tracking.

### Architecture

- **lib/analytics.ts**: Centralized API for all tracking (client + server)
- **lib/sentry.ts**: Configuration factory with PII scrubbing
- **components/analytics-wrapper.tsx**: Client-side analytics with URL filtering

### Key Features

- Type-safe event tracking (TypeScript prevents typos)
- Automatic PII redaction (emails, sensitive headers)
- User context enrichment (automatic userId attachment)
- Unified client/server API (same code works everywhere)
- Environment-aware (auto-disables in dev/test)

### Usage Examples

**Tracking Events:**

```typescript
import { trackEvent } from "@/lib/analytics";

// Type-safe - wrong properties won't compile
trackEvent("Set Logged", {
  setId: set._id,
  exerciseId: exercise._id,
  reps: 10,
  weight: 135,
});
```

**Reporting Errors:**

```typescript
import { reportError } from "@/lib/analytics";

try {
  await dangerousOperation();
} catch (error) {
  reportError(error, {
    operation: "dangerousOperation",
    userId: user.id,
  });
}
```

**User Context:**

```typescript
import { setUserContext, clearUserContext } from "@/lib/analytics";

// On login - all future events automatically include userId
setUserContext(user.id, { plan: "pro" });

// On logout
clearUserContext();
```

### Privacy Guarantees

- All emails automatically redacted: `user@example.com` → `[EMAIL_REDACTED]`
- Sensitive headers removed: Authorization, Cookie, API keys
- User IP addresses never sent to Sentry
- Workout data only tracked in aggregate (counts, not values)

### Adding New Events

1. Add to `AnalyticsEventDefinitions` in lib/analytics.ts
2. Define required/optional properties
3. Use TypeScript to enforce at call sites

Example:

```typescript
export interface AnalyticsEventDefinitions {
  "New Feature Used": {
    featureName: string;
    userId?: string;
  };
}
```

### Convex Error Tracking

Convex functions automatically report errors to Sentry via Convex Dashboard integration.

**Setup (Pro plan required):**

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your deployment (dev or prod)
3. Navigate to Settings → Integrations
4. Click "Sentry" card
5. Enter Sentry DSN: `SENTRY_DSN` value from .env.local
6. Save configuration

**Verification:**

1. Trigger a test error in a Convex function (throw new Error("test"))
2. Check Sentry for error with tags: func, func_type, func_runtime
3. Verify request_id matches Convex logs

**Troubleshooting:**

- "DSN invalid": Ensure DSN starts with `https://` and includes project ID
- Errors not appearing: Check Convex logs first, integration requires Pro plan
- Missing tags: Update to latest Convex SDK version

**What Gets Tracked:**

- Exceptions thrown from queries, mutations, actions
- Automatic tags: func, func_type, func_runtime, request_id
- User context from Clerk auth (if set with setUserContext)

**Client-Side Error Handling:**

Errors from Convex queries/mutations propagate to client and trigger Error Boundaries:

```typescript
const exercises = useQuery(api.exercises.listExercises);

// If query throws, Error Boundary catches and reports to Sentry
// No manual error checking needed - see src/app/history/page.tsx
```

**Manual Error Enrichment:**

For critical paths, enrich with Convex-specific context:

```typescript
const logSet = useMutation(api.sets.logSet);

try {
  await logSet({ exerciseId, reps, weight });
} catch (error) {
  reportError(error, {
    convexFunction: "sets.logSet",
    convexArgs: { exerciseId, reps, weight },
  });
}
```

### Health Check Endpoint

GET `/api/health` returns JSON health status for uptime monitoring:

```json
{
  "status": "pass",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "abc123",
  "checks": {
    "convex": { "status": "pass" }
  }
}
```

- Returns 200 when healthy, 503 when unhealthy
- Excluded from Clerk authentication (public route)
- Ready for UptimeRobot, BetterUptime, or Pingdom

### Alert Configuration Script

Run `./scripts/configure-sentry-alerts.sh` to create alerts:

1. **New Issue Alert**: Email on first occurrence of new error
2. **Error Rate Spike**: Email when >10 errors in 5 minutes
3. **Performance Regression**: Email when p95 > 3000ms

Script is idempotent (safe to re-run). Requires `SENTRY_MASTER_TOKEN` in `~/.secrets`.

## Architecture Overview

### Authentication Flow

- **Clerk Middleware** (`src/middleware.ts`): Protects all routes except `/sign-in` and `/sign-up`
- **Convex Integration**: Uses `ConvexProviderWithClerk` to sync auth state between Clerk and Convex
- **Auth Config**: `convex/auth.config.ts` configures Clerk JWT issuer for Convex

### Data Model (convex/schema.ts)

```typescript
exercises {
  userId: string          // Clerk user ID
  name: string           // Exercise name
  createdAt: number      // Unix timestamp

  indexes: by_user, by_user_name
}

sets {
  userId: string          // Clerk user ID
  exerciseId: Id<exercises>
  reps: number           // Number of repetitions
  weight?: number        // Optional weight
  performedAt: number    // Unix timestamp

  indexes: by_user, by_exercise, by_user_performed
}
```

### Convex Backend Functions

**exercises.ts**:

- `createExercise(name)` - mutation: Create new exercise for authenticated user
- `listExercises()` - query: Get all exercises for authenticated user (desc order)
- `deleteExercise(id)` - mutation: Delete exercise with ownership verification

**sets.ts**:

- `logSet(exerciseId, reps, weight?)` - mutation: Log new set with exercise ownership verification
- `listSets(exerciseId?)` - query: Get all sets or filter by exercise (desc order)
- `deleteSet(id)` - mutation: Delete set with ownership verification

**Security Pattern**: All mutations verify authentication and ownership before mutations

### Frontend Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with Clerk + Convex providers
│   ├── page.tsx                 # Home page (log workout)
│   ├── exercises/page.tsx       # Manage exercises
│   ├── history/page.tsx         # View workout history
│   ├── log/page.tsx            # Log sets for exercise
│   └── ConvexClientProvider.tsx # Convex + Clerk integration
├── components/
│   ├── exercises/
│   │   ├── create-exercise-form.tsx    # Form to create exercises
│   │   └── exercise-selector.tsx       # Select exercise for logging
│   ├── sets/
│   │   ├── log-set-form.tsx           # Form to log sets
│   │   └── set-list.tsx               # Display sets with exercise names
│   ├── layout/
│   │   └── nav.tsx                     # Global navigation with user menu
│   └── ThemeProvider.tsx               # Dark mode support (next-themes)
└── middleware.ts                        # Clerk auth middleware
```

### Key Patterns

1. **Convex Hooks**: Use `useQuery` for data fetching, `useMutation` for mutations

   ```typescript
   const exercises = useQuery(api.exercises.listExercises);
   const createExercise = useMutation(api.exercises.createExercise);
   ```

2. **Auth State**: Access user via Clerk hooks (`useUser()`)

3. **Real-time Updates**: Convex queries automatically subscribe to changes

4. **Path Aliases**: Use `@/*` for `src/*` imports

## Environment Setup

Required `.env.local` variables:

```bash
# Convex (generated by `pnpm convex dev`)
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud

# Clerk (from dashboard.clerk.com)
# Development: pk_test_* / sk_test_* / https://*.clerk.accounts.dev
# Production:  pk_live_* / sk_live_* / https://clerk.volume.fitness
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev

# OpenAI API (for AI features - set in Convex environment)
OPENAI_API_KEY=sk-proj-...
```

**Setting OpenAI API Key:**

The OPENAI_API_KEY is used by Convex backend functions (not Next.js) and must be set in Convex's environment:

```bash
# For local development
npx convex env set OPENAI_API_KEY "sk-proj-..."

# For production
npx convex env set OPENAI_API_KEY "sk-proj-..." --prod
```

Note: Do NOT set this in Vercel or GitHub secrets - only Convex backend uses it.

## First-Time Setup

1. Install dependencies: `pnpm install`
2. Start Convex dev server: `pnpm convex dev` (creates project + generates `.env.local`)
3. Set up Clerk application at dashboard.clerk.com and add keys to `.env.local`
4. Start Next.js dev server: `pnpm dev`

## Production Deployment Process

### Convex Deployments

This project uses **separate Convex deployments** for dev and production:

- **Dev**: `dev:curious-salamander-943` (https://curious-salamander-943.convex.cloud)
- **Prod**: `prod:whimsical-marten-631` (https://whimsical-marten-631.convex.cloud)

**Development**: `pnpm convex dev` automatically syncs to the dev deployment only.

**Production**: Requires explicit deployment using the production deployment key.

### Deploying to Production

**CRITICAL**: Never deploy uncommitted code to production.

**Proper workflow**:

```bash
# 1. Ensure all changes are committed
git status  # Should show clean working directory

# 2. Run quality checks
pnpm typecheck  # Must pass
pnpm test --run # Must pass
pnpm build      # Must succeed

# 3. Deploy Convex functions to production
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 pnpm convex deploy -y

# 4. Deploy Next.js to Vercel (if needed)
# Usually automatic via GitHub integration
```

### Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] `git status` shows clean working directory (all changes committed)
- [ ] `pnpm typecheck` passes without errors
- [ ] `pnpm test --run` passes all tests
- [ ] `pnpm build` succeeds
- [ ] Deploy from `master` branch only (or approved PR branch)
- [ ] Review `git log` to understand what's being deployed

### Deployment Commands

**Dev deployment** (automatic during development):

```bash
pnpm convex dev  # Syncs to dev:curious-salamander-943
```

**Production deployment** (manual, from committed code):

```bash
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 pnpm convex deploy -y
```

**View production logs**:

```bash
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 pnpm convex logs --history 50
```

### Why Separate Deployments?

Separate dev and prod deployments provide:

1. **Safety**: Test changes in dev before affecting production users
2. **Isolation**: Dev experiments don't risk production data integrity
3. **Rollback**: Easy to revert production without affecting dev work

### Common Mistakes to Avoid

❌ **DO NOT**: Run `pnpm convex deploy` with uncommitted changes
❌ **DO NOT**: Skip typecheck/tests before production deployment
❌ **DO NOT**: Deploy directly from feature branches without review

✅ **DO**: Commit all changes before deploying to production
✅ **DO**: Run full test suite before deploying
✅ **DO**: Deploy from `master` branch or approved PR branches only

## Development Notes

- **Turbopack**: Development uses `--turbopack` flag for faster builds
- **TypeScript**: Strict mode enabled, use path aliases `@/*` for imports
- **Dark Mode**: Implemented via `next-themes` (see `ThemeProvider.tsx`)
- **Mobile-First**: UI is mobile-responsive (Tailwind CSS)

## Soft Delete Pattern

Exercises use soft delete (`deletedAt` timestamp) to preserve workout history when users delete exercises.

### Architecture

- **Soft Delete**: Sets `deletedAt` timestamp instead of removing record from database
- **Auto-Restore**: Creating exercise with same name automatically restores soft-deleted version
- **Filtering**: Use `includeDeleted` parameter to control visibility in queries

### Usage Guidelines

- ✅ **Always** use `deleteExercise` mutation (never `ctx.db.delete()` directly)
- ✅ **Always** use `includeDeleted` parameter in `listExercises` queries
- ✅ **History views**: Fetch with `includeDeleted: true` to show deleted exercise names
- ✅ **Active UI**: Fetch with `includeDeleted: false` for dropdowns/selectors

### Implementation Details

- **Schema**: `convex/schema.ts` - `deletedAt` field + `by_user_deleted` index
- **Backend**: `convex/exercises.ts` - soft delete mutations with auto-restore
- **Frontend**: Filter deleted exercises in components (`activeExercises` pattern)

See JSDoc in `convex/exercises.ts` for detailed auto-restore logic and data integrity rules.

## Future Enhancements

See `BACKLOG.md` for planned post-MVP features including:

- Analytics & insights (PRs, streaks, charts)
- Offline-first architecture (Dexie + sync)
- Data export/import (CSV, JSON)
- Enhanced set logging UI (RPE, notes, undo)
- Workout sessions (optional grouping)
