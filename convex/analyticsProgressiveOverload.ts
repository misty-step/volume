import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Progressive Overload Analytics
 *
 * Tracks exercise progression over time to identify strength gains,
 * plateaus, and regressions. Provides data for progressive overload
 * visualization widgets.
 */

export interface ProgressiveOverloadData {
  exerciseId: Id<"exercises">;
  exerciseName: string;
  dataPoints: Array<{
    date: string; // YYYY-MM-DD
    maxWeight: number | null;
    maxReps: number;
    volume: number;
  }>;
  trend: "improving" | "plateau" | "declining";
}

/**
 * Calculate trend direction by comparing recent vs previous workouts
 *
 * @param dataPoints - Array of workout data points sorted by date ascending
 * @returns Trend classification based on volume changes
 */
function calculateTrend(
  dataPoints: Array<{ volume: number }>
): "improving" | "plateau" | "declining" {
  if (dataPoints.length < 6) {
    // Need at least 6 workouts (3 recent + 3 previous) for trend
    return "plateau";
  }

  // Compare last 3 workouts vs previous 3 workouts
  const recent = dataPoints.slice(-3);
  const previous = dataPoints.slice(-6, -3);

  const recentAvg =
    recent.reduce((sum, d) => sum + d.volume, 0) / recent.length;
  const previousAvg =
    previous.reduce((sum, d) => sum + d.volume, 0) / previous.length;

  const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

  if (changePercent > 5) return "improving";
  if (changePercent < -5) return "declining";
  return "plateau";
}

/**
 * Get progressive overload data for user's top exercises
 *
 * Returns progression trends showing max weight, max reps, and volume
 * for each workout session. Tracks last 10 workouts per exercise.
 *
 * @param exerciseCount - Number of exercises to return (default: 5)
 * @returns Array of exercise progression data sorted by recent activity
 *
 * @example
 * ```typescript
 * const progression = await ctx.query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {
 *   exerciseCount: 5
 * });
 * ```
 */
export const getProgressiveOverloadData = query({
  args: {
    exerciseCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ProgressiveOverloadData[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const exerciseCount = args.exerciseCount ?? 5;

    // Fetch all user sets sorted by performedAt descending (most recent first)
    const allSets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    if (allSets.length === 0) {
      return [];
    }

    // Fetch all exercises for name lookup
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex.name]));

    // Group sets by exercise and track last workout date for each
    const exerciseActivity = new Map<
      Id<"exercises">,
      { lastWorkout: number; sets: typeof allSets }
    >();

    for (const set of allSets) {
      const exerciseId = set.exerciseId;
      const current = exerciseActivity.get(exerciseId);

      if (!current) {
        exerciseActivity.set(exerciseId, {
          lastWorkout: set.performedAt,
          sets: [set],
        });
      } else {
        current.sets.push(set);
        // Update lastWorkout if this set is more recent
        if (set.performedAt > current.lastWorkout) {
          current.lastWorkout = set.performedAt;
        }
      }
    }

    // Sort exercises by most recent activity
    const sortedExercises = Array.from(exerciseActivity.entries()).sort(
      ([, a], [, b]) => b.lastWorkout - a.lastWorkout
    );

    // Process each exercise to extract progression data
    const result: ProgressiveOverloadData[] = [];

    for (const [exerciseId, { sets }] of sortedExercises) {
      const exerciseName = exerciseMap.get(exerciseId);
      if (!exerciseName) continue; // Skip if exercise not found

      // Group sets by date (YYYY-MM-DD) to get distinct workouts
      const workoutsByDate = new Map<
        string,
        Array<{ reps: number; weight: number | undefined }>
      >();

      for (const set of sets) {
        // Only include rep-based sets in progressive overload tracking
        if (set.reps !== undefined) {
          const [date] = new Date(set.performedAt).toISOString().split("T");
          if (!date) continue;
          const dateKey = date as string;
          const workout = workoutsByDate.get(dateKey) || [];
          workout.push({ reps: set.reps, weight: set.weight });
          workoutsByDate.set(dateKey, workout);
        }
      }

      // Extract last 10 distinct workout dates
      const sortedDates = Array.from(workoutsByDate.keys()).sort();
      const last10Dates = sortedDates.slice(-10);

      // Calculate max weight, max reps, and volume for each workout
      const dataPoints = last10Dates.map((date) => {
        const workout = workoutsByDate.get(date)!;

        // Find max weight in this workout (null if bodyweight exercises)
        const weights = workout
          .map((s) => s.weight)
          .filter((w): w is number => w !== undefined);
        const maxWeight = weights.length > 0 ? Math.max(...weights) : null;

        // Find max reps in this workout
        const maxReps = Math.max(...workout.map((s) => s.reps));

        // Calculate total volume for this workout
        const volume = workout.reduce(
          (sum, s) => sum + s.reps * (s.weight || 0),
          0
        );

        return {
          date,
          maxWeight,
          maxReps,
          volume,
        };
      });

      // Skip exercises that only have duration-based sets (no rep workouts)
      if (dataPoints.length === 0) {
        continue;
      }

      // Calculate trend based on volume progression
      const trend = calculateTrend(dataPoints);

      result.push({
        exerciseId,
        exerciseName,
        dataPoints,
        trend,
      });

      if (result.length === exerciseCount) {
        break;
      }
    }

    return result;
  },
});
