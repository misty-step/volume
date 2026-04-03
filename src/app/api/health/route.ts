import { NextResponse } from "next/server";
import { getCanaryInitOptions } from "@/lib/canary";
import { resolveVersion } from "@/lib/version";
import { getDeploymentEnvironment } from "@/lib/environment";
import {
  getCoachRuntimeHealthMetadata,
  isOpenRouterConfigured,
} from "@/lib/openrouter/policy";

export const dynamic = "force-dynamic";

type HealthCheckStatus = "pass" | "fail";

type HealthCheck = ReturnType<typeof createCheck>;
type ErrorTrackingProviders = {
  sentry: boolean;
  canary: boolean;
};

type StripeCheckInput = {
  stripeSecretKey: string | undefined;
  monthlyPriceId: string | undefined;
  annualPriceId: string | undefined;
  deploymentEnv: string;
};

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

function buildClientRuntimeCheck(clientRuntimeHealthy: boolean): HealthCheck {
  return clientRuntimeHealthy
    ? createCheck("pass")
    : createCheck("fail", {
        reason: "missing required public auth/bootstrap configuration",
      });
}

export function buildStripeCheck({
  stripeSecretKey,
  monthlyPriceId,
  annualPriceId,
  deploymentEnv,
}: StripeCheckInput): { healthy: boolean; check: HealthCheck } {
  const stripeConfigured = Boolean(
    stripeSecretKey && monthlyPriceId && annualPriceId
  );
  const keyMode = getStripeKeyMode(stripeSecretKey);
  const isProd = deploymentEnv === "production";
  const keyEnvMismatch =
    keyMode !== "unknown" &&
    ((isProd && keyMode === "test") || (!isProd && keyMode === "live"));
  const healthy = stripeConfigured && !keyEnvMismatch;

  return {
    healthy,
    check: createCheck(healthy ? "pass" : "fail", {
      keyMode,
      environment: deploymentEnv,
      ...(!stripeConfigured && {
        reason: "missing required billing configuration",
      }),
      ...(keyEnvMismatch && {
        warning: `KEY/ENV MISMATCH: ${keyMode} key in ${deploymentEnv}`,
      }),
    }),
  };
}

function buildCoachRuntimeCheck(): { healthy: boolean; check: HealthCheck } {
  const healthy = isOpenRouterConfigured();
  const metadata = getCoachRuntimeHealthMetadata();

  return {
    healthy,
    check: createCheck(healthy ? "pass" : "fail", {
      defaultModel: metadata.defaultModel,
      configuredModel: metadata.configuredModel,
      ...(!healthy && {
        reason: "missing required coach runtime configuration",
      }),
    }),
  };
}

function getErrorTrackingProviders(): {
  client: ErrorTrackingProviders;
  server: ErrorTrackingProviders;
} {
  const clientSentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  const serverSentryDsn = process.env.SENTRY_DSN?.trim();

  return {
    client: {
      sentry: Boolean(clientSentryDsn),
      canary: Boolean(getCanaryInitOptions("client")),
    },
    server: {
      sentry: Boolean(serverSentryDsn),
      canary: Boolean(getCanaryInitOptions("server")),
    },
  };
}

function buildErrorTrackingCheck(
  providers: ReturnType<typeof getErrorTrackingProviders>
): { healthy: boolean; check: HealthCheck; sentryHealthy: boolean } {
  const healthy =
    (providers.client.sentry || providers.client.canary) &&
    (providers.server.sentry || providers.server.canary);
  const sentryHealthy = providers.client.sentry && providers.server.sentry;

  return {
    healthy,
    sentryHealthy,
    check: healthy
      ? createCheck("pass", {
          clientProviders: providers.client,
          serverProviders: providers.server,
        })
      : createCheck("fail", {
          clientProviders: providers.client,
          serverProviders: providers.server,
          reason: "missing required error-tracking configuration",
        }),
  };
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
 * - Error tracking: Canary and/or Sentry runtime capture for browser + server
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
  const deploymentEnv = getDeploymentEnvironment();
  const stripe = buildStripeCheck({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID,
    deploymentEnv,
  });
  const coachRuntime = buildCoachRuntimeCheck();
  const errorTracking = buildErrorTrackingCheck(getErrorTrackingProviders());

  const isHealthy =
    clientRuntimeHealthy &&
    convexHealthy &&
    stripe.healthy &&
    coachRuntime.healthy &&
    errorTracking.healthy;

  const response = {
    status: isHealthy ? "pass" : "fail",
    timestamp,
    version,
    checks: {
      clientRuntime: buildClientRuntimeCheck(clientRuntimeHealthy),
      convex: createCheck(convexHealthy ? "pass" : "fail"),
      stripe: stripe.check,
      coachRuntime: coachRuntime.check,
      errorTracking: errorTracking.check,
      sentry: errorTracking.sentryHealthy
        ? createCheck("pass")
        : createCheck("fail", {
            reason: "missing required error-tracking configuration",
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
