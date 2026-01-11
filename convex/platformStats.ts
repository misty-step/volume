import { query, internalMutation } from "./_generated/server";

/**
 * Minimum number of sets required before showing platform stats.
 * Below this threshold, the stats section is hidden to avoid
 * embarrassingly low numbers.
 */
const MIN_SETS_THRESHOLD = 100;

/** 7 days in milliseconds */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Public (unauthenticated) query for platform-wide aggregate metrics.
 * Used on the landing page for social proof.
 *
 * Reads from pre-computed cache table (updated daily via cron).
 * Returns null if no cache exists or below minimum threshold.
 */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    // Read from cache table (single document)
    const cached = await ctx.db.query("platformStatsCache").first();

    // No cache yet (first deploy or cron hasn't run)
    if (!cached) {
      return null;
    }

    // Return null if below threshold (hide section)
    if (cached.totalSets < MIN_SETS_THRESHOLD) {
      return null;
    }

    return {
      totalSets: cached.totalSets,
      totalLifters: cached.totalLifters,
      setsThisWeek: cached.setsThisWeek,
      fetchedAt: cached.computedAt,
    };
  },
});

/**
 * Internal mutation to compute and cache platform stats.
 * Called by daily cron job to avoid expensive queries on every page load.
 *
 * Overwrites the single cache document with fresh computed stats.
 */
export const computePlatformStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[PlatformStats] Computing platform statistics...");
    const startTime = Date.now();

    // Count all sets in the system (full table scan - but only once per day)
    const allSets = await ctx.db.query("sets").collect();
    const totalSets = allSets.length;

    // Count unique users with at least one set
    const uniqueUserIds = new Set(allSets.map((s) => s.userId));
    const totalLifters = uniqueUserIds.size;

    // Count sets logged in the last 7 days (activity indicator)
    const oneWeekAgo = Date.now() - SEVEN_DAYS_MS;
    const setsThisWeek = allSets.filter(
      (s) => s.performedAt >= oneWeekAgo
    ).length;

    // Upsert cache document (delete old, insert new)
    const existingCache = await ctx.db.query("platformStatsCache").first();
    if (existingCache) {
      await ctx.db.delete(existingCache._id);
    }

    await ctx.db.insert("platformStatsCache", {
      totalSets,
      totalLifters,
      setsThisWeek,
      computedAt: Date.now(),
    });

    const durationMs = Date.now() - startTime;
    console.log(
      `[PlatformStats] Computed: ${totalSets} sets, ${totalLifters} lifters, ${setsThisWeek} this week (${durationMs}ms)`
    );

    return {
      totalSets,
      totalLifters,
      setsThisWeek,
      durationMs,
    };
  },
});
