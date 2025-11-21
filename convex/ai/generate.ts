import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateAnalysis } from "./openai";
import type { AnalyticsMetrics } from "./prompts";

/**
 * Calculate Monday 00:00 UTC for a given date
 *
 * @param date - Date to get week start for (defaults to now)
 * @returns Unix timestamp (ms) for Monday 00:00 UTC of that week
 */
function getWeekStartDate(date: Date = new Date()): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = d.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0
  d.setUTCDate(d.getUTCDate() + diff);
  return d.getTime();
}

/**
 * Calculate date range based on report type
 *
 * @param reportType - Type of report (daily/weekly/monthly)
 * @param customStart - Optional custom start timestamp (for weekly reports)
 * @returns Object with startDate and endDate timestamps
 */
function calculateDateRange(
  reportType: "daily" | "weekly" | "monthly",
  customStart?: number
): { startDate: number; endDate: number } {
  const now = new Date();
  let startDate: number;
  let endDate = now.getTime();

  switch (reportType) {
    case "daily":
      // If custom start provided, use it (for backfilling specific days)
      // Otherwise use last 24 hours from now
      if (customStart) {
        startDate = customStart;
        endDate = customStart + 24 * 60 * 60 * 1000; // 24 hours after start
      } else {
        startDate = endDate - 24 * 60 * 60 * 1000;
      }
      break;
    case "weekly":
      // Last 7 days (or custom start for Monday-based weeks)
      if (customStart) {
        startDate = customStart;
      } else {
        startDate = endDate - 7 * 24 * 60 * 60 * 1000;
      }
      break;
    case "monthly":
      // Last calendar month (1st to last day of previous month)
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);
      startDate = lastMonth.getTime();

      // End date is last day of that month
      const lastDayOfMonth = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0
      );
      lastDayOfMonth.setHours(23, 59, 59, 999);
      return { startDate, endDate: lastDayOfMonth.getTime() };
  }

  return { startDate, endDate };
}

/**
 * Calculate current workout streak
 *
 * @param sets - All user sets sorted by performedAt
 * @returns Number of consecutive days with workouts (including today if active)
 */
function calculateCurrentStreak(sets: Array<{ performedAt: number }>): number {
  if (sets.length === 0) return 0;

  const workoutDays = Array.from(
    new Set(
      sets.map((s) => new Date(s.performedAt).toISOString().split("T")[0])
    )
  ).sort();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Check if streak is active (today or yesterday)
  const lastWorkout = workoutDays[workoutDays.length - 1];
  if (lastWorkout !== today && lastWorkout !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = workoutDays.length - 2; i >= 0; i--) {
    const current = new Date(workoutDays[i]);
    const next = new Date(workoutDays[i + 1]);
    const diffDays = Math.floor(
      (next.getTime() - current.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate longest streak in history
 *
 * @param sets - All user sets
 * @returns Maximum consecutive days with workouts ever achieved
 */
function calculateLongestStreak(sets: Array<{ performedAt: number }>): number {
  if (sets.length === 0) return 0;

  const workoutDays = Array.from(
    new Set(
      sets.map((s) => new Date(s.performedAt).toISOString().split("T")[0])
    )
  ).sort();

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < workoutDays.length; i++) {
    const prev = new Date(workoutDays[i - 1]);
    const curr = new Date(workoutDays[i]);
    const diffDays = Math.floor(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Generate AI workout analysis report
 *
 * Internal action (not exposed to client) that orchestrates the full report
 * generation workflow. Fetches analytics data, calls OpenAI, stores result.
 *
 * **Deduplication**: If a report already exists for the given period and type,
 * returns existing reportId instead of generating a new one.
 *
 * **Report Types**:
 * - daily: Last 24 hours
 * - weekly: Last 7 days (or custom weekStartDate for Monday-based weeks)
 * - monthly: Previous calendar month
 *
 * **Week Calculation**: weekStartDate is Monday 00:00 UTC. If not provided,
 * defaults to current week.
 *
 * @param userId - User to generate report for
 * @param reportType - Type of report (defaults to "weekly")
 * @param weekStartDate - Optional Unix timestamp for week start (Monday 00:00 UTC)
 * @returns Report ID of newly generated or existing report
 */
export const generateReport = internalAction({
  args: {
    userId: v.string(),
    reportType: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
    weekStartDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<string> => {
    const { userId } = args;
    const reportType = args.reportType || "weekly";
    const weekStartDate = args.weekStartDate ?? getWeekStartDate();

    console.log(
      `[AI Reports] Generating ${reportType} report for user ${userId}, week ${new Date(weekStartDate).toISOString()}`
    );

    // Check for existing report (deduplication)
    const existingReportId: string | null = await ctx.runQuery(
      (internal as any).ai.data.checkExistingReport,
      { userId, reportType, weekStartDate }
    );

    if (existingReportId) {
      console.log(
        `[AI Reports] ${reportType} report already exists for this period: ${existingReportId}`
      );
      return existingReportId;
    }

    // Calculate date range based on report type
    const { startDate, endDate } = calculateDateRange(
      reportType,
      weekStartDate
    );

    // Fetch workout data via internal query
    const { volumeData, recentPRs, allSets, exercises } = await ctx.runQuery(
      (internal as any).ai.data.getWorkoutData,
      { userId, startDate, endDate }
    );

    const exerciseMap = new Map(exercises.map((ex: any) => [ex._id, ex.name]));

    // Aggregate volume by exercise and type (weighted vs bodyweight)
    // Key format: "exerciseId|weighted" or "exerciseId|bodyweight"
    const volumeByExerciseType = new Map<
      string,
      {
        exerciseName: string;
        totalVolume: number;
        sets: number;
        isBodyweight: boolean;
      }
    >();

    for (const set of volumeData as any[]) {
      const exerciseName = exerciseMap.get(set.exerciseId);
      if (!exerciseName) continue;

      // Skip duration-only sets (no reps means it's a duration-based exercise)
      if (set.reps === undefined) continue;

      // Determine if THIS SET is weighted or bodyweight
      const isBodyweight = !set.weight || set.weight === 0;
      const exerciseIdStr = String(set.exerciseId);
      const key = `${exerciseIdStr}|${isBodyweight ? "bodyweight" : "weighted"}`;

      const current = volumeByExerciseType.get(key) || {
        exerciseName: String(exerciseName),
        totalVolume: 0,
        sets: 0,
        isBodyweight,
      };

      // Calculate volume based on set type
      const volume = isBodyweight
        ? set.reps // Bodyweight = just reps
        : set.reps * set.weight; // Weighted = reps × weight

      volumeByExerciseType.set(key, {
        exerciseName: String(current.exerciseName),
        totalVolume: current.totalVolume + volume,
        sets: current.sets + 1,
        isBodyweight,
      });
    }

    const volume = Array.from(volumeByExerciseType.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .map((v) => ({
        exerciseName: v.exerciseName,
        totalVolume: v.totalVolume,
        sets: v.sets,
        isBodyweight: v.isBodyweight,
      }));

    // Calculate PRs with proper type handling for bodyweight vs weighted exercises
    const prs = (recentPRs as any[])
      .filter(
        (set: any) => set.performedAt >= startDate && set.performedAt < endDate
      )
      // Filter out duration-only sets (no reps means it's a duration-based exercise)
      .filter((set: any) => set.reps !== undefined)
      .map((set: any) => {
        // Determine if THIS SET is weighted or bodyweight
        const isBodyweight = !set.weight || set.weight === 0;

        return {
          exerciseName: String(exerciseMap.get(set.exerciseId) || "Unknown"),
          prType: isBodyweight ? ("reps" as const) : ("weight" as const),
          improvement: isBodyweight ? set.reps : Number(set.weight),
          performedAt: Number(set.performedAt),
        };
      })
      .filter((pr) => pr.improvement > 0) // Remove 0-value PRs
      .slice(0, 5);

    // Calculate streak stats
    const workoutDays = new Set(
      (allSets as any[]).map(
        (s: any) => new Date(s.performedAt).toISOString().split("T")[0]
      )
    );
    const currentStreak = calculateCurrentStreak(allSets as any[]);
    const longestStreak = calculateLongestStreak(allSets as any[]);

    // Calculate frequency metrics
    const workoutDaysInWeek = new Set(
      (volumeData as any[]).map(
        (s: any) => new Date(s.performedAt).toISOString().split("T")[0]
      )
    ).size;
    const restDays = 7 - workoutDaysInWeek;
    const avgSetsPerDay =
      workoutDaysInWeek > 0 ? volumeData.length / workoutDaysInWeek : 0;

    // Build metrics object
    const metrics: AnalyticsMetrics = {
      volume,
      prs,
      streak: {
        currentStreak,
        longestStreak,
        totalWorkouts: workoutDays.size,
      },
      frequency: {
        workoutDays: workoutDaysInWeek,
        restDays,
        avgSetsPerDay,
      },
      weekStartDate,
    };

    console.log(
      `[AI Reports] Metrics collected: ${volume.length} exercises, ${prs.length} PRs`
    );

    // Generate AI analysis
    const analysis = await generateAnalysis(metrics);

    console.log(
      `[AI Reports] AI analysis generated: ${analysis.content.length} chars, $${analysis.tokenUsage.costUSD}`
    );

    // Store report in database via internal mutation
    const reportId: string = await ctx.runMutation(
      (internal as any).ai.data.saveReport,
      {
        userId,
        reportType,
        weekStartDate,
        content: analysis.content,
        metricsSnapshot: {
          volume: metrics.volume,
          prs: metrics.prs.map((pr) => ({
            exerciseName: pr.exerciseName,
            prType: pr.prType,
            improvement: pr.improvement,
            performedAt: pr.performedAt,
          })),
          streak: metrics.streak,
          frequency: metrics.frequency,
        },
        model: analysis.model,
        tokenUsage: {
          input: analysis.tokenUsage.input,
          output: analysis.tokenUsage.output,
          costUSD: analysis.tokenUsage.costUSD,
        },
      }
    );

    console.log(`[AI Reports] Report saved: ${reportId}`);

    return reportId;
  },
});
