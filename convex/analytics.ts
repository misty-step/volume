import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateTotalWorkouts,
} from "../packages/core/src/streak";
import { checkForPR } from "../packages/core/src/pr-detection";
import type { PRType } from "../packages/core/src/types";
import {
  MUSCLE_GROUPS,
  type MuscleGroup,
} from "../packages/core/src/muscle-groups";
import type { RecoveryStatus } from "./analyticsRecovery";
import type { FocusSuggestion, SuggestionPriority } from "./analyticsFocus";

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
      const [dayKey] = setDate.toISOString().split("T"); // YYYY-MM-DD
      if (!dayKey) continue;

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
      const [dayKey] = currentDate.toISOString().split("T");
      if (!dayKey) break;
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

// ============================================================================
// COMPOSITE DASHBOARD QUERY
// ============================================================================

/**
 * Dashboard Analytics Response
 *
 * Single query that returns all analytics data for the dashboard.
 * Fetches data once and derives all metrics - 85% reduction in DB reads.
 */
export interface DashboardAnalytics {
  frequency: WorkoutFrequency[];
  streakStats: StreakStats;
  recentPRs: RecentPR[];
  recovery: RecoveryData[];
  focusSuggestions: FocusSuggestion[];
  progressiveOverload: ProgressiveOverloadData[];
  firstWorkoutDate: string | null;
}

export interface RecoveryData {
  muscleGroup: MuscleGroup;
  lastTrainedDate: string | null;
  daysSince: number;
  volumeLast7Days: number;
  frequencyLast7Days: number;
  status: RecoveryStatus;
}

export interface ProgressiveOverloadData {
  exerciseId: Id<"exercises">;
  exerciseName: string;
  dataPoints: Array<{
    date: string;
    maxWeight: number | null;
    maxReps: number;
    volume: number;
  }>;
  trend: "improving" | "plateau" | "declining";
}

/**
 * Get all dashboard analytics in a single query
 *
 * Deep module: simple interface, complex implementation hidden inside.
 * Fetches sets + exercises ONCE, then derives all metrics.
 *
 * @returns Complete analytics data for dashboard rendering
 */
export const getDashboardAnalytics = query({
  args: {},
  handler: async (ctx): Promise<DashboardAnalytics> => {
    const identity = await ctx.auth.getUserIdentity();

    // Unauthenticated defaults
    if (!identity) {
      return {
        frequency: [],
        streakStats: { currentStreak: 0, longestStreak: 0, totalWorkouts: 0 },
        recentPRs: [],
        recovery: [],
        focusSuggestions: [],
        progressiveOverload: [],
        firstWorkoutDate: null,
      };
    }

    const userId = identity.subject;
    const now = Date.now();

    // =========================================================================
    // SINGLE DATA FETCH - The key optimization
    // =========================================================================
    const [allSets, exercises] = await Promise.all([
      ctx.db
        .query("sets")
        .withIndex("by_user_performed", (q) => q.eq("userId", userId))
        .order("desc")
        .collect(),
      ctx.db
        .query("exercises")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    // Build lookup maps once
    const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex]));
    const activeExercises = exercises.filter(
      (ex) => ex.deletedAt === undefined
    );

    // =========================================================================
    // DERIVE ALL METRICS FROM SINGLE FETCH
    // =========================================================================

    // 1. First workout date (earliest set - sets are sorted desc, so last is oldest)
    const earliestSet = allSets[allSets.length - 1];
    const firstWorkoutDate = earliestSet
      ? (new Date(earliestSet.performedAt).toISOString().split("T")[0] ?? null)
      : null;

    // 2. Streak stats (uses pure functions)
    const streakStats: StreakStats = {
      currentStreak: calculateCurrentStreak(allSets),
      longestStreak: calculateLongestStreak(allSets),
      totalWorkouts: calculateTotalWorkouts(allSets),
    };

    // 3. Workout frequency (last 365 days for heatmap)
    const frequency = calculateFrequency(allSets, 365, now);

    // 4. Recent PRs (last 30 days)
    const recentPRs = calculateRecentPRs(allSets, exerciseMap, 30, now);

    // 5. Recovery status
    const recovery = calculateRecovery(allSets, exerciseMap, now);

    // 6. Focus suggestions
    const focusSuggestions = calculateFocusSuggestions(
      allSets,
      activeExercises,
      exerciseMap,
      now
    );

    // 7. Progressive overload (top 5 exercises)
    const progressiveOverload = calculateProgressiveOverload(
      allSets,
      exerciseMap,
      5
    );

    return {
      frequency,
      streakStats,
      recentPRs,
      recovery,
      focusSuggestions,
      progressiveOverload,
      firstWorkoutDate,
    };
  },
});

// ============================================================================
// PURE CALCULATION FUNCTIONS (Information hiding - internal implementation)
// ============================================================================

/**
 * Calculate workout frequency for heatmap
 */
function calculateFrequency(
  sets: Doc<"sets">[],
  days: number,
  now: number
): WorkoutFrequency[] {
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Group sets by day
  const dailyData = new Map<
    string,
    { setCount: number; totalVolume: number }
  >();

  for (const set of sets) {
    if (set.performedAt < startDate.getTime()) continue;

    const setDate = new Date(set.performedAt);
    const [dayKey] = setDate.toISOString().split("T");
    if (!dayKey) continue;

    const current = dailyData.get(dayKey) || { setCount: 0, totalVolume: 0 };
    const volume = set.reps !== undefined ? set.reps * (set.weight || 0) : 0;

    dailyData.set(dayKey, {
      setCount: current.setCount + 1,
      totalVolume: current.totalVolume + volume,
    });
  }

  // Fill gaps with zero days
  const result: WorkoutFrequency[] = [];
  const currentDate = new Date(startDate);
  const endDate = new Date(now);
  endDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const [dayKey] = currentDate.toISOString().split("T");
    if (!dayKey) break;

    const data = dailyData.get(dayKey) || { setCount: 0, totalVolume: 0 };
    result.push({
      date: dayKey,
      setCount: data.setCount,
      totalVolume: data.totalVolume,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Calculate recent PRs
 *
 * Optimized O(N log N) algorithm: process sets chronologically per exercise,
 * maintaining running max values instead of filtering previousSets each time.
 */
function calculateRecentPRs(
  sets: Doc<"sets">[],
  exerciseMap: Map<Id<"exercises">, Doc<"exercises">>,
  days: number,
  now: number
): RecentPR[] {
  const cutoffDate = now - days * 24 * 60 * 60 * 1000;

  // Group sets by exercise
  const setsByExercise = new Map<Id<"exercises">, Doc<"sets">[]>();
  for (const set of sets) {
    const exerciseSets = setsByExercise.get(set.exerciseId) || [];
    exerciseSets.push(set);
    setsByExercise.set(set.exerciseId, exerciseSets);
  }

  const prs: RecentPR[] = [];

  // Process each exercise's sets chronologically
  for (const [exerciseId, exerciseSets] of setsByExercise) {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) continue;

    // Sort by performedAt ascending (oldest first)
    const sortedSets = [...exerciseSets].sort(
      (a, b) => a.performedAt - b.performedAt
    );

    // Track running max values
    let maxWeight = 0;
    let maxReps = 0;
    let maxVolume = 0;

    for (const set of sortedSets) {
      // Skip duration-based exercises (PR detection only works for rep-based)
      if (set.reps === undefined) continue;

      const weight = set.weight ?? 0;
      const reps = set.reps;
      const volume = weight * reps;

      // Determine PR type (priority: weight > volume > reps)
      let prType: PRType | null = null;
      let currentValue = 0;
      let previousValue = 0;

      if (weight > 0 && weight > maxWeight) {
        prType = "weight";
        currentValue = weight;
        previousValue = maxWeight;
      } else if (volume > 0 && volume > maxVolume) {
        prType = "volume";
        currentValue = volume;
        previousValue = maxVolume;
      } else if (reps > maxReps) {
        prType = "reps";
        currentValue = reps;
        previousValue = maxReps;
      }

      // If PR achieved and within cutoff window, record it
      if (prType !== null && set.performedAt >= cutoffDate) {
        prs.push({
          setId: set._id,
          exerciseId: set.exerciseId,
          exerciseName: exercise.name,
          prType,
          currentValue,
          previousValue,
          improvement: currentValue - previousValue,
          performedAt: set.performedAt,
          reps: set.reps,
          weight: set.weight,
        });
      }

      // Update running max values
      if (weight > maxWeight) maxWeight = weight;
      if (reps > maxReps) maxReps = reps;
      if (volume > maxVolume) maxVolume = volume;
    }
  }

  // Sort by date descending
  prs.sort((a, b) => b.performedAt - a.performedAt);
  return prs;
}

/**
 * Calculate recovery status for muscle groups
 */
function calculateRecovery(
  sets: Doc<"sets">[],
  exerciseMap: Map<Id<"exercises">, Doc<"exercises">>,
  now: number
): RecoveryData[] {
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const allGroups = MUSCLE_GROUPS;

  // Initialize metrics
  const metrics = new Map<
    MuscleGroup,
    {
      lastTrainedTimestamp: number;
      volumeLast7Days: number;
      workoutDates: Set<string>;
    }
  >();

  for (const group of allGroups) {
    metrics.set(group, {
      lastTrainedTimestamp: 0,
      volumeLast7Days: 0,
      workoutDates: new Set(),
    });
  }

  // Process sets
  for (const set of sets) {
    const exercise = exerciseMap.get(set.exerciseId);
    if (!exercise) continue;

    const muscleGroups = exercise.muscleGroups || ["Other"];

    for (const group of muscleGroups) {
      if (group === "Other") continue;

      const m = metrics.get(group as MuscleGroup);
      if (!m) continue;

      // Update last trained
      if (set.performedAt > m.lastTrainedTimestamp) {
        m.lastTrainedTimestamp = set.performedAt;
      }

      // Update 7-day metrics
      if (set.performedAt >= sevenDaysAgo) {
        const volume =
          set.reps !== undefined ? set.reps * (set.weight || 0) : 0;
        m.volumeLast7Days += volume;

        const [workoutDate] = new Date(set.performedAt)
          .toISOString()
          .split("T");
        if (workoutDate) m.workoutDates.add(workoutDate);
      }
    }
  }

  // Build result
  const result: RecoveryData[] = [];

  for (const [muscleGroup, m] of metrics.entries()) {
    let lastTrainedDate: string | null = null;
    let daysSince: number;

    if (m.lastTrainedTimestamp === 0) {
      daysSince = Infinity;
    } else {
      const [dateStr] = new Date(m.lastTrainedTimestamp)
        .toISOString()
        .split("T");
      lastTrainedDate = dateStr ?? null;
      daysSince = Math.floor(
        (now - m.lastTrainedTimestamp) / (24 * 60 * 60 * 1000)
      );
    }

    const status: RecoveryStatus =
      daysSince <= 2 ? "recovering" : daysSince <= 7 ? "ready" : "overdue";

    result.push({
      muscleGroup,
      lastTrainedDate,
      daysSince,
      volumeLast7Days: m.volumeLast7Days,
      frequencyLast7Days: m.workoutDates.size,
      status,
    });
  }

  // Sort by days since (most rested first)
  result.sort((a, b) => b.daysSince - a.daysSince);
  return result;
}

/**
 * Calculate focus suggestions
 */
function calculateFocusSuggestions(
  sets: Doc<"sets">[],
  activeExercises: Doc<"exercises">[],
  exerciseMap: Map<Id<"exercises">, Doc<"exercises">>,
  now: number
): FocusSuggestion[] {
  if (activeExercises.length === 0 || sets.length === 0) {
    return [];
  }

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const suggestions: FocusSuggestion[] = [];

  // Track last trained date per exercise
  const exerciseLastTrained = new Map<Id<"exercises">, number>();
  for (const set of sets) {
    const current = exerciseLastTrained.get(set.exerciseId);
    if (!current || set.performedAt > current) {
      exerciseLastTrained.set(set.exerciseId, set.performedAt);
    }
  }

  // 1. Identify exercises not trained in 7+ days
  for (const exercise of activeExercises) {
    const lastTrained = exerciseLastTrained.get(exercise._id);
    if (!lastTrained) continue;

    const daysSince = Math.floor((now - lastTrained) / (24 * 60 * 60 * 1000));
    if (daysSince >= 7) {
      suggestions.push({
        type: "exercise",
        priority: "high",
        title: `Train ${exercise.name}`,
        reason: `Haven't trained in ${daysSince} days`,
        exerciseId: exercise._id,
      });
    }
  }

  // 2. Calculate muscle group volumes for balance
  const muscleGroupVolumes = new Map<MuscleGroup, number>();

  for (const set of sets) {
    if (set.performedAt < sevenDaysAgo) continue;

    const exercise = exerciseMap.get(set.exerciseId);
    if (!exercise) continue;

    const muscleGroups = exercise.muscleGroups || ["Other"];
    const volume = set.reps !== undefined ? set.reps * (set.weight || 0) : 0;

    for (const group of muscleGroups) {
      if (group === "Other") continue;
      const current = muscleGroupVolumes.get(group as MuscleGroup) || 0;
      muscleGroupVolumes.set(group as MuscleGroup, current + volume);
    }
  }

  // 3. Detect push/pull imbalance
  const pushVolume =
    (muscleGroupVolumes.get("Chest") || 0) +
    (muscleGroupVolumes.get("Shoulders") || 0) +
    (muscleGroupVolumes.get("Triceps") || 0);
  const pullVolume =
    (muscleGroupVolumes.get("Back") || 0) +
    (muscleGroupVolumes.get("Biceps") || 0);

  if (pushVolume > 0 && pullVolume > 0) {
    const ratio = pushVolume / pullVolume;
    if (ratio > 2) {
      suggestions.push({
        type: "balance",
        priority: "medium",
        title: "Balance Push/Pull Training",
        reason: `Push volume is ${ratio.toFixed(1)}x higher than pull`,
        suggestedExercises: ["Pull-ups", "Rows", "Lat Pulldowns"],
      });
    } else if (ratio < 0.5) {
      suggestions.push({
        type: "balance",
        priority: "medium",
        title: "Balance Push/Pull Training",
        reason: `Pull volume is ${(1 / ratio).toFixed(1)}x higher than push`,
        suggestedExercises: ["Bench Press", "Overhead Press", "Dips"],
      });
    }
  }

  // Sort by priority and limit to 5
  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  suggestions.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return suggestions.slice(0, 5);
}

/**
 * Calculate progressive overload data
 */
function calculateProgressiveOverload(
  sets: Doc<"sets">[],
  exerciseMap: Map<Id<"exercises">, Doc<"exercises">>,
  exerciseCount: number
): ProgressiveOverloadData[] {
  if (sets.length === 0) return [];

  // Group sets by exercise
  const exerciseActivity = new Map<
    Id<"exercises">,
    { lastWorkout: number; sets: Doc<"sets">[] }
  >();

  for (const set of sets) {
    const current = exerciseActivity.get(set.exerciseId);
    if (!current) {
      exerciseActivity.set(set.exerciseId, {
        lastWorkout: set.performedAt,
        sets: [set],
      });
    } else {
      current.sets.push(set);
      if (set.performedAt > current.lastWorkout) {
        current.lastWorkout = set.performedAt;
      }
    }
  }

  // Sort by most recent activity
  const sorted = Array.from(exerciseActivity.entries()).sort(
    ([, a], [, b]) => b.lastWorkout - a.lastWorkout
  );

  const result: ProgressiveOverloadData[] = [];

  for (const [exerciseId, { sets: exerciseSets }] of sorted) {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) continue;

    // Group by date
    const workoutsByDate = new Map<
      string,
      Array<{ reps: number; weight: number | undefined }>
    >();

    for (const set of exerciseSets) {
      if (set.reps !== undefined) {
        const [date] = new Date(set.performedAt).toISOString().split("T");
        if (!date) continue;
        const workout = workoutsByDate.get(date) || [];
        workout.push({ reps: set.reps, weight: set.weight });
        workoutsByDate.set(date, workout);
      }
    }

    // Get last 10 workout dates
    const sortedDates = Array.from(workoutsByDate.keys()).sort().slice(-10);
    if (sortedDates.length === 0) continue;

    const dataPoints = sortedDates.map((date) => {
      const workout = workoutsByDate.get(date)!;
      const weights = workout
        .map((s) => s.weight)
        .filter((w): w is number => w !== undefined);
      const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
      const maxReps = Math.max(...workout.map((s) => s.reps));
      const volume = workout.reduce(
        (sum, s) => sum + s.reps * (s.weight || 0),
        0
      );

      return { date, maxWeight, maxReps, volume };
    });

    // Calculate trend
    let trend: "improving" | "plateau" | "declining" = "plateau";
    if (dataPoints.length >= 6) {
      const recent = dataPoints.slice(-3);
      const previous = dataPoints.slice(-6, -3);
      const recentAvg = recent.reduce((s, d) => s + d.volume, 0) / 3;
      const previousAvg = previous.reduce((s, d) => s + d.volume, 0) / 3;
      const changePercent =
        previousAvg > 0
          ? ((recentAvg - previousAvg) / previousAvg) * 100
          : recentAvg > 0
            ? 100
            : 0;

      if (changePercent > 5) trend = "improving";
      else if (changePercent < -5) trend = "declining";
    }

    result.push({
      exerciseId,
      exerciseName: exercise.name,
      dataPoints,
      trend,
    });

    if (result.length === exerciseCount) break;
  }

  return result;
}
