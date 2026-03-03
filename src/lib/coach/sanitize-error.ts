const CONVEX_PREFIX_RE = /^\[CONVEX [A-Z]\([^\)]+\)\]\s*/;
const CONVEX_PATH_RE =
  /\b(?:convex|src|node_modules)\/[\w/.@-]+\.(?:ts|js|mjs)(?::\d+(?::\d+)?)?/g;
const STACK_TRACE_RE = /^\s*at\s+\S+.+$/gm;

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

/**
 * Strips internal Convex paths, stack traces, and noisy prefixes from error
 * messages before showing them to users. Short validation errors pass through.
 */
export function sanitizeError(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_MESSAGE;

  const input = raw.trim();

  // Strip internal noise (prefix, traces, file paths) before deciding pass-through
  const cleaned = input
    .replace(CONVEX_PREFIX_RE, "")
    .replace(STACK_TRACE_RE, "")
    .replace(CONVEX_PATH_RE, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

  // Nothing was stripped and it's short → user-facing validation, pass through
  if (cleaned === input && input.length < 200) {
    return input;
  }

  return cleaned || DEFAULT_MESSAGE;
}
