import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  requireAuth,
  requireOwnership,
  validateExerciseName,
} from "./lib/validate";
import { classifyExercise } from "./ai/classify";
import { getLimits } from "./lib/rateLimit";
import { filterValidMuscleGroups } from "./lib/muscleGroups";

/**
 * Create a new exercise (action-based)
 *
 * Orchestrates AI classification and database operations.
 * Uses action pattern to allow OpenAI SDK calls (which use setTimeout).
 *
 * Flow:
 * 1. Validate exercise name
 * 2. Classify muscle groups via OpenAI (fallback to ["Other"] on error)
 * 3. Call internal mutation for database operations
 */
export const createExercise = action({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"exercises">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Rate limit: per-user exercise creation (via internal mutation for action context)
    const limits = getLimits();
    const exerciseLimit = limits["exercise:create"];
    if (!exerciseLimit) {
      throw new Error("Rate limit configuration missing for exercise:create");
    }
    await ctx.runMutation(internal.lib.rateLimit.checkRateLimitInternal, {
      userId: identity.subject,
      scope: "exercise:create",
      limit: exerciseLimit.limit,
      windowMs: exerciseLimit.windowMs,
    });

    // Validate and normalize exercise name
    const normalizedName = validateExerciseName(args.name);

    // Classify exercise with GPT-5-nano (fallback to ["Other"] on error)
    let muscleGroups: string[] = ["Other"];
    try {
      muscleGroups = await classifyExercise(normalizedName);
      console.log(
        `[Exercise] Classified "${normalizedName}" → ${muscleGroups.join(", ")}`
      );
    } catch (error) {
      console.error(
        `[Exercise] Classification failed for "${normalizedName}":`,
        error
      );
      // Continue with default ["Other"] - exercise creation never fails due to AI
    }

    // Call internal mutation for database operations
    const exerciseId = await ctx.runMutation(
      internal.exercises.createExerciseInternal,
      {
        userId: identity.subject,
        name: normalizedName,
        muscleGroups,
      }
    );

    return exerciseId;
  },
});

/**
 * Internal mutation for database operations only
 *
 * Called by createExercise action after AI classification.
 * Handles duplicate checking, soft-delete restore, and DB insert.
 *
 * @param userId - Clerk user ID
 * @param name - Normalized exercise name
 * @param muscleGroups - AI-classified muscle groups
 * @returns Exercise ID
 */
export const createExerciseInternal = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    muscleGroups: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"exercises">> => {
    // Check for duplicate (including soft-deleted) - case-insensitive
    const allUserExercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const existing = allUserExercises.find(
      (e) => e.name.toLowerCase() === args.name.toLowerCase()
    );

    if (existing) {
      // If soft-deleted, restore it instead of creating new
      if (existing.deletedAt !== undefined) {
        // Defensive check: Verify no active duplicate exists before restoring
        // (protects against DB corruption or manual state manipulation)
        const activeDuplicate = allUserExercises.find(
          (e) =>
            e._id !== existing._id &&
            e.name.toLowerCase() === args.name.toLowerCase() &&
            e.deletedAt === undefined
        );

        if (activeDuplicate) {
          throw new Error("Exercise with this name already exists");
        }

        // Restore with updated muscle groups
        await ctx.db.patch(existing._id, {
          deletedAt: undefined,
          muscleGroups: args.muscleGroups,
        });

        return existing._id; // Return restored exercise ID
      }

      // Active duplicate - still an error
      throw new Error("Exercise with this name already exists");
    }

    // No existing record - create new
    const exerciseId = await ctx.db.insert("exercises", {
      userId: args.userId,
      name: args.name,
      muscleGroups: args.muscleGroups,
      createdAt: Date.now(),
    });

    return exerciseId;
  },
});

// Get a single exercise by ID
export const getExercise = query({
  args: {
    id: v.id("exercises"),
  },
  handler: async (ctx, args): Promise<Doc<"exercises"> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const exercise = await ctx.db.get(args.id);
    if (!exercise) {
      return null;
    }

    // Verify ownership (return null if not owned, not error - for graceful UI)
    if (exercise.userId !== identity.subject) {
      return null;
    }

    return exercise;
  },
});

// List all exercises for the current user
export const listExercises = query({
  args: {
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Doc<"exercises">[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let exercises: Doc<"exercises">[];

    if (args.includeDeleted) {
      // Include all exercises (active + deleted)
      exercises = await ctx.db
        .query("exercises")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .collect();
      // Sort by createdAt descending (consistent with active-only branch)
      exercises.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      // Active exercises only (default)
      exercises = await ctx.db
        .query("exercises")
        .withIndex("by_user_deleted", (q) =>
          q.eq("userId", identity.subject).eq("deletedAt", undefined)
        )
        .collect();
      // Sort by createdAt descending (newest first)
      // Note: Cannot use .order("desc") on compound index as it sorts by index fields
      exercises.sort((a, b) => b.createdAt - a.createdAt);
    }

    return exercises;
  },
});

// Update an exercise
export const updateExercise = mutation({
  args: {
    id: v.id("exercises"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    // Validate and normalize exercise name
    const normalizedName = validateExerciseName(args.name);

    // Verify exercise exists and user owns it
    const exercise = await ctx.db.get(args.id);
    if (!exercise) {
      throw new Error("Exercise not found");
    }
    requireOwnership(exercise, identity.subject, "exercise");

    // Prevent editing deleted exercises
    if (exercise.deletedAt !== undefined) {
      throw new Error("Cannot update a deleted exercise");
    }

    // Check for duplicate (excluding current exercise) - case-insensitive
    const allUserExercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const existing = allUserExercises.find(
      (e) =>
        e._id !== args.id &&
        e.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (existing) {
      throw new Error("Exercise with this name already exists");
    }

    await ctx.db.patch(args.id, {
      name: normalizedName,
    });
  },
});

/**
 * Delete an exercise (soft delete)
 *
 * IMPORTANT: Always use this mutation instead of ctx.db.delete() to maintain
 * referential integrity. Hard deleting exercises orphans all associated sets,
 * causing "Unknown exercise" to appear in history. Soft delete preserves
 * exercise records for historical context while hiding them from active use.
 *
 * See also: createExercise (auto-restore logic), restoreExercise (explicit restore)
 */
export const deleteExercise = mutation({
  args: {
    id: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const exercise = await ctx.db.get(args.id);
    requireOwnership(exercise, identity.subject, "exercise");

    // Soft delete: Set deletedAt timestamp instead of removing record
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
    });
  },
});

// Restore a soft-deleted exercise
export const restoreExercise = mutation({
  args: {
    id: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const exercise = await ctx.db.get(args.id);
    requireOwnership(exercise, identity.subject, "exercise");

    if (!exercise) {
      throw new Error("Exercise not found");
    }

    // Only restore if actually deleted
    if (exercise.deletedAt === undefined) {
      throw new Error("Exercise is not deleted");
    }

    // Clear deletedAt timestamp
    await ctx.db.patch(args.id, {
      deletedAt: undefined,
    });
  },
});

/**
 * Update exercise muscle groups
 *
 * Allows users to override AI classification if incorrect.
 * Useful for custom exercises or when AI misclassifies.
 */
export const updateMuscleGroups = mutation({
  args: {
    id: v.id("exercises"),
    muscleGroups: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const exercise = await ctx.db.get(args.id);
    if (!exercise) {
      throw new Error("Exercise not found");
    }
    requireOwnership(exercise, identity.subject, "exercise");

    // Prevent editing deleted exercises
    if (exercise.deletedAt !== undefined) {
      throw new Error("Cannot update a deleted exercise");
    }

    // Validate: filter to canonical muscle groups only (defense in depth)
    const validated = filterValidMuscleGroups(args.muscleGroups);

    await ctx.db.patch(args.id, {
      muscleGroups: validated,
    });
  },
});
