/**
 * Deployment environment detection for observability tools.
 *
 * Provides single source of truth for production/preview/development detection
 * across analytics, error tracking, and other environment-sensitive features.
 */

export type DeploymentEnvironment = "production" | "preview" | "development";

/**
 * Determines the current deployment environment.
 *
 * Priority:
 * 1. VERCEL_ENV (Vercel's authoritative environment indicator)
 * 2. NEXT_PUBLIC_VERCEL_ENV (client-side fallback)
 * 3. NODE_ENV (local development fallback)
 *
 * @returns The current deployment environment
 *
 * @example
 * ```typescript
 * const env = getDeploymentEnvironment();
 * if (env === 'production') {
 *   enableProductionFeatures();
 * }
 * ```
 */
export function getDeploymentEnvironment(): DeploymentEnvironment {
  const vercelEnv =
    process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV;

  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";

  // Fallback: Check NODE_ENV for local development
  return process.env.NODE_ENV === "production" ? "production" : "development";
}
