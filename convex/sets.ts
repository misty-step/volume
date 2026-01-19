import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import {
  requireAuth,
  requireOwnership,
  validateReps,
  validateWeight,
  validateUnit,
  validateDuration,
} from "./lib/validate";

// Log a new set
export const logSet = mutation({
  args: {
    exerciseId: v.id("exercises"),
    reps: v.optional(v.number()),
    weight: v.optional(v.number()),
    unit: v.optional(v.string()), // "lbs" or "kg" - required when weight is provided
    duration: v.optional(v.number()), // Duration in seconds for time-based exercises
    performedAt: v.optional(v.number()), // Optional timestamp for undo operations
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    // Require either reps OR duration (not both, not neither)
    if (
      (args.reps === undefined && args.duration === undefined) ||
      (args.reps !== undefined && args.duration !== undefined)
    ) {
      throw new Error("Must provide either reps or duration (not both)");
    }

    // Validate inputs based on exercise type
    let reps: number | undefined;
    let duration: number | undefined;

    if (args.reps !== undefined) {
      // Rep-based exercise
      validateReps(args.reps);
      reps = args.reps;
    }

    if (args.duration !== undefined) {
      // Duration-based exercise
      duration = validateDuration(args.duration);
    }

    const weight = validateWeight(args.weight);
    validateUnit(args.unit, weight);

    // Verify exercise exists and belongs to user
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }
    requireOwnership(exercise, identity.subject, "exercise");

    // Auto-restore soft-deleted exercise (enables undo after exercise deletion)
    // Unlike createExercise, we preserve original muscleGroups
    if (exercise.deletedAt !== undefined) {
      // Prevent duplicate active exercises with same name
      const duplicateName = await ctx.db
        .query("exercises")
        .withIndex("by_user_name", (q) =>
          q.eq("userId", identity.subject).eq("name", exercise.name)
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .first();

      if (duplicateName && duplicateName._id !== args.exerciseId) {
        throw new Error(
          `Cannot restore set: an exercise named "${exercise.name}" already exists`
        );
      }

      await ctx.db.patch(args.exerciseId, { deletedAt: undefined });
    }

    const setId = await ctx.db.insert("sets", {
      userId: identity.subject,
      exerciseId: args.exerciseId,
      reps,
      weight, // Use validated/rounded weight
      unit: args.unit, // Store the unit with the set for data integrity
      duration, // Store duration in seconds for time-based exercises
      performedAt: args.performedAt ?? Date.now(),
    });

    return setId;
  },
});

// List all sets, optionally filtered by exercise
export const listSets = query({
  args: {
    exerciseId: v.optional(v.id("exercises")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let sets;

    if (args.exerciseId) {
      // Verify exercise ownership before querying sets (IDOR vulnerability fix)
      // This prevents users from accessing other users' sets by guessing exercise IDs
      const exercise = await ctx.db.get(args.exerciseId);
      requireOwnership(exercise, identity.subject, "exercise");

      // Filter by exercise
      sets = await ctx.db
        .query("sets")
        .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId!))
        .order("desc")
        .collect();
    } else {
      // Get all sets for user
      sets = await ctx.db
        .query("sets")
        .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
        .order("desc")
        .collect();
    }

    return sets;
  },
});

// List sets within a date range (for Dashboard - optimized to reduce payload)
export const listSetsForDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .filter((q) =>
        q.and(
          q.gte(q.field("performedAt"), args.startDate),
          q.lte(q.field("performedAt"), args.endDate)
        )
      )
      .order("desc")
      .collect();

    return sets;
  },
});

// List all sets with pagination (for history page)
export const listSetsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Get recent sets for a specific exercise (limited, for "last set" queries)
export const getRecentSetsForExercise = query({
  args: {
    exerciseId: v.id("exercises"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify exercise ownership (IDOR prevention)
    const exercise = await ctx.db.get(args.exerciseId);
    requireOwnership(exercise, identity.subject, "exercise");

    const limit = args.limit ?? 5;

    const sets = await ctx.db
      .query("sets")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .order("desc")
      .take(limit);

    return sets;
  },
});

// List sets for a specific exercise within a date range (for exercise detail page)
export const listSetsForExerciseDateRange = query({
  args: {
    exerciseId: v.id("exercises"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify exercise ownership (IDOR prevention)
    const exercise = await ctx.db.get(args.exerciseId);
    requireOwnership(exercise, identity.subject, "exercise");

    const sets = await ctx.db
      .query("sets")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .filter((q) =>
        q.and(
          q.gte(q.field("performedAt"), args.startDate),
          q.lte(q.field("performedAt"), args.endDate)
        )
      )
      .order("desc")
      .collect();

    return sets;
  },
});

// Get all-time stats for an exercise (computed without returning all sets)
export const getExerciseAllTimeStats = query({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Verify exercise ownership (IDOR prevention)
    const exercise = await ctx.db.get(args.exerciseId);
    requireOwnership(exercise, identity.subject, "exercise");

    const sets = await ctx.db
      .query("sets")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .collect();

    if (sets.length === 0) {
      return {
        totalSets: 0,
        totalReps: 0,
        totalDuration: 0,
        uniqueDays: 0,
        firstSetAt: null,
        lastSetAt: null,
        bestRepSet: null,
        bestWeightSet: null,
        bestDurationSet: null,
      };
    }

    let totalReps = 0;
    let totalDuration = 0;
    const uniqueDays = new Set<string>();
    // We checked sets.length > 0 above, so first set exists
    const firstSet = sets[0]!;
    let firstSetAt = firstSet.performedAt;
    let lastSetAt = firstSet.performedAt;
    let bestRepSet: (typeof sets)[0] | null = null;
    let bestWeightSet: (typeof sets)[0] | null = null;
    let bestDurationSet: (typeof sets)[0] | null = null;

    for (const set of sets) {
      // Track dates
      const dayKey = new Date(set.performedAt).toDateString();
      uniqueDays.add(dayKey);

      if (set.performedAt < firstSetAt) firstSetAt = set.performedAt;
      if (set.performedAt > lastSetAt) lastSetAt = set.performedAt;

      // Sum totals
      if (set.reps !== undefined) {
        totalReps += set.reps;
        if (!bestRepSet || set.reps > (bestRepSet.reps ?? 0)) {
          bestRepSet = set;
        }
      }

      if (set.duration !== undefined) {
        totalDuration += set.duration;
        if (
          !bestDurationSet ||
          set.duration > (bestDurationSet.duration ?? 0)
        ) {
          bestDurationSet = set;
        }
      }

      if (set.weight !== undefined) {
        if (!bestWeightSet || set.weight > (bestWeightSet.weight ?? 0)) {
          bestWeightSet = set;
        }
      }
    }

    return {
      totalSets: sets.length,
      totalReps,
      totalDuration,
      uniqueDays: uniqueDays.size,
      firstSetAt,
      lastSetAt,
      bestRepSet,
      bestWeightSet,
      bestDurationSet,
    };
  },
});

// Delete a set
export const deleteSet = mutation({
  args: {
    id: v.id("sets"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const set = await ctx.db.get(args.id);
    requireOwnership(set, identity.subject, "set");

    await ctx.db.delete(args.id);
  },
});
