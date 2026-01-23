import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/** Check if webhook event should be skipped (duplicate or stale) */
function shouldSkipEvent(
  user: { lastStripeEventId?: string; lastStripeEventTimestamp?: number },
  eventId: string,
  eventTimestamp: number
): boolean {
  if (user.lastStripeEventId === eventId) {
    console.log(`Skipping duplicate event: ${eventId}`);
    return true;
  }
  if (user.lastStripeEventTimestamp && eventTimestamp < user.lastStripeEventTimestamp) {
    console.log(`Skipping stale event: ${eventId}`);
    return true;
  }
  return false;
}

/**
 * Internal mutation to handle checkout.session.completed
 *
 * Atomically links Stripe customer and activates subscription in one operation.
 * Uses clerkUserId (from checkout metadata) to find user, avoiding race conditions
 * that occur when linking customer ID separately from subscription update.
 *
 * Throws on missing user to trigger Stripe webhook retry.
 */
export const handleCheckoutCompleted = internalMutation({
  args: {
    clerkUserId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled")
    ),
    periodEnd: v.number(),
    // Idempotency fields
    eventId: v.string(),
    eventTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      // Throw to trigger Stripe retry - user record may not exist yet
      throw new Error(
        `No user found for Clerk ID: ${args.clerkUserId}. Stripe will retry.`
      );
    }

    if (shouldSkipEvent(user, args.eventId, args.eventTimestamp)) return;

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: args.status,
      subscriptionPeriodEnd: args.periodEnd,
      // Clear trial when subscription activates to prevent zombie trial access after cancellation
      ...(args.status === "active" && { trialEndsAt: 0 }),
      // Track event for idempotency
      lastStripeEventId: args.eventId,
      lastStripeEventTimestamp: args.eventTimestamp,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to update subscription from Stripe webhook
 *
 * Called for subscription.updated and subscription.deleted events.
 * Throws on missing user to trigger Stripe webhook retry.
 */
export const updateSubscriptionFromStripe = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("expired")
    ),
    periodEnd: v.optional(v.number()),
    // Idempotency fields
    eventId: v.string(),
    eventTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!user) {
      // Throw to trigger Stripe retry - timing issue possible
      throw new Error(
        `No user found for Stripe customer: ${args.stripeCustomerId}. Stripe will retry.`
      );
    }

    if (shouldSkipEvent(user, args.eventId, args.eventTimestamp)) return;

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionPeriodEnd: args.periodEnd,
      // Clear trial when subscription activates to prevent zombie trial access after cancellation
      ...(args.status === "active" && { trialEndsAt: 0 }),
      // Track event for idempotency
      lastStripeEventId: args.eventId,
      lastStripeEventTimestamp: args.eventTimestamp,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get Stripe customer ID for authenticated user
 *
 * Used by checkout flow to reuse existing Stripe customer.
 */
export const getStripeCustomerId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    return user?.stripeCustomerId ?? null;
  },
});

/**
 * Create Stripe billing portal session
 *
 * Returns data needed to create a Stripe billing portal session.
 * The actual session creation happens in the Next.js API route.
 */
export const getBillingInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) return null;

    return {
      stripeCustomerId: user.stripeCustomerId ?? null,
      subscriptionStatus: user.subscriptionStatus ?? "trial",
      subscriptionPeriodEnd: user.subscriptionPeriodEnd ?? null,
    };
  },
});
