/**
 * Data Access Layer for AI Reports
 *
 * Internal queries and mutations for storing and retrieving AI reports.
 * Includes shared data fetching used by report generation.
 *
 * @module ai/data
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

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

    const [volumeData, recentPRs, allSets, exercises] = await Promise.all([
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

      // Get exercises for name lookup
      ctx.db
        .query("exercises")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    return {
      volumeData,
      recentPRs,
      allSets,
      exercises,
    };
  },
});

/**
 * Check for existing v2 report (deduplication)
 *
 * Only matches v2 reports (reportVersion: "2.0") to allow regeneration
 * from v1 to v2 format.
 *
 * @param userId - User ID
 * @param reportType - Report type (daily, weekly, monthly)
 * @param periodStartDate - Period start timestamp
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
    periodStartDate: v.number(),
  },
  handler: async (ctx, args) => {
    const existingReport = await ctx.db
      .query("aiReports")
      .withIndex("by_user_type_date", (q) =>
        q
          .eq("userId", args.userId)
          .eq("reportType", args.reportType)
          .eq("weekStartDate", args.periodStartDate)
      )
      .filter((q) => q.eq(q.field("reportVersion"), "2.0"))
      .first();

    return existingReport?._id ?? null;
  },
});

/**
 * Save a v2 structured report
 *
 * Stores the report with structured JSON content instead of markdown.
 * Uses reportVersion: "2.0" for frontend version detection.
 *
 * @param report - V2 report data
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
    periodStartDate: v.number(),
    structuredContent: v.any(),
    model: v.string(),
    tokenUsage: v.object({
      input: v.number(),
      output: v.number(),
      costUSD: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Extract metrics for metricsSnapshot (for consistency with v1)
    const content = args.structuredContent as {
      metrics: {
        volume: { value: string };
        workouts: { value: number };
        streak: { value: number };
      };
      pr: {
        hasPR: boolean;
        exercise?: string;
        type?: string;
        improvement?: string;
      };
    };

    // Parse volume value (remove commas)
    const volumeValue = parseInt(
      content.metrics.volume.value.replace(/,/g, ""),
      10
    );

    // Calculate rest days based on report type
    const periodDays =
      args.reportType === "daily" ? 1 : args.reportType === "weekly" ? 7 : 30;

    const reportId = await ctx.db.insert("aiReports", {
      userId: args.userId,
      reportType: args.reportType,
      weekStartDate: args.periodStartDate,
      generatedAt: Date.now(),
      // V2: Structured content instead of markdown
      structuredContent: args.structuredContent,
      reportVersion: "2.0",
      // Keep metricsSnapshot for consistency (used by some queries)
      metricsSnapshot: {
        volume: [
          {
            exerciseName: "Total",
            totalVolume: isNaN(volumeValue) ? 0 : volumeValue,
            sets: 0,
          },
        ],
        prs: content.pr.hasPR
          ? [
              {
                exerciseName: content.pr.exercise ?? "Unknown",
                prType: content.pr.type ?? "weight",
                improvement: parseFloat(
                  content.pr.improvement?.replace(/[^0-9.]/g, "") ?? "0"
                ),
                performedAt: Date.now(),
              },
            ]
          : [],
        streak: {
          currentStreak: content.metrics.streak.value,
          longestStreak: content.metrics.streak.value,
          totalWorkouts: content.metrics.workouts.value,
        },
        frequency: {
          workoutDays: content.metrics.workouts.value,
          restDays: Math.max(0, periodDays - content.metrics.workouts.value),
          avgSetsPerDay: 0,
        },
      },
      model: args.model,
      tokenUsage: args.tokenUsage,
    });

    return reportId;
  },
});
