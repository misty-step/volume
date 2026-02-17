import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { classifyExercise } from "../ai/classify";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

/**
 * Backfill muscle groups for existing exercises
 *
 * One-time migration to classify all exercises that don't have muscleGroups.
 * Uses the OpenRouter classification model to classify exercises.
 *
 * Usage:
 * ```bash
 * pnpm convex run migrations:backfillMuscleGroups
 * ```
 *
 * Safety:
 * - Only updates exercises without muscleGroups (idempotent)
 * - Graceful error handling (logs errors, continues with next exercise)
 * - Returns summary of processed/failed exercises
 */

// Internal query to list all exercises (no auth required for migrations)
export const listAllExercises = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"exercises">[]> => {
    return await ctx.db.query("exercises").collect();
  },
});

// Internal mutation to update muscle groups (no auth required for migrations)
export const updateExerciseMuscleGroups = internalMutation({
  args: {
    exerciseId: v.id("exercises"),
    muscleGroups: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.exerciseId, {
      muscleGroups: args.muscleGroups,
    });
  },
});

// Main migration action
export const backfillMuscleGroups = internalAction({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    total: number;
    processed: number;
    failed: number;
    skipped: number;
  }> => {
    console.log("[Migration] Starting muscle groups backfill...");

    // Fetch all exercises
    const exercises: Doc<"exercises">[] = await ctx.runQuery(
      internal.migrations.backfillMuscleGroups.listAllExercises
    );
    console.log(`[Migration] Found ${exercises.length} total exercises`);

    // Filter exercises without muscleGroups OR with ["Other"] (failed previous classification)
    const missingMuscleGroups = exercises.filter(
      (ex: Doc<"exercises">) =>
        !ex.muscleGroups ||
        (ex.muscleGroups.length === 1 && ex.muscleGroups[0] === "Other")
    );
    console.log(
      `[Migration] ${missingMuscleGroups.length} exercises need classification`
    );

    if (missingMuscleGroups.length === 0) {
      console.log("[Migration] No exercises to backfill. Done!");
      return {
        total: exercises.length,
        processed: 0,
        failed: 0,
        skipped: exercises.length,
      };
    }

    // Process each exercise
    let processed = 0;
    let failed = 0;

    for (const exercise of missingMuscleGroups) {
      try {
        console.log(`[Migration] Classifying "${exercise.name}"...`);
        const muscleGroups = await classifyExercise(exercise.name);

        await ctx.runMutation(
          internal.migrations.backfillMuscleGroups.updateExerciseMuscleGroups,
          {
            exerciseId: exercise._id,
            muscleGroups,
          }
        );

        console.log(
          `[Migration] ✓ "${exercise.name}" → ${muscleGroups.join(", ")}`
        );
        processed++;
      } catch (error) {
        console.error(
          `[Migration] ✗ Failed to classify "${exercise.name}":`,
          error
        );
        failed++;
      }
    }

    const summary = {
      total: exercises.length,
      processed,
      failed,
      skipped: exercises.length - missingMuscleGroups.length,
    };

    console.log("[Migration] Complete!");
    console.log(
      `[Migration] Processed: ${processed}, Failed: ${failed}, Skipped: ${summary.skipped}`
    );

    return summary;
  },
});
