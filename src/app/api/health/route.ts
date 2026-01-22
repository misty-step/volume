import { NextResponse } from "next/server";
import { resolveVersion } from "@/lib/version";
import { getDeploymentEnvironment } from "@/lib/environment";

export const dynamic = "force-dynamic";

/**
 * Parse Stripe key mode from prefix.
 */
function getStripeKeyMode(key: string | undefined): "live" | "test" | "unknown" {
  if (!key) return "unknown";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "unknown";
}

/**
 * Health check endpoint for uptime monitoring.
 *
 * Returns application health status for external monitoring services
 * like UptimeRobot, BetterUptime, or Pingdom.
 *
 * Checks:
 * - Convex: Backend connectivity
 * - Stripe: Payment configuration (checkout and pricing)
 *
 * @returns 200 with health status when healthy, 503 when unhealthy
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = resolveVersion();

  // Check Convex connectivity (basic check - URL must be configured)
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexHealthy = Boolean(convexUrl);

  // Check Stripe configuration (all required for checkout flow)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID;
  const stripeConfigured = Boolean(stripeSecretKey && monthlyPriceId && annualPriceId);

  // Check key type matches environment
  const keyMode = getStripeKeyMode(stripeSecretKey);
  const deploymentEnv = getDeploymentEnvironment();
  const isProd = deploymentEnv === "production";
  const keyEnvMismatch =
    keyMode !== "unknown" &&
    ((isProd && keyMode === "test") || (!isProd && keyMode === "live"));

  const stripeHealthy = stripeConfigured && !keyEnvMismatch;
  const isHealthy = convexHealthy && stripeHealthy;

  const response = {
    status: isHealthy ? "pass" : "fail",
    timestamp,
    version,
    checks: {
      convex: { status: convexHealthy ? "pass" : "fail" },
      stripe: {
        status: stripeHealthy ? "pass" : "fail",
        keyMode,
        environment: deploymentEnv,
        // Only expose missing config names, never values
        ...(!stripeConfigured && {
          missing: [
            !stripeSecretKey && "STRIPE_SECRET_KEY",
            !monthlyPriceId && "NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID",
            !annualPriceId && "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID",
          ].filter(Boolean),
        }),
        ...(keyEnvMismatch && {
          warning: `KEY/ENV MISMATCH: ${keyMode} key in ${deploymentEnv}`,
        }),
      },
    },
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
