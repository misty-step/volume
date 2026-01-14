import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

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

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: args.status,
      subscriptionPeriodEnd: args.periodEnd,
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

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionPeriodEnd: args.periodEnd,
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
