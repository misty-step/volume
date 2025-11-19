import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for uptime monitoring.
 *
 * Returns application health status for external monitoring services
 * like UptimeRobot, BetterUptime, or Pingdom.
 *
 * @returns 200 with health status when healthy, 503 when unhealthy
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.npm_package_version ||
    "unknown";

  // Check Convex connectivity (basic check - URL must be configured)
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexHealthy = Boolean(convexUrl);

  const isHealthy = convexHealthy;

  const response = {
    status: isHealthy ? "pass" : "fail",
    timestamp,
    version,
    checks: {
      convex: { status: convexHealthy ? "pass" : "fail" },
    },
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
