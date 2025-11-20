import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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

    // Block logging sets for soft-deleted exercises
    if (exercise.deletedAt !== undefined) {
      throw new Error("Cannot log sets for a deleted exercise");
    }

    const setId = await ctx.db.insert("sets", {
      userId: identity.subject,
      exerciseId: args.exerciseId,
      reps,
      weight, // Use validated/rounded weight
      unit: args.unit, // Store the unit with the set for data integrity
      duration, // Store duration in seconds for time-based exercises
      performedAt: Date.now(),
    });

    // Track analytics event
    await ctx.scheduler.runAfter(0, internal.analytics.track, {
      name: "Set Logged",
      properties: {
        setId,
        exerciseId: args.exerciseId,
        userId: identity.subject,
        reps: reps || 0,
        weight: weight,
      },
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
