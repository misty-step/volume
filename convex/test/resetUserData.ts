import { mutation } from "../_generated/server";

const PROD_DEPLOYMENT = "whimsical-marten-631";

function isProductionDeployment(): boolean {
  const url = process.env.CONVEX_CLOUD_URL || "";
  return url.includes(PROD_DEPLOYMENT);
}

/**
 * Deletes all user data for testing purposes.
 * This function is intended to be called only from the guarded Next.js test
 * reset route in non-production environments.
 */
export const resetUserData = mutation({
  args: {},
  handler: async (ctx) => {
    if (isProductionDeployment()) {
      throw new Error("Unauthorized: Reset unavailable in production");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    // Delete sets
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    // Delete exercises
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const ex of exercises) {
      await ctx.db.delete(ex._id);
    }

    // Delete AI reports
    const reports = await ctx.db
      .query("aiReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const rep of reports) {
      await ctx.db.delete(rep._id);
    }

    console.log(
      `[TEST RESET] Deleted ${sets.length} sets, ${exercises.length} exercises, ${reports.length} reports for user ${userId}`
    );
  },
});
