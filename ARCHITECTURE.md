# Architecture

Volume is a workout tracker: exercises in, sets out, insights generated. This document maps the system's shape.

## Three Domains

```text
Browser (Next.js)  <-->  Convex Cloud  <-->  External Services
     |                        |                    |
  UI + State              Data + Logic         AI + Payments
```

### 1. Frontend (`src/`)

React components render state; hooks encapsulate behavior. No business logic lives here.

| Directory | Owns | Does NOT Own |
|-----------|------|--------------|
| `app/` | Routes, layouts, pages | Data fetching logic |
| `components/` | UI primitives, composed views | Business rules |
| `hooks/` | Derived state, form logic | Persistence |
| `lib/` | Pure utilities (dates, math, analytics) | Side effects |

**Entry points:**
- `app/(app)/page.tsx` - Dashboard (log workout)
- `app/(app)/history/page.tsx` - Set history
- `app/(app)/exercises/page.tsx` - Exercise management

**Deep module:** `useQuickLogForm` - rich behavior behind simple interface (reps, weight, suggestions).

### 2. Backend (`convex/`)

Convex functions own all data mutations. Every user action flows through here.

| File | Owns | Interface |
|------|------|-----------|
| `schema.ts` | Data shapes, indexes | Single source of truth |
| `exercises.ts` | CRUD + soft delete + muscle groups | `create`, `list`, `delete` |
| `sets.ts` | Logging + validation | `logSet`, `listSets`, `deleteSet` |
| `users.ts` | Profile + preferences + subscriptions | `get`, `update`, `getSubscriptionStatus` |
| `analytics.ts` | Weekly aggregation, AI reports | Scheduled cron |
| `crons.ts` | Scheduled jobs | Automatic |
| `http.ts` | Stripe webhooks | POST handlers |

**Security pattern:** Every mutation verifies auth (`ctx.auth.getUserIdentity()`) and ownership before write.

**Deep module:** `analytics.ts` - computes PRs, streaks, volume from raw sets; generates AI insights.

### 3. External Services

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| Clerk | Auth, user management | Middleware + Convex auth |
| OpenAI | Muscle group classification, reports | `convex/ai/` actions |
| Stripe | Payments, subscriptions | `convex/http.ts` webhooks |
| Sentry | Error tracking | Client + server configs |
| Vercel Analytics | Product metrics | `lib/analytics.ts` |

## Data Flow

```text
User logs set
     |
     v
[useQuickLogForm] --> [sets.logSet mutation]
     |                         |
     v                         v
Form validation         Auth + ownership check
     |                         |
     v                         v
Optimistic UI           Write to Convex DB
     |                         |
     v                         v
Real-time update <---- Subscription pushes change
```

**Where data enters:** Browser forms, webhook POSTs
**Where data exits:** React queries, AI report generation, Stripe sync

## Key Patterns

### Soft Delete (exercises)
Exercises are never hard-deleted. `deletedAt` timestamp hides from UI while preserving history. Creating an exercise with the same name auto-restores the soft-deleted version.

### Rate Limiting
`rateLimits` table + `assertRateLimit` helper. Fixed-window counters prevent AI endpoint abuse. See [ADR-0001](docs/adr/ADR-0001-rate-limits.md).

### Subscription Gating
`PaywallGate` component + `getSubscriptionStatus` query. Trial users get 14 days; expired users see upgrade prompt. Stripe webhooks keep status in sync.

### Real-time Sync
Convex queries automatically subscribe to changes. No manual polling or cache invalidation.

## Shallow Modules (use carefully)

| Module | Why It's Shallow | Mitigation |
|--------|------------------|------------|
| `lib/analytics.ts` | Large interface, many event types | Use typed helpers |
| `convex/crons.ts` | Growing list of jobs | Document each job's purpose |
| `components/ui/` | Thin wrappers over shadcn | Accept as intentional pass-through |

## Where to Start Reading

1. **Schema first:** `convex/schema.ts` - understand the data
2. **Mutations second:** `convex/sets.ts`, `convex/exercises.ts` - understand the operations
3. **UI third:** `src/app/(app)/page.tsx` - see how it connects
