# convex/

Convex backend: real-time database, auth, and server functions.

## Entry Points

| File               | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `schema.ts`        | Database schema (exercises, sets, users, aiReports, rateLimits, platformStatsCache) |
| `exercises.ts`     | CRUD for exercises (soft delete, AI muscle classification)                          |
| `sets.ts`          | Log/query workout sets (reps, weight, duration)                                     |
| `users.ts`         | User profile + subscription status                                                  |
| `analytics.ts`     | Aggregated metrics (volume, frequency, streaks, PRs)                                |
| `subscriptions.ts` | Stripe webhook handlers                                                             |

## Query/Mutation Conventions

All mutations verify ownership before writes. Pattern:

```typescript
const identity = await requireAuth(ctx);
requireOwnership(record, identity.subject);
```

## Subdirectories

### ai/

AI report generation via OpenRouter (MiniMax M2.5).

- `reports.ts` - Public queries/actions (entry point)
- `generate.ts` - Report orchestration
- `llm.ts` - LLM API integration
- `prompts.ts` - System/user prompts
- `data.ts` - Data access layer
- `reportSchema.ts` - Zod schemas
- `classify.ts` - Exercise classification

### lib/

Internal utilities. Not imported by frontend.

- `validate.ts` - Input validation + auth guards
- `rateLimit.ts` - Per-user rate limiting
- `muscleGroups.ts` - Valid muscle group constants

### migrations/

One-time data migrations. Run via Convex dashboard.

## Testing

```bash
bun run test convex/
```

Each domain file has a `.test.ts` companion.
