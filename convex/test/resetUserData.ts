import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Deletes all user data for testing purposes.
 * This function is intended to be called only in test environments.
 * It requires a secret key to execute.
 */
export const resetUserData = mutation({
  args: {
    userId: v.string(), // The user to wipe
    secret: v.string(), // Must match env var
  },
  handler: async (ctx, args) => {
    // 1. Validate Secret (Loaded from environment variable in Convex dashboard)
    // Note: In dev, we can check process.env.TEST_RESET_SECRET
    // But Convex env vars are different.
    // We'll assume the caller checked it? No, unsafe.
    // We need to check it here.

    const expectedSecret = process.env.TEST_RESET_SECRET;
    if (!expectedSecret || args.secret !== expectedSecret) {
      throw new Error("Unauthorized: Invalid test secret");
    }

    // 2. Delete sets
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    // 3. Delete exercises
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const ex of exercises) {
      await ctx.db.delete(ex._id);
    }

    // 4. Delete AI reports
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
