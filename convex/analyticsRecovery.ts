import { query } from "./_generated/server";

// Muscle group type definition (no longer using mapping file)
export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Core"
  | "Other";

/**
 * Recovery Analytics
 *
 * Tracks recovery status for each muscle group based on:
 * - Days since last trained
 * - Volume and frequency in last 7 days
 * - Recovery status classification
 */

export type RecoveryStatus = "recovering" | "ready" | "overdue";

export interface RecoveryData {
  muscleGroup: MuscleGroup;
  lastTrainedDate: string | null; // YYYY-MM-DD or null if never trained
  daysSince: number; // Days since last trained (0 if today, 999 if never)
  volumeLast7Days: number; // Total volume (reps × weight) in last 7 days
  frequencyLast7Days: number; // Number of distinct workout days in last 7 days
  status: RecoveryStatus;
}

/**
 * Calculate recovery status based on days since last training
 *
 * User-friendly terminology:
 * - "Recovering" (0-2 days): Still sore, give it time
 * - "Ready" (3-7 days): Optimal training window
 * - "Overdue" (8+ days): Neglected, losing gains
 *
 * @param daysSince - Days since muscle group was last trained
 * @returns Recovery status classification
 */
function calculateRecoveryStatus(daysSince: number): RecoveryStatus {
  if (daysSince <= 2) return "recovering"; // Just trained, still recovering
  if (daysSince <= 7) return "ready"; // Optimal training window (3-7 days)
  return "overdue"; // Neglected (8+ days)
}

/**
 * Get recovery status for all muscle groups
 *
 * Analyzes user's training history to determine:
 * - When each muscle group was last trained
 * - Recovery status (fresh, recovering, ready, overdue)
 * - Volume and frequency metrics for last 7 days
 *
 * @returns Array of recovery data sorted by days since last trained (descending)
 *
 * @example
 * ```typescript
 * const recovery = await ctx.query(api.analyticsRecovery.getRecoveryStatus, {});
 * // [
 * //   { muscleGroup: "Back", daysSince: 8, status: "overdue", ... },
 * //   { muscleGroup: "Chest", daysSince: 3, status: "recovering", ... },
 * //   ...
 * // ]
 * ```
 */
export const getRecoveryStatus = query({
  args: {},
  handler: async (ctx): Promise<RecoveryData[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Fetch all user exercises (including deleted to maintain historical accuracy)
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Create exercise name lookup map
    const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex.name]));

    // Fetch all user sets sorted by performedAt descending
    const allSets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    if (allSets.length === 0) {
      // No training data - return all muscle groups as never trained
      const allGroups: MuscleGroup[] = [
        "Chest",
        "Back",
        "Shoulders",
        "Biceps",
        "Triceps",
        "Quads",
        "Hamstrings",
        "Glutes",
        "Calves",
        "Core",
      ];

      return allGroups.map((group) => ({
        muscleGroup: group,
        lastTrainedDate: null,
        daysSince: 999, // Sentinel value for never trained
        volumeLast7Days: 0,
        frequencyLast7Days: 0,
        status: "overdue" as RecoveryStatus,
      }));
    }

    // Calculate date boundaries
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Track metrics per muscle group
    const muscleGroupMetrics = new Map<
      MuscleGroup,
      {
        lastTrainedTimestamp: number;
        volumeLast7Days: number;
        workoutDatesLast7Days: Set<string>; // YYYY-MM-DD dates for frequency
      }
    >();

    // Initialize all muscle groups (except "Other")
    const allGroups: MuscleGroup[] = [
      "Chest",
      "Back",
      "Shoulders",
      "Biceps",
      "Triceps",
      "Quads",
      "Hamstrings",
      "Glutes",
      "Calves",
      "Core",
    ];

    for (const group of allGroups) {
      muscleGroupMetrics.set(group, {
        lastTrainedTimestamp: 0,
        volumeLast7Days: 0,
        workoutDatesLast7Days: new Set(),
      });
    }

    // Process each set
    for (const set of allSets) {
      const exercise = exercises.find((ex) => ex._id === set.exerciseId);
      if (!exercise) continue; // Skip if exercise not found

      // Get muscle groups from exercise record (AI-classified)
      const muscleGroups = exercise.muscleGroups || ["Other"];

      for (const group of muscleGroups) {
        if (group === "Other") continue; // Skip "Other" category

        const metrics = muscleGroupMetrics.get(group as MuscleGroup);
        if (!metrics) continue;

        // Update last trained timestamp
        if (set.performedAt > metrics.lastTrainedTimestamp) {
          metrics.lastTrainedTimestamp = set.performedAt;
        }

        // Update volume and frequency for last 7 days
        if (set.performedAt >= sevenDaysAgo) {
          const volume = set.reps * (set.weight || 0);
          metrics.volumeLast7Days += volume;

          // Track distinct workout dates for frequency
          const workoutDate = new Date(set.performedAt)
            .toISOString()
            .split("T")[0];
          metrics.workoutDatesLast7Days.add(workoutDate);
        }
      }
    }

    // Build result array
    const result: RecoveryData[] = [];

    for (const [muscleGroup, metrics] of muscleGroupMetrics.entries()) {
      let lastTrainedDate: string | null = null;
      let daysSince: number;

      if (metrics.lastTrainedTimestamp === 0) {
        // Never trained
        daysSince = 999;
      } else {
        // Calculate days since last trained
        const lastTrainedDateObj = new Date(metrics.lastTrainedTimestamp);
        lastTrainedDate = lastTrainedDateObj.toISOString().split("T")[0];

        const daysDiff = now - metrics.lastTrainedTimestamp;
        daysSince = Math.floor(daysDiff / (24 * 60 * 60 * 1000));
      }

      const status = calculateRecoveryStatus(daysSince);

      result.push({
        muscleGroup,
        lastTrainedDate,
        daysSince,
        volumeLast7Days: metrics.volumeLast7Days,
        frequencyLast7Days: metrics.workoutDatesLast7Days.size,
        status,
      });
    }

    // Sort by days since last trained descending (most rested/overdue first)
    result.sort((a, b) => b.daysSince - a.daysSince);

    return result;
  },
});
