/**
 * AI Report Generation and Retrieval
 *
 * Public API for accessing and generating AI reports.
 *
 * @module ai/reports
 */

import { v } from "convex/values";
import { query, action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { getLimits, type RateLimitResult } from "../lib/rateLimit";

type ReportDoc = Doc<"aiReports">;
type ReportId = Id<"aiReports">;
type BackfillWeekError = { week: string; error: string };
type BackfillDayError = { date: string; error: string };

interface BackfillSummaryBase {
  success: true;
  userId: string;
  generated: number;
  skipped: number;
  failed: number;
  durationSeconds: number;
}

interface WeeklyBackfillSummary extends BackfillSummaryBase {
  totalWeeks: number;
  errors: BackfillWeekError[];
}

interface DailyBackfillSummary extends BackfillSummaryBase {
  totalDays: number;
  errors: BackfillDayError[];
}

/**
 * Get latest AI report for authenticated user
 *
 * Returns the most recently generated report, or null if no reports exist.
 * Automatically filters by authenticated user. Optionally filter by report type.
 *
 * @param reportType - Optional filter for specific report type (daily/weekly/monthly)
 * @returns Most recent report (optionally filtered by type) or null
 */
export const getLatestReport = query({
  args: {
    reportType: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
  },
  handler: async (ctx, args): Promise<ReportDoc | null> => {
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
 */
export const getReportHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ReportDoc[]> => {
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
 * Generate AI report on-demand (user-triggered)
 *
 * User-facing action that generates a new AI workout analysis report.
 * Includes rate limiting to prevent abuse and manage API costs.
 *
 * **Rate Limiting**: 5 reports per user per day
 */
export const generateOnDemandReport = action({
  args: {},
  handler: async (ctx): Promise<ReportId> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to generate reports");
    }

    const userId = identity.subject;

    // Rate limit: daily cap per user (via internal mutation for action context)
    const limits = getLimits();
    const dailyLimit = limits["aiReport:onDemand"];
    if (!dailyLimit) {
      throw new Error("Rate limit configuration missing for aiReport:onDemand");
    }
    const rateLimitResult: RateLimitResult = await ctx.runMutation(
      internal.lib.rateLimit.checkRateLimitInternal,
      {
        userId,
        scope: "aiReport:onDemand",
        limit: dailyLimit.limit,
        windowMs: dailyLimit.windowMs,
      }
    );

    console.log(
      `[On-Demand] User generating report (${dailyLimit.limit - rateLimitResult.remaining}/${dailyLimit.limit} today)`
    );

    // Generate report via internal action
    try {
      const reportId = await ctx.runAction(
        internal.ai.generateV2.generateReportV2,
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
 * Action to generate historical weekly reports for a specific user.
 * Now secured to only allow users to backfill their own reports.
 *
 * @param userId - User ID to generate reports for
 * @returns Summary of reports generated/skipped
 */
export const backfillWeeklyReports = action({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<WeeklyBackfillSummary> => {
    const { userId } = args;

    // Security check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    if (identity.subject !== userId) {
      // Could also check for admin role here
      throw new Error("You can only generate reports for your own account");
    }

    console.log(
      `[Backfill] Starting weekly report backfill for user ${userId}`
    );
    const startTime = Date.now();

    // Past 5 weeks with known workout data (from analysis)
    const weeks: Array<{
      date: string;
      timestamp: number;
      expectedSets: number;
    }> = [
      { date: "2025-10-27", timestamp: 1761523200000, expectedSets: 82 },
      { date: "2025-10-20", timestamp: 1760918400000, expectedSets: 61 },
      { date: "2025-10-13", timestamp: 1760313600000, expectedSets: 44 },
      { date: "2025-10-06", timestamp: 1759708800000, expectedSets: 34 },
      { date: "2025-09-29", timestamp: 1759104000000, expectedSets: 15 },
    ];

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: BackfillWeekError[] = [];

    let weekIndex = 0;
    for (const week of weeks) {
      try {
        console.log(
          `[Backfill] Generating report for week of ${week.date} (${week.expectedSets} sets expected)...`
        );

        const reportId = await ctx.runAction(
          internal.ai.generateV2.generateReportV2,
          {
            userId,
            reportType: "weekly",
            periodStartDate: week.timestamp,
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
 * Action to generate historical daily reports for a specific user.
 * Now secured to only allow users to backfill their own reports.
 *
 * @param userId - User ID to generate reports for
 * @param daysBack - Number of days to backfill (default 14 = 2 weeks)
 * @returns Summary of reports generated/skipped
 */
export const backfillDailyReports = action({
  args: {
    userId: v.string(),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DailyBackfillSummary> => {
    const { userId, daysBack = 14 } = args;

    // Security check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    if (identity.subject !== userId) {
      throw new Error("You can only generate reports for your own account");
    }

    console.log(
      `[Backfill Daily] Starting daily report backfill for user ${userId} (${daysBack} days)`
    );
    const startTime = Date.now();

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: BackfillDayError[] = [];

    // Generate reports for each day going back from today
    for (let i = 0; i < daysBack; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayStart = date.getTime();
      const [dateStr] = date.toISOString().split("T");
      if (!dateStr) {
        throw new Error("Unable to format date string for daily backfill");
      }

      try {
        console.log(
          `[Backfill Daily] Generating report for ${dateStr} (day ${i + 1}/${daysBack})...`
        );

        const reportId = await ctx.runAction(
          internal.ai.generateV2.generateReportV2,
          {
            userId,
            reportType: "daily",
            periodStartDate: dayStart,
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
