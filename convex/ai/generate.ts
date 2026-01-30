import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { generateAnalysis } from "./openai";
import { formatUserProfileContext } from "./prompts";
import type { AnalyticsMetrics } from "./prompts";
import {
  getWeekStartDate,
  calculateDateRange,
  calculateCurrentStreak,
  calculateLongestStreak,
} from "./dateUtils";

type SetDoc = Doc<"sets">;
type ExerciseDoc = Doc<"exercises">;
type ReportId = Id<"aiReports">;

interface WorkoutData {
  volumeData: SetDoc[];
  recentPRs: SetDoc[];
  allSets: SetDoc[];
  exercises: ExerciseDoc[];
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
  handler: async (ctx, args): Promise<ReportId> => {
    const { userId } = args;
    const reportType = args.reportType || "weekly";
    const weekStartDate = args.weekStartDate ?? getWeekStartDate();

    console.log(
      `[AI Reports] Generating ${reportType} report for user ${userId}, week ${new Date(weekStartDate).toISOString()}`
    );

    // Check for existing report (deduplication)
    const existingReportId = await ctx.runQuery(
      internal.ai.data.checkExistingReport,
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
    const [{ volumeData, recentPRs, allSets, exercises }, userPreferences] =
      await Promise.all([
        ctx.runQuery(internal.ai.data.getWorkoutData, {
          userId,
          startDate,
          endDate,
        }),
        ctx.runQuery(internal.ai.data.getUserPreferences, { userId }),
      ]);

    const userProfileContext = formatUserProfileContext(userPreferences);

    const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex.name]));

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

    for (const set of volumeData) {
      const exerciseName = exerciseMap.get(set.exerciseId);
      if (!exerciseName) continue;

      // Skip duration-only sets (no reps means it's a duration-based exercise)
      if (set.reps === undefined) continue;

      // Determine if THIS SET is weighted or bodyweight
      const weight = set.weight ?? 0;
      const isBodyweight = weight === 0;
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
        : set.reps * weight; // Weighted = reps × weight

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
    const prs = recentPRs
      .filter(
        (set) => set.performedAt >= startDate && set.performedAt < endDate
      )
      // Filter out duration-only sets (no reps means it's a duration-based exercise)
      .filter((set) => set.reps !== undefined)
      .map((set) => {
        // Determine if THIS SET is weighted or bodyweight
        const weight = set.weight ?? 0;
        const isBodyweight = weight === 0;

        return {
          exerciseName: String(exerciseMap.get(set.exerciseId) || "Unknown"),
          prType: isBodyweight ? ("reps" as const) : ("weight" as const),
          improvement: isBodyweight ? (set.reps ?? 0) : weight,
          performedAt: Number(set.performedAt),
        };
      })
      .filter((pr) => pr.improvement > 0) // Remove 0-value PRs
      .slice(0, 5);

    // Calculate streak stats
    const workoutDays = new Set(
      allSets.map((s) => new Date(s.performedAt).toISOString().split("T")[0])
    );
    const currentStreak = calculateCurrentStreak(allSets);
    const longestStreak = calculateLongestStreak(allSets);

    // Calculate frequency metrics
    const workoutDaysInWeek = new Set(
      volumeData.map((s) => new Date(s.performedAt).toISOString().split("T")[0])
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
    const analysis = await generateAnalysis(metrics, userProfileContext);

    console.log(
      `[AI Reports] AI analysis generated: ${analysis.content.length} chars, $${analysis.tokenUsage.costUSD}`
    );

    // Store report in database via internal mutation
    const reportId: ReportId = await ctx.runMutation(
      internal.ai.data.saveReport,
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
