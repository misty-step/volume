import Stripe from "stripe";
import { STRIPE_API_VERSION, getRequiredEnv } from "./config";

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance (lazy initialization to support build-time)
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = getRequiredEnv("STRIPE_SECRET_KEY");
    stripeInstance = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return stripeInstance;
}
