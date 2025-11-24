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
 * 1) SENTRY_RELEASE
 * 2) VERCEL_GIT_COMMIT_SHA or NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA (short SHA)
 * 3) npm_package_version
 * 4) "dev" fallback
 *
 * @param env - Optional environment source (defaults to process.env)
 */
export function resolveVersion(
  env: EnvSource = process.env as EnvSource
): string {
  if (env.SENTRY_RELEASE) {
    return env.SENTRY_RELEASE;
  }

  const gitSha =
    env.VERCEL_GIT_COMMIT_SHA || env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  if (gitSha) {
    return normalizeSha(gitSha);
  }

  if (env.npm_package_version) {
    return env.npm_package_version;
  }

  return "dev";
}

/**
 * Client-safe, eagerly-resolved version string.
 *
 * Keep all env access inside this module; other callers import the value.
 */
export const clientVersion = resolveVersion();
