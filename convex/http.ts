import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

/**
 * Stripe Webhook Handler
 *
 * Receives and processes Stripe webhook events.
 * Verifies signature before processing any events.
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
        webhookSecret
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
            const subscription: Stripe.Subscription =
              await stripe.subscriptions.retrieve(
                session.subscription as string
              );

            const clerkUserId = session.metadata?.clerkUserId;
            if (clerkUserId) {
              // Link Stripe customer to user
              await ctx.runMutation(internal.subscriptions.linkStripeCustomer, {
                clerkUserId,
                stripeCustomerId: session.customer as string,
              });
            }

            // Update subscription status
            // In API version 2025-03-31+, current_period_end moved to items
            const firstItem = subscription.items?.data?.[0];
            const periodEndTimestamp = firstItem?.current_period_end;
            if (!periodEndTimestamp) {
              throw new Error(
                `Webhook Error: current_period_end not found on subscription ${subscription.id}`
              );
            }
            await ctx.runMutation(
              internal.subscriptions.updateSubscriptionFromStripe,
              {
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscription.id,
                status: "active",
                periodEnd: periodEndTimestamp * 1000,
              }
            );
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;

          let status: "active" | "canceled" | "expired" = "active";
          if (subscription.cancel_at_period_end) {
            status = "canceled";
          } else if (
            subscription.status === "canceled" ||
            subscription.status === "unpaid"
          ) {
            status = "expired";
          }

          // In API version 2025-03-31+, current_period_end moved to items
          const firstItem = subscription.items?.data?.[0];
          const periodEndTimestamp = firstItem?.current_period_end;
          if (!periodEndTimestamp) {
            throw new Error(
              `Webhook Error: current_period_end not found on subscription ${subscription.id}`
            );
          }
          const periodEnd = periodEndTimestamp * 1000;

          await ctx.runMutation(
            internal.subscriptions.updateSubscriptionFromStripe,
            {
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              status,
              periodEnd,
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
      console.error("Error processing webhook:", err);
      return new Response("Webhook processing failed", { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
