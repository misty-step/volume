/**
 * Data Access Layer for V2 Reports
 *
 * Internal queries and mutations for storing and retrieving v2 structured reports.
 *
 * @module ai/dataV2
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Check for existing v2 report (deduplication)
 *
 * Only matches v2 reports (reportVersion: "2.0") to allow regeneration
 * from v1 to v2 format.
 *
 * @param userId - User ID
 * @param weekStartDate - Week start timestamp
 * @returns Existing report ID or null
 */
export const checkExistingReportV2 = internalQuery({
  args: {
    userId: v.string(),
    weekStartDate: v.number(),
  },
  handler: async (ctx, args) => {
    const existingReport = await ctx.db
      .query("aiReports")
      .withIndex("by_user_type_date", (q) =>
        q
          .eq("userId", args.userId)
          .eq("reportType", "weekly")
          .eq("weekStartDate", args.weekStartDate)
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
export const saveReportV2 = internalMutation({
  args: {
    userId: v.string(),
    weekStartDate: v.number(),
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

    const reportId = await ctx.db.insert("aiReports", {
      userId: args.userId,
      reportType: "weekly",
      weekStartDate: args.weekStartDate,
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
          restDays: 7 - content.metrics.workouts.value,
          avgSetsPerDay: 0,
        },
      },
      model: args.model,
      tokenUsage: args.tokenUsage,
    });

    return reportId;
  },
});
