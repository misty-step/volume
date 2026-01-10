import { query } from "./_generated/server";

/**
 * Minimum number of sets required before showing platform stats.
 * Below this threshold, the stats section is hidden to avoid
 * embarrassingly low numbers.
 */
const MIN_SETS_THRESHOLD = 100;

/**
 * Public (unauthenticated) query for platform-wide aggregate metrics.
 * Used on the landing page for social proof.
 *
 * Returns null if below minimum threshold (to hide section).
 */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    // Count all sets in the system
    const allSets = await ctx.db.query("sets").collect();
    const totalSets = allSets.length;

    // Return null if below threshold (hide section)
    if (totalSets < MIN_SETS_THRESHOLD) {
      return null;
    }

    // Count unique users with at least one set
    const uniqueUserIds = new Set(allSets.map((s) => s.userId));
    const totalLifters = uniqueUserIds.size;

    // Count sets logged in the last 7 days (activity indicator)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const setsThisWeek = allSets.filter(
      (s) => s.performedAt >= oneWeekAgo
    ).length;

    return {
      totalSets,
      totalLifters,
      setsThisWeek,
      fetchedAt: Date.now(),
    };
  },
});
