import Stripe from "stripe";

export const STRIPE_API_VERSION = "2025-12-15.clover";

// Production deployment identifier (from CONVEX_CLOUD_URL pattern)
const PROD_DEPLOYMENT = "whimsical-marten-631";

/**
 * Detect if running in production Convex deployment.
 * Uses CONVEX_CLOUD_URL which contains the deployment name.
 */
function isProductionDeployment(): boolean {
  const url = process.env.CONVEX_CLOUD_URL || "";
  return url.includes(PROD_DEPLOYMENT);
}

/**
 * Parse Stripe key mode from prefix.
 * Returns null for keys without live/test indicator (webhook secrets, etc.)
 */
function parseKeyMode(key: string): "live" | "test" | null {
  if (key.startsWith("sk_live_") || key.startsWith("pk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("pk_test_")) return "test";
  return null;
}

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
    const keyMode = parseKeyMode(key);
    const isProd = isProductionDeployment();

    // Validate key type matches environment
    if (keyMode) {
      if (isProd && keyMode === "test") {
        throw new Error(
          `FATAL: Test Stripe key (sk_test_*) in production deployment.\n` +
            `This would process test payments, not real ones.\n` +
            `Set STRIPE_SECRET_KEY to sk_live_* for production.`
        );
      }
      if (!isProd && keyMode === "live") {
        throw new Error(
          `FATAL: Live Stripe key (sk_live_*) in development deployment.\n` +
            `This would charge real money for test transactions.\n` +
            `Set STRIPE_SECRET_KEY to sk_test_* for development.`
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
