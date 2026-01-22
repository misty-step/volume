import { v } from "convex/values";
import { action, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type Stripe from "stripe";
import { getPeriodEndMs, mapStripeStatus } from "./http";
import { getStripe } from "./lib/stripeConfig";

/**
 * Admin mutation: Create or update user with subscription data
 *
 * Used for one-time fixes when users pay but their record wasn't created.
 * Creates user if missing, then updates subscription fields.
 */
export const adminFixUserSubscription = mutation({
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
    // Check if user exists
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    const now = Date.now();

    if (!user) {
      // Create user with subscription
      const userId = await ctx.db.insert("users", {
        clerkUserId: args.clerkUserId,
        timezone: "America/New_York", // Default timezone
        dailyReportsEnabled: true,
        weeklyReportsEnabled: true,
        monthlyReportsEnabled: false,
        trialEndsAt: now, // Trial ended (they paid)
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        subscriptionStatus: args.status,
        subscriptionPeriodEnd: args.periodEnd,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Created user ${args.clerkUserId} with subscription`);
      return { created: true, userId };
    }

    // Update existing user
    await ctx.db.patch(user._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: args.status,
      subscriptionPeriodEnd: args.periodEnd,
      updatedAt: now,
    });
    console.log(`Updated user ${args.clerkUserId} subscription`);
    return { created: false, userId: user._id };
  },
});

/**
 * Backup sync: Fetch subscription status directly from Stripe
 *
 * Used when webhook is delayed after successful checkout.
 * Called from PaywallGate after 4 seconds if subscription hasn't updated.
 * Idempotent - safe to call even if webhook already processed.
 */
export const syncCheckoutSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Unauthorized" };
    }

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Stripe not configured";
      console.error(message);
      return { success: false, error: "Stripe not configured" };
    }

    try {
      // Fetch checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
        expand: ["subscription"],
      });

      // Security: Verify session belongs to this user
      if (session.metadata?.clerkUserId !== identity.subject) {
        console.warn(
          `Session mismatch: expected ${identity.subject}, got ${session.metadata?.clerkUserId}`
        );
        return { success: false, error: "Session mismatch" };
      }

      // Check if payment completed
      if (session.payment_status !== "paid") {
        return { success: false, error: "Payment not completed" };
      }

      if (!session.subscription || typeof session.subscription === "string") {
        // Subscription not expanded or doesn't exist
        return { success: false, error: "No subscription found" };
      }

      const subscription = session.subscription as Stripe.Subscription;
      const status = mapStripeStatus(subscription);
      const periodEnd = getPeriodEndMs(subscription);

      // Update database (same as webhook handler, idempotent)
      await ctx.runMutation(internal.subscriptions.handleCheckoutCompleted, {
        clerkUserId: identity.subject,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        status,
        periodEnd,
      });

      console.log(`Backup sync successful for user ${identity.subject}`);
      return { success: true };
    } catch (error) {
      console.error("Sync checkout session failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  },
});

/**
 * Admin action: Sync a user's subscription by email
 *
 * Used to fix affected users who paid but got stuck.
 * Fetches subscription from Stripe and updates Convex database.
 */
export const syncUserByEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Note: This is an admin-only action - should add proper admin auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Unauthorized" };
    }

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Stripe not configured";
      console.error(message);
      return { success: false, error: "Stripe not configured" };
    }

    try {
      // Find customer by email in Stripe
      const customers = await stripe.customers.list({
        email: args.email,
        limit: 1,
      });

      const customer = customers.data[0];
      if (!customer) {
        return { success: false, error: "No Stripe customer found" };
      }

      // Find active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });

      const subscription = subscriptions.data[0];
      if (!subscription) {
        return { success: false, error: "No active subscription" };
      }

      // Find user in Convex by email (need to add this query)
      // For now, return the data so it can be manually applied
      return {
        success: true,
        data: {
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          status: mapStripeStatus(subscription),
          periodEnd: getPeriodEndMs(subscription),
        },
      };
    } catch (error) {
      console.error("Sync user by email failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  },
});
