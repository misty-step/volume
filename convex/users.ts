import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Number of days for free trial period */
const TRIAL_PERIOD_DAYS = 14;
const TRIAL_PERIOD_MS = TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000;

function getTrialEndsAt(now: number) {
  return now + TRIAL_PERIOD_MS;
}

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

    // Create new user with trial
    const now = Date.now();
    const trialEndsAt = getTrialEndsAt(now);

    const userId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      timezone: args.timezone,
      dailyReportsEnabled: true,
      weeklyReportsEnabled: true,
      monthlyReportsEnabled: false,
      trialEndsAt,
      subscriptionStatus: "trial",
      createdAt: now,
      updatedAt: now,
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
      // Create user if doesn't exist (with trial)
      const now = Date.now();
      const trialEndsAt = getTrialEndsAt(now);

      await ctx.db.insert("users", {
        clerkUserId: identity.subject,
        timezone: args.timezone,
        dailyReportsEnabled: true,
        weeklyReportsEnabled: true,
        monthlyReportsEnabled: false,
        trialEndsAt,
        subscriptionStatus: "trial",
        createdAt: now,
        updatedAt: now,
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

/**
 * Get subscription status for the current user
 *
 * Returns subscription state used by PaywallGate to determine access.
 * Computes hasAccess based on trial validity or active subscription.
 */
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) return null;

    const now = Date.now();
    const trialEndsAt = user.trialEndsAt ?? 0;
    const status = user.subscriptionStatus ?? "trial";

    // Determine access: active/past_due subscription OR valid trial OR canceled but still in period
    const hasAccess =
      status === "active" ||
      status === "past_due" ||
      (status === "trial" && trialEndsAt > now) ||
      (status === "canceled" && (user.subscriptionPeriodEnd ?? 0) > now);

    // Calculate days remaining in trial (for countdown banner)
    const trialDaysRemaining =
      status === "trial" && trialEndsAt > now
        ? Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000))
        : 0;

    return {
      status,
      hasAccess,
      trialEndsAt: status === "trial" ? trialEndsAt : null,
      trialDaysRemaining,
      subscriptionPeriodEnd: user.subscriptionPeriodEnd ?? null,
    };
  },
});
