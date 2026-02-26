import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { reportError } from "@/lib/analytics";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Create a Stripe Billing Portal session for the authenticated user.
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

  // Fetch stripeCustomerId server-side to prevent IDOR attacks
  convex.setAuth(token);
  const stripeCustomerId = await convex.query(
    api.subscriptions.getStripeCustomerId
  );

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
      return_url: `${baseUrl}/today?prompt=show%20settings%20overview`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error("Unknown portal error");
    reportError(error, { context: "stripe/portal", stripeCustomerId });
    console.error("Error creating portal session:", err);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
