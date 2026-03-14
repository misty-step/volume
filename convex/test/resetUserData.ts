import { v } from "convex/values";
import { mutation } from "../_generated/server";

const PROD_DEPLOYMENT = "whimsical-marten-631";

function isProductionDeployment() {
  const url = process.env.CONVEX_CLOUD_URL || "";
  return url.includes(PROD_DEPLOYMENT);
}

/**
 * Deletes all user data for test-only flows.
 * This stays unavailable on the production Convex deployment.
 */
export const resetUserData = mutation({
  args: {
    userId: v.string(), // The user to wipe
  },
  handler: async (ctx, args) => {
    if (isProductionDeployment()) {
      throw new Error("Unauthorized: Reset is disabled in production");
    }

    // The outer Next.js test route validates TEST_RESET_SECRET before calling
    // this mutation. Here we only enforce non-production scope + ownership.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    // 1. Delete sets
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    // 2. Delete exercises
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const ex of exercises) {
      await ctx.db.delete(ex._id);
    }

    // 3. Delete AI reports
    const reports = await ctx.db
      .query("aiReports")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const rep of reports) {
      await ctx.db.delete(rep._id);
    }

    console.log(
      `[TEST RESET] Deleted ${sets.length} sets, ${exercises.length} exercises, ${reports.length} reports for user ${args.userId}`
    );
  },
});
