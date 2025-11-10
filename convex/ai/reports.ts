/**
 * AI Report Generation and Retrieval
 *
 * Orchestrates the creation of AI-generated weekly workout reports by:
 * 1. Fetching analytics metrics for a given time period
 * 2. Formatting metrics into an AI prompt
 * 3. Calling OpenAI for analysis
 * 4. Storing the report in the database
 *
 * @module ai/reports
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalAction,
  internalQuery,
  query,
  mutation,
  action,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { generateAnalysis } from "./openai";
import type { AnalyticsMetrics } from "./prompts";

/**
 * Internal query to check for existing report (deduplication)
 *
 * @param userId - User ID
 * @param reportType - Report type
 * @param weekStartDate - Week start date
 * @returns Existing report ID or null
 */
export const checkExistingReport = internalQuery({
  args: {
    userId: v.string(),
    reportType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    weekStartDate: v.number(),
  },
  handler: async (ctx, args) => {
    const existingReport = await ctx.db
      .query("aiReports")
      .withIndex("by_user_type_date", (q) =>
        q
          .eq("userId", args.userId)
          .eq("reportType", args.reportType)
          .eq("weekStartDate", args.weekStartDate)
      )
      .first();

    return existingReport?._id || null;
  },
});

/**
 * Internal query to get workout data for report generation
 *
 * @param userId - User ID
 * @param startDate - Start of period
 * @param endDate - End of period
 * @returns Sets and exercises data
 */
export const getWorkoutData = internalQuery({
  args: {
    userId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, startDate, endDate } = args;

    const [volumeData, recentPRs, allSets] = await Promise.all([
      // Volume by exercise
      ctx.db
        .query("sets")
        .withIndex("by_user_performed", (q) => q.eq("userId", userId))
        .filter((q) =>
          q.and(
            q.gte(q.field("performedAt"), startDate),
            q.lt(q.field("performedAt"), endDate)
          )
        )
        .collect(),

      // Recent PRs (for the report period)
      ctx.db
        .query("sets")
        .withIndex("by_user_performed", (q) => q.eq("userId", userId))
        .filter((q) => q.gte(q.field("performedAt"), startDate))
        .collect(),

      // All sets for streak calculation
      ctx.db
        .query("sets")
        .withIndex("by_user_performed", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    // Get exercises for name lookup
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      volumeData,
      recentPRs,
      allSets,
      exercises,
    };
  },
});

/**
 * Internal mutation to save an AI report to the database
 *
 * Separated out to support action-based report generation (actions can't write to DB directly).
 *
 * @param report - Report data to save
 * @returns Report ID
 */
export const saveReport = internalMutation({
  args: {
    userId: v.string(),
    reportType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    weekStartDate: v.number(),
    content: v.string(),
    model: v.string(),
    metricsSnapshot: v.object({
      volume: v.array(
        v.object({
          exerciseName: v.string(),
          totalVolume: v.number(),
          sets: v.number(),
          isBodyweight: v.optional(v.boolean()), // Optional for backward compatibility
        })
      ),
      prs: v.array(
        v.object({
          exerciseName: v.string(),
          prType: v.string(),
          improvement: v.number(),
          performedAt: v.number(),
        })
      ),
      streak: v.object({
        currentStreak: v.number(),
        longestStreak: v.number(),
        totalWorkouts: v.number(),
      }),
      frequency: v.object({
        workoutDays: v.number(),
        restDays: v.number(),
        avgSetsPerDay: v.number(),
      }),
    }),
    tokenUsage: v.object({
      input: v.number(),
      output: v.number(),
      costUSD: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("aiReports", {
      userId: args.userId,
      reportType: args.reportType,
      weekStartDate: args.weekStartDate,
      generatedAt: Date.now(),
      content: args.content,
      metricsSnapshot: args.metricsSnapshot,
      model: args.model,
      tokenUsage: args.tokenUsage,
    });

    return reportId;
  },
});

/**
 * Internal mutation to delete all reports for a user
 *
 * Utility for clearing reports before regeneration or testing.
 * CAUTION: This permanently deletes all AI reports for the user.
 *
 * @param userId - User ID whose reports should be deleted
 * @returns Number of reports deleted
 *
 * @example
 * ```bash
 * pnpm convex run internal:ai/reports:deleteAllReportsForUser '{"userId":"user_123"}'
 * ```
 */
export const deleteAllReportsForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("aiReports")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const report of reports) {
      await ctx.db.delete(report._id);
    }

    console.log(
      `[AI Reports] Deleted ${reports.length} reports for user ${args.userId}`
    );
    return { deleted: reports.length };
  },
});

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
 *
 * @example
 * ```typescript
 * // Generate weekly report for current week
 * const reportId = await ctx.runAction(internal.ai.reports.generateReport, {
 *   userId: "user_123"
 * });
 *
 * // Generate daily report
 * const reportId = await ctx.runAction(internal.ai.reports.generateReport, {
 *   userId: "user_123",
 *   reportType: "daily"
 * });
 *
 * // Generate monthly report
 * const reportId = await ctx.runAction(internal.ai.reports.generateReport, {
 *   userId: "user_123",
 *   reportType: "monthly"
 * });
 * ```
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
      (internal as any).ai.reports.checkExistingReport,
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
      (internal as any).ai.reports.getWorkoutData,
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
      (internal as any).ai.reports.saveReport,
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
 * Get latest AI report for authenticated user
 *
 * Returns the most recently generated report, or null if no reports exist.
 * Automatically filters by authenticated user. Optionally filter by report type.
 *
 * @param reportType - Optional filter for specific report type (daily/weekly/monthly)
 * @returns Most recent report (optionally filtered by type) or null
 *
 * @example
 * ```typescript
 * // Get latest report of any type
 * const latestReport = useQuery(api.ai.reports.getLatestReport, {});
 *
 * // Get latest weekly report specifically
 * const weeklyReport = useQuery(api.ai.reports.getLatestReport, {
 *   reportType: "weekly"
 * });
 *
 * // Get latest daily report
 * const dailyReport = useQuery(api.ai.reports.getLatestReport, {
 *   reportType: "daily"
 * });
 * ```
 */
export const getLatestReport = query({
  args: {
    reportType: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const query = ctx.db
      .query("aiReports")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc");

    const reports = await query.collect();

    // Filter by report type if specified
    if (args.reportType) {
      const filtered = reports.filter((r) => r.reportType === args.reportType);
      return filtered[0] || null;
    }

    return reports[0] || null;
  },
});

/**
 * Get report history for authenticated user
 *
 * Returns paginated list of reports sorted by generation date (newest first).
 * Includes full metricsSnapshot for transparency about what data was analyzed.
 *
 * @param limit - Maximum number of reports to return (default: 10)
 * @returns Array of reports sorted by generatedAt descending
 *
 * @example
 * ```typescript
 * // Get last 10 reports
 * const reports = useQuery(api.ai.reports.getReportHistory, {});
 *
 * // Get last 5 reports
 * const recentReports = useQuery(api.ai.reports.getReportHistory, {
 *   limit: 5
 * });
 * ```
 */
export const getReportHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const limit = args.limit ?? 10;

    const reports = await ctx.db
      .query("aiReports")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(limit);

    return reports;
  },
});

/**
 * Get start of current day in UTC
 *
 * @returns Unix timestamp (ms) for 00:00:00 UTC today
 */
function getStartOfDayUTC(): number {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
  return startOfDay.getTime();
}

/**
 * Internal query to check rate limit for on-demand reports
 *
 * Returns count of reports generated today for a given user.
 *
 * @param userId - User ID to check
 * @returns Number of reports generated today
 */
export const checkRateLimit = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const startOfToday = getStartOfDayUTC();

    const reportsToday = await ctx.db
      .query("aiReports")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("generatedAt"), startOfToday))
      .collect();

    return reportsToday.length;
  },
});

/**
 * Generate AI report on-demand (user-triggered)
 *
 * User-facing action that generates a new AI workout analysis report.
 * Includes rate limiting to prevent abuse and manage API costs.
 *
 * **Rate Limiting**: 5 reports per user per day
 * - Counter resets at midnight UTC
 * - Prevents excessive API costs
 * - Clear error messages when limit reached
 *
 * **Process**:
 * 1. Verify user is authenticated
 * 2. Check daily generation count (last 24 hours)
 * 3. If under limit, call internal generateReport
 * 4. Return reportId or error
 *
 * @returns Report ID of generated report
 * @throws Error if daily limit exceeded or generation fails
 *
 * @example
 * ```typescript
 * const generateReport = useAction(api.ai.reports.generateOnDemandReport);
 *
 * try {
 *   const reportId = await generateReport();
 *   // Report generated successfully
 * } catch (error) {
 *   // Handle error (e.g., "Daily limit reached (5/5)")
 * }
 * ```
 */
export const generateOnDemandReport = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to generate reports");
    }

    const userId = identity.subject;

    // Check rate limit via internal query
    const reportsCount = await ctx.runQuery(
      (internal as any).ai.reports.checkRateLimit,
      { userId }
    );

    // Rate limit: 5 reports per day
    const DAILY_LIMIT = 5;
    if (reportsCount >= DAILY_LIMIT) {
      throw new Error(
        `Daily limit reached (${reportsCount}/${DAILY_LIMIT}). Try again tomorrow.`
      );
    }

    console.log(
      `[On-Demand] User ${userId} generating report (${reportsCount + 1}/${DAILY_LIMIT} today)`
    );

    // Generate report via internal action
    try {
      const reportId = await ctx.runAction(
        (internal as any).ai.reports.generateReport,
        {
          userId,
        }
      );

      console.log(`[On-Demand] Report generated: ${reportId}`);

      return reportId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[On-Demand] Failed to generate report:`, errorMessage);
      throw new Error(`Failed to generate report: ${errorMessage}`);
    }
  },
});

/**
 * Backfill weekly reports for past weeks (temporary utility)
 *
 * Internal action to generate historical weekly reports for a specific user.
 * Useful for backfilling reports after initial setup or data migration.
 *
 * **Deduplication**: Won't create duplicate reports if run multiple times.
 *
 * @param userId - User ID to generate reports for
 * @returns Summary of reports generated/skipped
 *
 * @example
 * ```bash
 * npx convex run ai/reports:backfillWeeklyReports '{"userId":"user_123"}'
 * ```
 */
export const backfillWeeklyReports = action({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<any> => {
    const { userId } = args;

    console.log(
      `[Backfill] Starting weekly report backfill for user ${userId}`
    );
    const startTime = Date.now();

    // Past 5 weeks with known workout data (from analysis)
    const weeks = [
      { date: "2025-10-27", timestamp: 1761523200000, expectedSets: 82 },
      { date: "2025-10-20", timestamp: 1760918400000, expectedSets: 61 },
      { date: "2025-10-13", timestamp: 1760313600000, expectedSets: 44 },
      { date: "2025-10-06", timestamp: 1759708800000, expectedSets: 34 },
      { date: "2025-09-29", timestamp: 1759104000000, expectedSets: 15 },
    ];

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ week: string; error: string }> = [];

    let weekIndex = 0;
    for (const week of weeks) {
      try {
        console.log(
          `[Backfill] Generating report for week of ${week.date} (${week.expectedSets} sets expected)...`
        );

        const reportId = await ctx.runAction(
          (internal as any).ai.reports.generateReport,
          {
            userId,
            reportType: "weekly",
            weekStartDate: week.timestamp,
          }
        );

        if (reportId) {
          successCount++;
          console.log(
            `[Backfill] ✓ Report generated for ${week.date}: ${reportId}`
          );

          // Add 5-second delay between successful reports to prevent connection spikes
          if (weekIndex < weeks.length - 1) {
            // Don't delay after last report
            console.log(`[Backfill] Waiting 5s before next report...`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } else {
          skippedCount++;
          console.log(
            `[Backfill] ○ Report skipped for ${week.date} (already exists)`
          );
        }
      } catch (error: unknown) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ week: week.date, error: errorMessage });
        console.error(
          `[Backfill] ✗ Failed to generate report for ${week.date}: ${errorMessage}`
        );
        // Continue processing other weeks
        continue;
      }

      weekIndex++;
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Backfill] Backfill complete!`);
    console.log(`[Backfill] Duration: ${duration}s`);
    console.log(`[Backfill] Total weeks: ${weeks.length}`);
    console.log(`[Backfill] Reports generated: ${successCount}`);
    console.log(`[Backfill] Skipped (existing): ${skippedCount}`);
    console.log(`[Backfill] Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.error(`[Backfill] Failed weeks:`, errors);
    }

    return {
      success: true,
      userId,
      totalWeeks: weeks.length,
      generated: successCount,
      skipped: skippedCount,
      failed: errorCount,
      durationSeconds: Number(duration),
      errors,
    };
  },
});

/**
 * Backfill daily reports for past days (utility for testing/backfilling)
 *
 * Internal action to generate historical daily reports for a specific user.
 * Generates one report per day covering 24 hours starting from midnight.
 *
 * **Deduplication**: Won't create duplicate reports if run multiple times.
 *
 * @param userId - User ID to generate reports for
 * @param daysBack - Number of days to backfill (default 14 = 2 weeks)
 * @returns Summary of reports generated/skipped
 *
 * @example
 * ```bash
 * # Generate daily reports for past 2 weeks
 * npx convex run ai/reports:backfillDailyReports '{"userId":"user_123","daysBack":14}'
 *
 * # Generate daily reports for past 7 days
 * npx convex run ai/reports:backfillDailyReports '{"userId":"user_123","daysBack":7}'
 * ```
 */
export const backfillDailyReports = action({
  args: {
    userId: v.string(),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const { userId, daysBack = 14 } = args;

    console.log(
      `[Backfill Daily] Starting daily report backfill for user ${userId} (${daysBack} days)`
    );
    const startTime = Date.now();

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ date: string; error: string }> = [];

    // Generate reports for each day going back from today
    for (let i = 0; i < daysBack; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayStart = date.getTime();
      const dateStr = date.toISOString().split("T")[0];

      try {
        console.log(
          `[Backfill Daily] Generating report for ${dateStr} (day ${i + 1}/${daysBack})...`
        );

        const reportId = await ctx.runAction(
          (internal as any).ai.reports.generateReport,
          {
            userId,
            reportType: "daily",
            weekStartDate: dayStart, // Use day start as identifier
          }
        );

        if (reportId) {
          successCount++;
          console.log(
            `[Backfill Daily] ✓ Report generated for ${dateStr}: ${reportId}`
          );

          // Add 5-second delay between successful reports to prevent connection spikes
          if (i < daysBack - 1) {
            // Don't delay after last report
            console.log(`[Backfill Daily] Waiting 5s before next report...`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } else {
          skippedCount++;
          console.log(
            `[Backfill Daily] ○ Report skipped for ${dateStr} (already exists)`
          );
        }
      } catch (error: unknown) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ date: dateStr, error: errorMessage });
        console.error(
          `[Backfill Daily] ✗ Failed to generate report for ${dateStr}: ${errorMessage}`
        );
        // Continue processing other days
        continue;
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Backfill Daily] Backfill complete!`);
    console.log(`[Backfill Daily] Duration: ${duration}s`);
    console.log(`[Backfill Daily] Total days: ${daysBack}`);
    console.log(`[Backfill Daily] Reports generated: ${successCount}`);
    console.log(`[Backfill Daily] Skipped (existing): ${skippedCount}`);
    console.log(`[Backfill Daily] Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.error(`[Backfill Daily] Failed days:`, errors);
    }

    return {
      success: true,
      userId,
      totalDays: daysBack,
      generated: successCount,
      skipped: skippedCount,
      failed: errorCount,
      durationSeconds: Number(duration),
      errors,
    };
  },
});
