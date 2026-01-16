import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

/**
 * Extract current_period_end from Stripe subscription
 *
 * API version 2025-12-15.clover: current_period_end is on subscription items.
 */
export function getPeriodEndMs(subscription: Stripe.Subscription): number {
  const periodEnd = subscription.items?.data?.[0]?.current_period_end;

  if (!periodEnd) {
    throw new Error(
      `current_period_end not found on subscription ${subscription.id}`
    );
  }
  return periodEnd * 1000;
}

/**
 * Map Stripe subscription to our status
 *
 * Key distinction: Stripe's "canceled" means "won't renew but still paid through period end"
 * We map this to "canceled" (not "expired") so hasAccess logic can check period end.
 */
export function mapStripeStatus(
  subscription: Stripe.Subscription
): "active" | "past_due" | "canceled" | "trial" {
  // User requested cancellation but still has access until period end
  if (subscription.cancel_at_period_end) {
    return "canceled";
  }

  switch (subscription.status) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    default:
      // These statuses mean no active access
      return "canceled";
  }
}

/**
 * Stripe Webhook Handler
 *
 * Receives and processes Stripe webhook events.
 * Verifies signature before processing any events.
 * Returns 500 on processing errors to trigger Stripe retry.
 */
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      console.error("Missing Stripe configuration");
      return new Response("Server configuration error", { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
    });

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined, // crypto provider (use default)
        Stripe.createSubtleCryptoProvider(),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Webhook signature verification failed: ${message}`);
      return new Response(`Webhook Error: ${message}`, { status: 400 });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          if (session.subscription && session.customer) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            const clerkUserId = session.metadata?.clerkUserId;
            if (!clerkUserId) {
              throw new Error("Missing clerkUserId in checkout session metadata");
            }

            // Atomic operation: link customer + activate subscription
            const stripeStatus = mapStripeStatus(subscription);
            await ctx.runMutation(internal.subscriptions.handleCheckoutCompleted, {
              clerkUserId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscription.id,
              status: stripeStatus,
              periodEnd: getPeriodEndMs(subscription),
            });
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const status = mapStripeStatus(subscription);

          await ctx.runMutation(
            internal.subscriptions.updateSubscriptionFromStripe,
            {
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              status,
              periodEnd: getPeriodEndMs(subscription),
            }
          );
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;

          await ctx.runMutation(
            internal.subscriptions.updateSubscriptionFromStripe,
            {
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: undefined,
              status: "expired",
              periodEnd: undefined,
            }
          );
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error processing webhook:", { eventType: event.type, eventId: event.id, error: message });
      return new Response(`Webhook processing failed: ${message}`, { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
