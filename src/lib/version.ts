/**
 * Centralized application version resolution.
 *
 * Deep module: callers get a single, sanitized string without knowing
 * which environment variable provided it. This hides deployment details
 * (Sentry release vs. git SHA vs. package version) and keeps UI/server
 * consumers consistent.
 */

type EnvSource = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "SENTRY_RELEASE"
    | "VERCEL_GIT_COMMIT_SHA"
    | "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"
    | "NEXT_PUBLIC_PACKAGE_VERSION"
    | "npm_package_version"
  >
>;

/**
 * Normalize a git SHA for display. If the value looks like a hex SHA,
 * return the first 7 characters; otherwise return the original string.
 */
function normalizeSha(value: string): string {
  const shaPattern = /^[a-f0-9]{7,40}$/i;
  if (!shaPattern.test(value)) return value;
  return value.slice(0, 7);
}

/**
 * Resolve the current application version using a strict precedence:
 * 1) SENTRY_RELEASE (explicit override)
 * 2) VERCEL_GIT_COMMIT_SHA or NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA (git commit SHA, short form)
 * 3) NEXT_PUBLIC_PACKAGE_VERSION (build-time injected from package.json)
 * 4) npm_package_version (npm run context only)
 * 5) "dev" fallback
 *
 * Note: Empty strings and whitespace-only values are treated as absent.
 *
 * @param env - Optional environment source (defaults to process.env)
 */
export function resolveVersion(
  env: EnvSource = process.env as EnvSource
): string {
  // Helper to filter empty strings and whitespace
  const getEnv = (key: keyof EnvSource) => env[key]?.trim() || undefined;

  // Priority 1: Sentry release (explicit override)
  const sentryRelease = getEnv("SENTRY_RELEASE");
  if (sentryRelease) {
    return sentryRelease;
  }

  // Priority 2: Git commit SHA (Vercel auto-injected)
  const gitSha =
    getEnv("VERCEL_GIT_COMMIT_SHA") ||
    getEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA");
  if (gitSha) {
    return normalizeSha(gitSha);
  }

  // Priority 3: Build-time injected package version
  const packageVersion = getEnv("NEXT_PUBLIC_PACKAGE_VERSION");
  if (packageVersion) {
    return packageVersion;
  }

  // Priority 4: npm package version (local dev with npm run)
  const npmVersion = getEnv("npm_package_version");
  if (npmVersion) {
    return npmVersion;
  }

  // Priority 5: Fallback for development
  return "dev";
}

/**
 * Client-safe, eagerly-resolved version string.
 *
 * Keep all env access inside this module; other callers import the value.
 */
export const clientVersion = resolveVersion();
