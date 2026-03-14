import { NextResponse } from "next/server";
import { resolveVersion } from "@/lib/version";
import { getDeploymentEnvironment } from "@/lib/environment";
import {
  getCoachRuntimeHealthMetadata,
  isOpenRouterConfigured,
} from "@/lib/openrouter/policy";

export const dynamic = "force-dynamic";

/**
 * Parse Stripe key mode from prefix.
 */
function getStripeKeyMode(
  key: string | undefined
): "live" | "test" | "unknown" {
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
 * - Client runtime: public auth/backend config for browser bootstrap
 * - Convex: Backend connectivity
 * - Stripe: Payment configuration (checkout and pricing)
 * - Coach runtime: OpenRouter API key availability for agent execution
 * - Sentry: client and server DSNs for production error capture
 *
 * @returns 200 with health status when healthy, 503 when unhealthy
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = resolveVersion();

  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  const clientRuntimeHealthy = Boolean(clerkPublishableKey && convexUrl);
  const convexHealthy = Boolean(convexUrl);

  // Check Stripe configuration (all required for checkout flow)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID;
  const stripeConfigured = Boolean(
    stripeSecretKey && monthlyPriceId && annualPriceId
  );

  // Check key type matches environment
  const keyMode = getStripeKeyMode(stripeSecretKey);
  const deploymentEnv = getDeploymentEnvironment();
  const isProd = deploymentEnv === "production";
  const keyEnvMismatch =
    keyMode !== "unknown" &&
    ((isProd && keyMode === "test") || (!isProd && keyMode === "live"));

  const stripeHealthy = stripeConfigured && !keyEnvMismatch;
  const coachRuntimeHealthy = isOpenRouterConfigured();
  const coachRuntimeMetadata = getCoachRuntimeHealthMetadata();
  const clientSentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  const serverSentryDsn = process.env.SENTRY_DSN?.trim();
  const sentryHealthy = Boolean(clientSentryDsn && serverSentryDsn);

  const isHealthy =
    clientRuntimeHealthy &&
    convexHealthy &&
    stripeHealthy &&
    coachRuntimeHealthy &&
    sentryHealthy;

  const response = {
    status: isHealthy ? "pass" : "fail",
    timestamp,
    version,
    checks: {
      clientRuntime: {
        status: clientRuntimeHealthy ? "pass" : "fail",
        ...(!clientRuntimeHealthy && {
          missing: [
            !clerkPublishableKey && "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
            !convexUrl && "NEXT_PUBLIC_CONVEX_URL",
          ].filter(Boolean),
        }),
      },
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
      coachRuntime: {
        status: coachRuntimeHealthy ? "pass" : "fail",
        ...coachRuntimeMetadata,
        ...(!coachRuntimeHealthy && {
          missing: [coachRuntimeMetadata.apiKeyEnvVar],
        }),
      },
      sentry: {
        status: sentryHealthy ? "pass" : "fail",
        ...(!sentryHealthy && {
          missing: [
            !clientSentryDsn && "NEXT_PUBLIC_SENTRY_DSN",
            !serverSentryDsn && "SENTRY_DSN",
          ].filter(Boolean),
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
