import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to update subscription from Stripe webhook
 *
 * Called by the Next.js API route after verifying the Stripe webhook signature.
 * Updates user subscription status based on Stripe events.
 */
export const updateSubscriptionFromStripe = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
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
      console.error(
        `No user found for Stripe customer: ${args.stripeCustomerId}`
      );
      return;
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
 * Internal mutation to link Stripe customer to user
 *
 * Called when checkout.session.completed with a new customer.
 * Links the Stripe customer ID to the Clerk user.
 */
export const linkStripeCustomer = internalMutation({
  args: {
    clerkUserId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.error(`No user found for Clerk ID: ${args.clerkUserId}`);
      return;
    }

    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
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
