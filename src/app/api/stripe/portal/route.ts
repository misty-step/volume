import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { reportError } from "@/lib/analytics";
import { createChildLogger } from "@/lib/logger";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

const routeLog = createChildLogger({ route: "stripe/portal" });

/**
 * Create a Stripe Billing Portal session for the authenticated user.
 */
export async function POST(_request: Request) {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get Convex token for authenticated request
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_CONVEX_URL" },
      { status: 500 }
    );
  }

  // Fetch stripeCustomerId server-side to prevent IDOR attacks
  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);
  let stripeCustomerId: string | null;
  try {
    stripeCustomerId = await convex.query(
      api.subscriptions.getStripeCustomerId
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Convex query failed");
    routeLog.error("Failed to fetch Stripe customer ID from Convex", { error });
    reportError(error, { context: "stripe/portal", operation: "convex_query" });
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer ID found for this account" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error("Unknown portal error");
    reportError(error, { context: "stripe/portal", stripeCustomerId });
    routeLog.error("Stripe portal session creation failed", { error });
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
