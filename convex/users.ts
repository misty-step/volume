import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get or create user record
 *
 * Creates a new user record if one doesn't exist for the authenticated Clerk user.
 * If user already exists, returns their user ID.
 *
 * @param timezone - Optional IANA timezone string (e.g., "America/New_York")
 * @returns User ID (_id from users table)
 */
export const getOrCreateUser = mutation({
  args: {
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (existing) return existing._id;

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      timezone: args.timezone,
      dailyReportsEnabled: true, // Enabled for all users (paywall later)
      weeklyReportsEnabled: true, // Default on
      monthlyReportsEnabled: false, // Opt-in
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Update user timezone
 *
 * Updates the timezone for the authenticated user. If user doesn't exist,
 * creates a new user record with the provided timezone.
 *
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 */
export const updateUserTimezone = mutation({
  args: { timezone: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return; // Silent return for unauthenticated users (e.g., during auth loading)

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      // Create user if doesn't exist
      await ctx.db.insert("users", {
        clerkUserId: identity.subject,
        timezone: args.timezone,
        dailyReportsEnabled: true, // Enabled for all users
        weeklyReportsEnabled: true,
        monthlyReportsEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }

    await ctx.db.patch(user._id, {
      timezone: args.timezone,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get current authenticated user
 *
 * Returns the full user record for the currently authenticated user.
 * Useful for debugging and displaying user information in the UI.
 *
 * @returns User record or null if not authenticated/found
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    return user || null;
  },
});

/**
 * Get user creation date
 *
 * Returns the ISO date string (YYYY-MM-DD) when the user account was created.
 * Used for filtering analytics data (e.g., heatmap start date).
 *
 * @returns ISO date string or null if user not found
 */
export const getUserCreationDate = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) return null;

    // Return ISO date string (YYYY-MM-DD)
    return new Date(user.createdAt).toISOString().split("T")[0];
  },
});

/**
 * Get first workout date
 *
 * Returns the ISO date string (YYYY-MM-DD) of the user's first logged workout.
 * Used for filtering analytics data (e.g., heatmap start date) to show only
 * dates with potential workout data, even after syncing data between deployments.
 *
 * @returns ISO date string of first workout, or null if no workouts exist
 */
export const getFirstWorkoutDate = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Find the earliest set for this user
    const earliestSet = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .order("asc") // Oldest first
      .first();

    if (!earliestSet) return null;

    // Return ISO date string (YYYY-MM-DD)
    return new Date(earliestSet.performedAt).toISOString().split("T")[0];
  },
});
