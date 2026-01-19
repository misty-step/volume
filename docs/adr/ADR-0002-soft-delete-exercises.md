# ADR-0002: Soft Delete for Exercises

Date: 2026-01-13
Status: accepted

## Context and Problem Statement

When users delete exercises, the system must decide what happens to historical sets referencing those exercises. Hard delete (ctx.db.delete) orphans all associated sets, causing "Unknown exercise" to appear throughout workout history.

The core tension: users want to clean up their exercise list, but also want their history to remain meaningful.

## Considered Options

### Option 1: Hard delete with cascade (not chosen)

- Pros: Clean database, no orphaned references.
- Cons: Destroys workout history permanently; users lose valuable data; violates user trust.

### Option 2: Hard delete with denormalization (not chosen)

- Pros: History preserved via exerciseName copied to each set.
- Cons: Data duplication; renaming exercises breaks history; complex sync logic.

### Option 3: Soft delete with `deletedAt` timestamp (chosen)

- Pros: Preserves referential integrity; enables restore; minimal schema change; history always accurate.
- Cons: Queries must filter deleted records; potential name collision on create.

## Decision Outcome

**Chosen**: Option 3 — Soft delete using `deletedAt` timestamp with auto-restore on duplicate name creation.

Key behaviors:
- `deleteExercise` sets `deletedAt = Date.now()` instead of removing record
- `listExercises({ includeDeleted: false })` filters deleted exercises for active UI
- `listExercises({ includeDeleted: true })` returns all exercises for history views
- Creating an exercise with the same name as a soft-deleted one **restores** the original record
- `logSet` on a soft-deleted exercise **auto-restores** it (enables undo after exercise deletion)
- Index `by_user_deleted` enables efficient active-only queries

### Why Auto-Restore?

Users often delete an exercise then later realize they want it back. Rather than requiring explicit restore, the system automatically restores when they create an exercise with the same name. This preserves the full history chain.

### Consequences

#### Good
- Workout history remains accurate indefinitely
- Users can "undo" deletion by re-creating the exercise
- Foreign key integrity maintained (exerciseId always valid)
- Enables future "trash bin" UI without schema changes

#### Bad
- All queries must explicitly handle deleted state
- Potential confusion: creating "Bench Press" restores old exercise with old muscle groups (mitigated by updating muscleGroups on restore)

#### Neutral
- Database grows slightly over time (soft-deleted records persist)
- Could add periodic cleanup of exercises with no sets if needed

## Implementation Notes

- Schema: `exercises.deletedAt: v.optional(v.number())`
- Index: `by_user_deleted: ["userId", "deletedAt"]` for efficient filtering
- Mutation: `deleteExercise` (never use `ctx.db.delete()` directly)
- Pattern: Frontend filters with `activeExercises = exercises.filter(e => !e.deletedAt)`

## References

- convex/schema.ts (deletedAt field definition)
- convex/exercises.ts (soft delete mutations, auto-restore on create)
- convex/sets.ts (auto-restore on logSet for undo support)
- CLAUDE.md (Soft Delete Pattern section)
