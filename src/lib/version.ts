/**
 * Centralized application version resolution.
 *
 * Deep module: callers get a single, sanitized string without knowing
 * which environment variable provided it. This hides deployment details
 * (Sentry release vs. git SHA vs. package version) and keeps UI/server
 * consumers consistent.
 *
 * IMPORTANT: Next.js only replaces process.env.NEXT_PUBLIC_* at build time
 * when accessed with LITERAL strings. Dynamic access like env[key] doesn't
 * work for client-side code. This module handles that complexity internally.
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
 * @param env - Environment source. Server-side can omit (uses process.env).
 *              Client-side MUST pass pre-extracted values using literal access.
 */
export function resolveVersion(env: EnvSource = process.env as EnvSource): string {
  // Helper to filter empty strings and whitespace
  const get = (key: keyof EnvSource) => env[key]?.trim() || undefined;

  // Priority 1: Sentry release (explicit override)
  const sentryRelease = get("SENTRY_RELEASE");
  if (sentryRelease) return sentryRelease;

  // Priority 2: Git commit SHA (Vercel auto-injected)
  const gitSha = get("VERCEL_GIT_COMMIT_SHA") || get("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA");
  if (gitSha) return normalizeSha(gitSha);

  // Priority 3: Build-time injected package version
  const packageVersion = get("NEXT_PUBLIC_PACKAGE_VERSION");
  if (packageVersion) return packageVersion;

  // Priority 4: npm package version (local dev with npm run)
  const npmVersion = get("npm_package_version");
  if (npmVersion) return npmVersion;

  // Priority 5: Fallback for development
  return "dev";
}

/**
 * Client-safe, eagerly-resolved version string.
 *
 * Uses LITERAL process.env access so webpack replaces values at build time.
 * This is the workaround for Next.js's static replacement limitation.
 */
export const clientVersion = resolveVersion({
  // Literal access required for Next.js build-time replacement
  SENTRY_RELEASE: process.env.SENTRY_RELEASE,
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  NEXT_PUBLIC_PACKAGE_VERSION: process.env.NEXT_PUBLIC_PACKAGE_VERSION,
  npm_package_version: process.env.npm_package_version,
});

/**
 * Display version for user-facing UI (footer, about page).
 * Uses semantic version from package.json, never git SHA.
 *
 * Git SHAs don't have corresponding release pages (/releases/ce83be4 404s).
 * This skips the Vercel git SHA that `clientVersion` would pick up.
 */
export const displayVersion = (() => {
  // Priority: package version > npm version > "dev"
  // Skip git SHA - it doesn't map to release pages
  const packageVersion = process.env.NEXT_PUBLIC_PACKAGE_VERSION?.trim();
  if (packageVersion) return packageVersion;

  const npmVersion = process.env.npm_package_version?.trim();
  if (npmVersion) return npmVersion;

  return "dev";
})();
