import Stripe from "stripe";

export const STRIPE_API_VERSION = "2025-12-15.clover";

export function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required Stripe environment variable: ${key}`);
  }
  return value;
}

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = getRequiredEnv("STRIPE_SECRET_KEY");
    stripeInstance = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return stripeInstance;
}
