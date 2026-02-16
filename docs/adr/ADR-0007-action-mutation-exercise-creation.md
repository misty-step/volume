# ADR-0007: Action-Mutation Split for Exercise Creation

Date: 2026-01-13
Status: accepted

## Context and Problem Statement

Exercise creation requires AI classification (calling an LLM via OpenRouter to determine muscle groups). Convex mutations cannot make external HTTP calls or use timers. The system needs to combine AI enrichment with database operations.

## Considered Options

### Option 1: Pure mutation, AI on frontend (not chosen)

- Pros: Simple backend; mutation handles only DB.
- Cons: Exposes OpenRouter key to client; client must coordinate two calls; race conditions.

### Option 2: Pure action with db writes (not possible)

Actions cannot perform direct database writes in Convex. Not viable.

### Option 3: Action orchestrating internal mutation (chosen)

- Pros: AI and DB in single user-facing call; OpenRouter key stays on server; atomic from user perspective.
- Cons: Two-phase internally; slightly more complex; action cannot be retried automatically.

## Decision Outcome

**Chosen**: Option 3 — Public action orchestrates AI + internal mutation.

### Architecture

```typescript
// Public action (user-facing)
export const createExercise = action({
  handler: async (ctx, args) => {
    // 1. Rate limit check
    await ctx.runMutation(internal.rateLimit.check, {...});

    // 2. AI classification
    let muscleGroups = ["Other"];
    try {
      muscleGroups = await classifyExercise(args.name);
    } catch {
      // Continue with default — never fail due to AI
    }

    // 3. Database operation
    return await ctx.runMutation(internal.exercises.createExerciseInternal, {
      name: args.name,
      muscleGroups,
    });
  }
});

// Internal mutation (database only)
export const createExerciseInternal = internalMutation({
  handler: async (ctx, args) => {
    // Handle duplicates, soft-delete restore, insert
    return await ctx.db.insert("exercises", {...});
  }
});
```

### Key Design Decisions

**AI Never Blocks Creation**: If the LLM call fails, exercise is created with `["Other"]` muscle groups. Users can edit later. This prevents AI outages from breaking core functionality.

**Rate Limiting via Internal Mutation**: Actions cannot directly access rate limit table. The action calls an internal mutation to check/update rate limits, ensuring atomic rate limit enforcement.

**Separation of Concerns**:

- Action: orchestration, AI calls, error handling
- Internal Mutation: database operations, duplicate checking, soft-delete restore

### Consequences

#### Good

- Single user-facing call for complete operation
- AI keys never leave server
- AI failures don't block exercise creation
- Clean separation: AI logic vs DB logic

#### Bad

- Slightly more complex than pure mutation
- If action crashes after AI but before mutation, AI call is wasted (rare)

#### Neutral

- Pattern reused for other AI-enriched operations (reports, etc.)

## Implementation Notes

- Public action: `convex/exercises.ts` (createExercise)
- Internal mutation: `convex/exercises.ts` (createExerciseInternal)
- AI classification: `convex/ai/classify.ts` (classifyExercise)
- OpenRouter client: `convex/lib/openrouter.ts`
- Rate limiting: `convex/lib/rateLimit.ts`

## References

- convex/exercises.ts (action + mutation pattern)
- convex/ai/classify.ts (LLM classification)
- convex/lib/openrouter.ts (OpenRouter integration)
- Convex docs: Actions vs Mutations
