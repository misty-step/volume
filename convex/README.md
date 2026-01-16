# convex/

Convex backend: real-time database, auth, and server functions.

## Entry Points

| File | Purpose |
|------|---------|
| `schema.ts` | Database schema (exercises, sets, users, aiReports, rateLimits, platformStatsCache) |
| `exercises.ts` | CRUD for exercises (soft delete, AI muscle classification) |
| `sets.ts` | Log/query workout sets (reps, weight, duration) |
| `users.ts` | User profile + subscription status |
| `analytics.ts` | Aggregated metrics (volume, frequency, streaks, PRs) |
| `subscriptions.ts` | Stripe webhook handlers |

## Query/Mutation Conventions

All mutations verify ownership before writes. Pattern:
```typescript
const identity = await requireAuth(ctx);
requireOwnership(record, identity.subject);
```

## Subdirectories

### ai/

AI report generation (OpenAI). Two versions:
- v1: Markdown reports (`generate.ts`, `openai.ts`, `prompts.ts`)
- v2: Structured JSON reports (`generateV2.ts`, `openaiV2.ts`, `reportV2Schema.ts`)

Entry: `reports.ts` (public queries/actions)

### lib/

Internal utilities. Not imported by frontend.
- `validate.ts` - Input validation + auth guards
- `rateLimit.ts` - Per-user rate limiting
- `streak_calculator.ts` - Workout streak detection
- `pr_detection.ts` - Personal record detection
- `muscleGroups.ts` - Valid muscle group constants

### migrations/

One-time data migrations. Run via Convex dashboard.

## Testing

```bash
pnpm test convex/
```

Each domain file has a `.test.ts` companion.
