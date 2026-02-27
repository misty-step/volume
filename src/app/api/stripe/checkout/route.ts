import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { reportError } from "@/lib/analytics";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** 14-day trial period in milliseconds */
const TRIAL_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Create a Stripe Checkout session for the authenticated user.
 */
export async function POST(request: Request) {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get Convex token for authenticated request
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { priceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
  const { priceId } = body;

  // Fetch user data server-side to prevent IDOR attacks and get trial info
  convex.setAuth(token);
  const [stripeCustomerId, user] = await Promise.all([
    convex.query(api.subscriptions.getStripeCustomerId),
    convex.query(api.users.getCurrentUser),
  ]);

  // Calculate remaining trial time to honor on upgrade
  // Business rule: User upgrading mid-trial finishes trial before billing starts
  // Stripe constraint: trial_end must be at least 48 hours in the future
  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);
  const MIN_TRIAL_LEAD_TIME_SECONDS = 48 * 60 * 60; // 48 hours per Stripe docs
  const trialEndsAt =
    user?.trialEndsAt ??
    (user?._creationTime ? user._creationTime + TRIAL_PERIOD_MS : null);
  const trialEndSeconds = trialEndsAt
    ? Math.floor(trialEndsAt / 1000)
    : undefined;
  // Only pass trial_end if user has enough remaining trial (Stripe rejects <48h)
  const validTrialEnd =
    trialEndSeconds &&
    trialEndSeconds - nowSeconds >= MIN_TRIAL_LEAD_TIME_SECONDS
      ? trialEndSeconds
      : undefined;

  if (!priceId) {
    return NextResponse.json({ error: "Price ID required" }, { status: 400 });
  }

  const stripe = getStripe();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/today?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=canceled`,
      metadata: {
        clerkUserId: userId,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
        },
        // Honor remaining trial: user upgrading mid-trial finishes trial before billing
        // (only if ≥48h remaining, per Stripe's minimum lead time requirement)
        ...(validTrialEnd && { trial_end: validTrialEnd }),
      },
    };

    // Reuse existing Stripe customer if available
    // Note: In subscription mode, Stripe auto-creates customers - no customer_creation param needed
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error("Unknown checkout error");
    reportError(error, { context: "stripe/checkout", priceId });
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
