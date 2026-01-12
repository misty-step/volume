import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance (lazy initialization to support build-time)
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

// Price IDs - set these in Stripe Dashboard (use NEXT_PUBLIC_ for client access)
export const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
  annual: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID,
} as const;
