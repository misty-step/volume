/**
 * Scheduled Tasks (Cron Jobs)
 *
 * Defines automated background jobs that run on a schedule:
 * - Daily AI reports: Hourly cron with timezone-aware midnight detection
 * - Weekly AI reports: Sunday 9 PM UTC for active users
 * - Monthly AI reports: 1st of month at midnight UTC for opted-in users
 *
 * @module crons
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query to get active user IDs
 *
 * Returns list of user IDs who logged a workout in the last N days.
 * Used by cron job to identify eligible users for report generation.
 *
 * @param days - Number of days to look back (default: 14)
 * @returns Array of unique user IDs
 */
export const getActiveUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    const recentSets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed")
      .filter((q) => q.gte(q.field("performedAt"), fourteenDaysAgo))
      .collect();

    const activeUserIds = Array.from(
      new Set(recentSets.map((set) => set.userId))
    );

    return activeUserIds;
  },
});

/**
 * Weekly AI Report Generation Action
 *
 * Internal action that generates weekly workout analysis reports for
 * all active users (those who logged a workout in the last 14 days).
 *
 * **Process**:
 * 1. Query active users (workout in last 14 days)
 * 2. Generate report for each user via internal mutation
 * 3. Deduplication handled by generateReport (checks existing reports)
 * 4. Error logging for individual failures (doesn't crash batch)
 *
 * **Rate Limiting**: Max 100 users per run
 * - Prevents long-running jobs and API rate limits
 * - Typical runtime: ~5 min for 100 users (OpenAI latency ~3s/user)
 *
 * **Cost Management**:
 * - Only generates for active users (not entire user base)
 * - Deduplication prevents duplicate API calls
 * - ~$0.002 per report × active users
 */
export const generateWeeklyReports = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("[Cron] Starting weekly AI report generation...");
    const startTime = Date.now();

    try {
      // Query active users (workout in last 14 days)
      const activeUserIds = await ctx.runQuery(
        (internal as any).crons.getActiveUserIds,
        {}
      );

      console.log(
        `[Cron] Found ${activeUserIds.length} active users (logged workout in last 14 days)`
      );

      // Rate limit: Max 100 users per run
      const MAX_USERS_PER_RUN = 100;
      const usersToProcess = activeUserIds.slice(0, MAX_USERS_PER_RUN);

      if (activeUserIds.length > MAX_USERS_PER_RUN) {
        console.warn(
          `[Cron] Rate limiting: Processing ${MAX_USERS_PER_RUN} of ${activeUserIds.length} active users`
        );
      }

      // Track results
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ userId: string; error: string }> = [];

      // Generate reports for each active user
      for (const userId of usersToProcess) {
        try {
          console.log(`[Cron] Generating report for user: ${userId}`);

          await ctx.runAction((internal as any).ai.generate.generateReport, {
            userId,
            // weekStartDate will default to current week in generateReport
          });

          successCount++;
          console.log(
            `[Cron] ✓ Report generated for ${userId} (${successCount}/${usersToProcess.length})`
          );
        } catch (error: unknown) {
          errorCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push({ userId, error: errorMessage });

          console.error(
            `[Cron] ✗ Failed to generate report for ${userId}: ${errorMessage}`
          );

          // Continue processing other users (don't crash entire batch)
          continue;
        }
      }

      // Summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Cron] Weekly report generation complete!`);
      console.log(`[Cron] Duration: ${duration}s`);
      console.log(`[Cron] Total active users: ${activeUserIds.length}`);
      console.log(`[Cron] Users processed: ${usersToProcess.length}`);
      console.log(`[Cron] Reports generated: ${successCount}`);
      console.log(`[Cron] Errors: ${errorCount}`);

      if (errors.length > 0) {
        console.error(`[Cron] Failed users:`, errors);
      }

      // Log final metrics for monitoring
      return {
        success: true,
        activeUsers: activeUserIds.length,
        processed: usersToProcess.length,
        succeeded: successCount,
        failed: errorCount,
        durationSeconds: Number(duration),
        errors: errors.slice(0, 10), // Log first 10 errors only
      };
    } catch (error: unknown) {
      // Fatal error (e.g., database unavailable)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[Cron] FATAL ERROR in weekly report generation:`,
        errorMessage
      );

      return {
        success: false,
        error: errorMessage,
        durationSeconds: ((Date.now() - startTime) / 1000).toFixed(1),
      };
    }
  },
});

/**
 * Get local hour from UTC hour for a given timezone
 *
 * @param utcHour - UTC hour (0-23)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Local hour (0-23) in the specified timezone
 */
function getLocalHourFromUTC(utcHour: number, timezone: string): number {
  const now = new Date();
  now.setUTCHours(utcHour, 0, 0, 0);

  // Use Intl.DateTimeFormat to convert to local timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
    hourCycle: "h23", // Force 0-23 range to prevent hour 24 at midnight
  });

  const localHour = parseInt(formatter.format(now));
  return localHour;
}

/**
 * Internal query to get eligible users for daily reports
 *
 * Returns list of user IDs whose local time is currently midnight (hour 0).
 * Robustness: Also returns users in hours 1 and 2 to catch missed runs.
 *
 * @param currentHourUTC - Current UTC hour (0-23)
 * @returns Array of objects { userId, timezone }
 */
export const getEligibleUsersForDailyReports = internalQuery({
  args: { currentHourUTC: v.number() },
  handler: async (ctx, args) => {
    // Get all users with dailyReportsEnabled = true
    const users = await ctx.db
      .query("users")
      .withIndex("by_daily_enabled", (q) => q.eq("dailyReportsEnabled", true))
      .collect();

    const eligibleUsers = [];

    for (const user of users) {
      if (!user.timezone) continue;

      // Calculate local hour for user's timezone
      const localHour = getLocalHourFromUTC(args.currentHourUTC, user.timezone);

      // Check if local time is within midnight window (0, 1, 2)
      // This provides 3 chances to generate the report
      if (localHour >= 0 && localHour <= 2) {
        eligibleUsers.push({
          userId: user.clerkUserId,
          timezone: user.timezone,
        });
      }
    }

    return eligibleUsers;
  },
});

/**
 * Calculate start of YESTERDAY based on user's timezone.
 * This is the canonical timestamp for the daily report generated at midnight.
 */
function getPreviousDayStartInTimezone(timezone: string): number {
  const now = new Date();

  // Use Intl to find the date parts in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1; // 0-indexed
  const day = parseInt(parts.find((p) => p.type === "day")!.value);

  // Canonical timestamp for "Today 00:00 UTC" (based on local date)
  const todayStartUTC = Date.UTC(year, month, day);

  // Return yesterday (minus 24 hours)
  return todayStartUTC - 24 * 60 * 60 * 1000;
}

/**
 * Daily AI Report Generation Action
 *
 * Internal action that generates daily workout analysis reports for
 * users whose local time is currently midnight (hour 0-2).
 *
 * **Process**:
 * 1. Get current UTC hour
 * 2. Query users with dailyReportsEnabled where local time is 0-2
 * 3. Generate daily report for each eligible user
 * 4. Error logging for individual failures
 *
 * **Timezone Awareness**:
 * - Runs every hour on the hour (UTC)
 * - Checks each user's timezone
 * - Distributes load across 24 hours (not all users at once)
 * - Retry window (hours 0, 1, 2) ensures robustness against missed jobs
 *
 * **Cost Management**:
 * - Only generates for opted-in users (dailyReportsEnabled = true)
 * - Deduplication prevents duplicate API calls
 * - ~$0.001 per daily report (shorter than weekly)
 */
export const generateDailyReports = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("[Cron] Starting daily AI report generation...");
    const startTime = Date.now();

    const currentHourUTC = new Date().getUTCHours();

    // Get eligible users for this hour
    const eligibleUsers = await ctx.runQuery(
      (internal as any).crons.getEligibleUsersForDailyReports,
      { currentHourUTC }
    );

    console.log(
      `[Cron] Found ${eligibleUsers.length} users eligible for daily reports (local hour 0-2 at UTC ${currentHourUTC}:00)`
    );

    // Generate reports
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const { userId, timezone } of eligibleUsers) {
      try {
        // Calculate canonical "Yesterday" timestamp for this user
        // This is the report date.
        const reportDate = getPreviousDayStartInTimezone(timezone);

        await ctx.runAction((internal as any).ai.generate.generateReport, {
          userId,
          reportType: "daily",
          weekStartDate: reportDate, // Pass canonical day start for deduplication
        });
        successCount++;
      } catch (error: unknown) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ userId, error: errorMessage });
        console.error(
          `[Cron] Failed to generate daily report for ${userId}: ${errorMessage}`
        );
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Cron] Daily report generation complete!`);
    console.log(`[Cron] Duration: ${duration}s`);
    console.log(`[Cron] Reports generated: ${successCount}`);
    console.log(`[Cron] Errors: ${errorCount}`);

    return {
      success: true,
      processed: eligibleUsers.length,
      succeeded: successCount,
      failed: errorCount,
      durationSeconds: Number(duration),
      errors: errors.slice(0, 10),
    };
  },
});

/**
 * Internal query to get users with monthly reports enabled
 *
 * Returns list of user IDs who have opted in to monthly reports.
 *
 * @returns Array of user IDs (clerkUserId)
 */
export const getActiveUsersWithMonthlyReports = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("monthlyReportsEnabled"), true))
      .collect();

    return users.map((u) => u.clerkUserId);
  },
});

/**
 * Monthly AI Report Generation Action
 *
 * Internal action that generates monthly workout analysis reports for
 * users with monthlyReportsEnabled = true.
 *
 * **Process**:
 * 1. Query all users with monthlyReportsEnabled = true
 * 2. Generate monthly report for each user (previous calendar month)
 * 3. Error logging for individual failures
 *
 * **Timing**:
 * - Runs on 1st day of month at midnight UTC
 * - Generates reports for previous full month
 *
 * **Cost Management**:
 * - Only generates for opted-in users
 * - Deduplication prevents duplicate API calls
 * - ~$0.003 per monthly report (longer than daily/weekly)
 */
export const generateMonthlyReports = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("[Cron] Starting monthly AI report generation...");
    const startTime = Date.now();

    // Get all users with monthlyReportsEnabled = true
    const users = await ctx.runQuery(
      (internal as any).crons.getActiveUsersWithMonthlyReports,
      {}
    );

    console.log(
      `[Cron] Found ${users.length} users eligible for monthly reports`
    );

    // Generate reports
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userId of users) {
      try {
        await ctx.runAction((internal as any).ai.generate.generateReport, {
          userId,
          reportType: "monthly",
        });
        successCount++;
      } catch (error: unknown) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ userId, error: errorMessage });
        console.error(
          `[Cron] Failed to generate monthly report for ${userId}: ${errorMessage}`
        );
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Cron] Monthly report generation complete!`);
    console.log(`[Cron] Duration: ${duration}s`);
    console.log(`[Cron] Reports generated: ${successCount}`);
    console.log(`[Cron] Errors: ${errorCount}`);

    return {
      success: true,
      processed: users.length,
      succeeded: successCount,
      failed: errorCount,
      durationSeconds: Number(duration),
      errors: errors.slice(0, 10),
    };
  },
});

/**
 * Cron Schedule Configuration
 *
 * Three scheduled report generation jobs:
 * - Daily: Hourly cron with timezone-aware midnight detection
 * - Weekly: Sunday 9 PM UTC for active users
 * - Monthly: 1st of month at midnight UTC for opted-in users
 */
const crons = cronJobs();

// Daily reports: Run every hour at minute 0
crons.hourly(
  "generate-daily-reports",
  { minuteUTC: 0 },
  (internal as any).crons.generateDailyReports
);

// Weekly reports: Run every Sunday at 9 PM UTC
crons.weekly(
  "generate-weekly-reports",
  {
    hourUTC: 21, // 9 PM UTC
    minuteUTC: 0,
    dayOfWeek: "sunday",
  },
  (internal as any).crons.generateWeeklyReports
);

// Monthly reports: Run on 1st day of month at midnight UTC
crons.monthly(
  "generate-monthly-reports",
  {
    day: 1,
    hourUTC: 0,
    minuteUTC: 0,
  },
  (internal as any).crons.generateMonthlyReports
);

export default crons;
