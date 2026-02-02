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

/** Maximum sets to process per batch to avoid timeouts */
const BATCH_SIZE = 5000;

/**
 * Internal mutation to compute and cache platform stats.
 * Called by daily cron job to avoid expensive queries on every page load.
 *
 * Uses streaming pagination to avoid loading entire sets table into memory,
 * which prevents OOM errors and timeouts as the dataset grows.
 */
export const computePlatformStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[PlatformStats] Computing platform statistics...");
    const startTime = Date.now();

    const oneWeekAgo = Date.now() - SEVEN_DAYS_MS;
    const uniqueUserIds = new Set<string>();
    let totalSets = 0;
    let setsThisWeek = 0;
    let batchCount = 0;

    // Stream through sets in batches to avoid memory issues
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      // Paginate through the sets table
      const result = await ctx.db
        .query("sets")
        .paginate({ numItems: BATCH_SIZE, cursor });

      for (const set of result.page) {
        totalSets++;
        uniqueUserIds.add(set.userId);
        if (set.performedAt >= oneWeekAgo) {
          setsThisWeek++;
        }
      }

      batchCount++;
      hasMore = !result.isDone;
      cursor = result.continueCursor;
    }

    const totalLifters = uniqueUserIds.size;

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
      `[PlatformStats] Computed: ${totalSets} sets, ${totalLifters} lifters, ${setsThisWeek} this week (${batchCount} batches, ${durationMs}ms)`
    );

    return {
      totalSets,
      totalLifters,
      setsThisWeek,
      durationMs,
    };
  },
});
