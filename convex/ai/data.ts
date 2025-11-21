import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

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
