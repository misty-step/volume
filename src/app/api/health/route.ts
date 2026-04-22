import { NextResponse } from "next/server";
import {
  getCanaryInitOptions,
  getServerCanaryConfigSource,
} from "@/lib/canary";
import { hasInvalidHttpUrl } from "@/lib/http-url";
import { resolveVersion } from "@/lib/version";
import { getDeploymentEnvironment } from "@/lib/environment";
import {
  getCoachRuntimeHealthMetadata,
  isOpenRouterConfigured,
} from "@/lib/openrouter/policy";

export const dynamic = "force-dynamic";

type HealthCheckStatus = "pass" | "fail";

function createCheck(
  status: HealthCheckStatus,
  details: Record<string, unknown> = {}
) {
  return { status, ...details };
}

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
 * - Error tracking: Canary runtime capture for browser + server
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
  const clientCanaryConfigured = Boolean(getCanaryInitOptions("client"));
  const serverCanaryConfigSource = getServerCanaryConfigSource();
  const serverCanaryConfigured = serverCanaryConfigSource !== null;
  const serverCanaryDedicated = serverCanaryConfigSource === "dedicated";
  const clientCanaryEndpointInvalid = hasInvalidHttpUrl(
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT
  );
  const dedicatedServerCanaryEndpointInvalid = hasInvalidHttpUrl(
    process.env.CANARY_ENDPOINT
  );
  const errorTrackingHealthy =
    clientCanaryConfigured &&
    serverCanaryConfigured &&
    (!isProd || serverCanaryDedicated);
  let errorTrackingReason: string | undefined;
  if (!errorTrackingHealthy) {
    if (clientCanaryEndpointInvalid && dedicatedServerCanaryEndpointInvalid) {
      errorTrackingReason = "invalid public and dedicated Canary endpoint URL";
    } else if (clientCanaryEndpointInvalid) {
      errorTrackingReason = "invalid public Canary endpoint URL";
    } else if (isProd && dedicatedServerCanaryEndpointInvalid) {
      errorTrackingReason = "invalid dedicated Canary endpoint URL";
    } else if (!clientCanaryConfigured || !serverCanaryConfigured) {
      errorTrackingReason = "missing required Canary configuration";
    } else if (isProd && !serverCanaryDedicated) {
      errorTrackingReason = "missing dedicated server Canary configuration";
    }
  }

  const isHealthy =
    clientRuntimeHealthy &&
    convexHealthy &&
    stripeHealthy &&
    coachRuntimeHealthy &&
    errorTrackingHealthy;

  const response = {
    status: isHealthy ? "pass" : "fail",
    timestamp,
    version,
    checks: {
      clientRuntime: clientRuntimeHealthy
        ? createCheck("pass")
        : createCheck("fail", {
            reason: "missing required public auth/bootstrap configuration",
          }),
      convex: createCheck(convexHealthy ? "pass" : "fail"),
      stripe: createCheck(stripeHealthy ? "pass" : "fail", {
        keyMode,
        environment: deploymentEnv,
        ...(!stripeConfigured && {
          reason: "missing required billing configuration",
        }),
        ...(keyEnvMismatch && {
          warning: `KEY/ENV MISMATCH: ${keyMode} key in ${deploymentEnv}`,
        }),
      }),
      coachRuntime: createCheck(coachRuntimeHealthy ? "pass" : "fail", {
        defaultModel: coachRuntimeMetadata.defaultModel,
        configuredModel: coachRuntimeMetadata.configuredModel,
        ...(!coachRuntimeHealthy && {
          reason: "missing required coach runtime configuration",
        }),
      }),
      errorTracking: errorTrackingHealthy
        ? createCheck("pass", {
            clientConfigured: clientCanaryConfigured,
            serverConfigured: serverCanaryConfigured,
            serverKeySource: serverCanaryConfigSource ?? "missing",
          })
        : createCheck("fail", {
            clientConfigured: clientCanaryConfigured,
            serverConfigured: serverCanaryConfigured,
            serverKeySource: serverCanaryConfigSource ?? "missing",
            reason: errorTrackingReason,
          }),
    },
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
