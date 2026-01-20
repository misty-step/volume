import "server-only";
import Stripe from "stripe";
import { STRIPE_API_VERSION, getRequiredEnv } from "./config";
import { getDeploymentEnvironment } from "@/lib/environment";

/**
 * Parse Stripe key mode from prefix.
 * Returns null for keys without live/test indicator (webhook secrets, etc.)
 */
function parseKeyMode(key: string): "live" | "test" | null {
  if (key.startsWith("sk_live_") || key.startsWith("pk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("pk_test_")) return "test";
  return null;
}

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance (lazy initialization to support build-time)
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = getRequiredEnv("STRIPE_SECRET_KEY");
    const keyMode = parseKeyMode(key);
    const env = getDeploymentEnvironment();
    const isProd = env === "production";

    // Validate key type matches environment
    if (keyMode) {
      if (isProd && keyMode === "test") {
        throw new Error(
          `FATAL: Test Stripe key (sk_test_*) in production.\n` +
            `This would process test payments, not real ones.\n` +
            `Set STRIPE_SECRET_KEY to sk_live_* in Vercel production.`
        );
      }
      if (!isProd && keyMode === "live") {
        throw new Error(
          `FATAL: Live Stripe key (sk_live_*) in ${env}.\n` +
            `This would charge real money for test transactions.\n` +
            `Set STRIPE_SECRET_KEY to sk_test_* for ${env}.`
        );
      }
    }

    stripeInstance = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return stripeInstance;
}
