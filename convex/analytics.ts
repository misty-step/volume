import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateTotalWorkouts,
} from "./lib/streak_calculator";
import { checkForPR, PRType } from "./lib/pr_detection";

/**
 * Analytics queries for workout metrics
 *
 * These queries aggregate workout data to provide insights on volume,
 * frequency, streaks, and personal records.
 */

export interface VolumeByExercise {
  exerciseId: string;
  exerciseName: string;
  totalVolume: number;
  sets: number;
}

/**
 * Get total volume by exercise
 *
 * Calculates total volume (reps × weight) for each exercise within a date range.
 * Volume represents total work performed and is a key metric for tracking
 * progressive overload and training intensity.
 *
 * @param startDate - Optional Unix timestamp (ms) for range start
 * @param endDate - Optional Unix timestamp (ms) for range end
 * @returns Array of exercises with total volume and set count, sorted by volume descending
 *
 * @example
 * ```typescript
 * // Get all-time volume
 * const allTime = await ctx.query(api.analytics.getVolumeByExercise, {});
 *
 * // Get last 30 days
 * const last30Days = await ctx.query(api.analytics.getVolumeByExercise, {
 *   startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
 * });
 * ```
 */
export const getVolumeByExercise = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Query all user's sets using the by_user_performed index for efficient filtering
    let setsQuery = ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject));

    // Apply date range filters if provided
    if (args.startDate !== undefined) {
      setsQuery = setsQuery.filter((q) =>
        q.gte(q.field("performedAt"), args.startDate!)
      );
    }
    if (args.endDate !== undefined) {
      setsQuery = setsQuery.filter((q) =>
        q.lte(q.field("performedAt"), args.endDate!)
      );
    }

    const sets = await setsQuery.collect();

    // Fetch all exercises for the user (including deleted for history display)
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Create exercise lookup map
    const exerciseMap = new Map(
      exercises.map((ex) => [
        ex._id,
        { name: ex.name, deleted: ex.deletedAt !== undefined },
      ])
    );

    // Aggregate volume by exercise
    const volumeByExercise = new Map<
      string,
      { exerciseName: string; totalVolume: number; sets: number }
    >();

    for (const set of sets) {
      const exercise = exerciseMap.get(set.exerciseId);
      if (!exercise) continue; // Skip sets for non-existent exercises

      const exerciseId = set.exerciseId;
      const current = volumeByExercise.get(exerciseId) || {
        exerciseName: exercise.name,
        totalVolume: 0,
        sets: 0,
      };

      // Calculate volume: reps × weight (bodyweight exercises have weight=0 or undefined)
      // Only count volume for rep-based exercises
      const volume = set.reps !== undefined ? set.reps * (set.weight || 0) : 0;

      volumeByExercise.set(exerciseId, {
        exerciseName: current.exerciseName,
        totalVolume: current.totalVolume + volume,
        sets: current.sets + 1,
      });
    }

    // Convert to array and sort by total volume descending
    const result: VolumeByExercise[] = Array.from(
      volumeByExercise.entries()
    ).map(([exerciseId, data]) => ({
      exerciseId,
      exerciseName: data.exerciseName,
      totalVolume: data.totalVolume,
      sets: data.sets,
    }));

    result.sort((a, b) => b.totalVolume - a.totalVolume);

    return result;
  },
});

export interface WorkoutFrequency {
  date: string; // YYYY-MM-DD format
  setCount: number;
  totalVolume: number;
}

/**
 * Get workout frequency data for heatmap visualization
 *
 * Returns daily workout activity for the last N days, including zero-count days
 * to create a continuous date range suitable for calendar heatmap rendering.
 *
 * @param days - Number of days to include (e.g., 365 for full year)
 * @returns Array of daily workout data with continuous date range
 *
 * @example
 * ```typescript
 * // Get last year for GitHub-style heatmap
 * const frequency = await ctx.query(api.analytics.getWorkoutFrequency, {
 *   days: 365,
 * });
 * ```
 */
export const getWorkoutFrequency = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Calculate start date (N days ago from today)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - args.days);
    startDate.setHours(0, 0, 0, 0);

    // Query sets from start date onwards
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.gte(q.field("performedAt"), startDate.getTime()))
      .collect();

    // Group sets by calendar day
    const dailyData = new Map<
      string,
      { setCount: number; totalVolume: number }
    >();

    for (const set of sets) {
      const setDate = new Date(set.performedAt);
      const dayKey = setDate.toISOString().split("T")[0]; // YYYY-MM-DD

      const current = dailyData.get(dayKey) || { setCount: 0, totalVolume: 0 };
      // Only count volume for rep-based exercises
      const volume = set.reps !== undefined ? set.reps * (set.weight || 0) : 0;

      dailyData.set(dayKey, {
        setCount: current.setCount + 1,
        totalVolume: current.totalVolume + volume,
      });
    }

    // Fill gaps with zero days to create continuous range
    const result: WorkoutFrequency[] = [];
    const currentDate = new Date(startDate);
    const endDate = new Date(now);
    endDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dayKey = currentDate.toISOString().split("T")[0];
      const data = dailyData.get(dayKey) || { setCount: 0, totalVolume: 0 };

      result.push({
        date: dayKey,
        setCount: data.setCount,
        totalVolume: data.totalVolume,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  },
});

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
}

/**
 * Get streak statistics
 *
 * Calculates current streak, longest streak ever achieved, and total
 * number of unique workout days.
 *
 * @returns Streak statistics
 *
 * @example
 * ```typescript
 * const stats = await ctx.query(api.analytics.getStreakStats, {});
 * // { currentStreak: 7, longestStreak: 30, totalWorkouts: 156 }
 * ```
 */
export const getStreakStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
      };
    }

    // Fetch all user's sets for streak calculation
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .collect();

    // Calculate all streak metrics
    const currentStreak = calculateCurrentStreak(sets);
    const longestStreak = calculateLongestStreak(sets);
    const totalWorkouts = calculateTotalWorkouts(sets);

    return {
      currentStreak,
      longestStreak,
      totalWorkouts,
    };
  },
});

export interface RecentPR {
  setId: string;
  exerciseId: string;
  exerciseName: string;
  prType: PRType;
  currentValue: number;
  previousValue: number;
  improvement: number;
  performedAt: number;
  reps: number;
  weight?: number;
}

/**
 * Get recent personal records
 *
 * Returns all PRs achieved in the last N days, including exercise names
 * and improvement details for celebration.
 *
 * @param days - Number of days to look back (e.g., 7, 30)
 * @returns Array of recent PRs sorted by date descending
 *
 * @example
 * ```typescript
 * // Get PRs from last 30 days
 * const prs = await ctx.query(api.analytics.getRecentPRs, { days: 30 });
 * ```
 */
export const getRecentPRs = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Calculate cutoff date
    const cutoffDate = Date.now() - args.days * 24 * 60 * 60 * 1000;

    // Query all user's sets (we need all for PR comparison)
    const allSets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .collect();

    // Query sets from the target period
    const recentSets = allSets.filter((s) => s.performedAt >= cutoffDate);

    // Fetch all exercises for name lookup
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex.name]));

    // Group all sets by exercise for PR detection
    const setsByExercise = new Map<string, typeof allSets>();
    for (const set of allSets) {
      const exerciseSets = setsByExercise.get(set.exerciseId) || [];
      exerciseSets.push(set);
      setsByExercise.set(set.exerciseId, exerciseSets);
    }

    // Check each recent set for PRs
    const prs: RecentPR[] = [];

    for (const currentSet of recentSets) {
      const exerciseSets = setsByExercise.get(currentSet.exerciseId) || [];

      // Get all sets before this one for PR comparison
      const previousSets = exerciseSets.filter(
        (s) => s.performedAt < currentSet.performedAt
      );

      const prResult = checkForPR(currentSet, previousSets);

      if (prResult) {
        const exerciseName = exerciseMap.get(currentSet.exerciseId);
        if (!exerciseName) continue; // Skip if exercise not found

        // checkForPR only returns non-null for rep-based exercises
        if (currentSet.reps === undefined) continue;

        prs.push({
          setId: currentSet._id,
          exerciseId: currentSet.exerciseId,
          exerciseName,
          prType: prResult.type,
          currentValue: prResult.currentValue,
          previousValue: prResult.previousValue,
          improvement: prResult.currentValue - prResult.previousValue,
          performedAt: currentSet.performedAt,
          reps: currentSet.reps,
          weight: currentSet.weight,
        });
      }
    }

    // Sort by date descending (most recent first)
    prs.sort((a, b) => b.performedAt - a.performedAt);

    return prs;
  },
});
