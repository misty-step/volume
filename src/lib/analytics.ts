import { shouldEnableSentry } from "./sentry";

/**
 * Type-safe analytics event catalog.
 *
 * Serves as the single source of truth for all trackable events so
 * TypeScript can prevent typos and enforce required properties.
 */
export interface AnalyticsEventDefinitions {
  "Exercise Created": {
    exerciseId: string;
    userId?: string;
    source?: "manual" | "ai" | "import";
  };
  "Set Logged": {
    setId: string;
    exerciseId: string;
    userId?: string;
    reps: number;
    weight?: number;
  };
  "Workout Session Started": {
    sessionId: string;
    userId?: string;
  };
  "Workout Session Completed": {
    sessionId: string;
    userId?: string;
    durationMs: number;
    setCount: number;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventDefinitions;

/**
 * Event-specific property helper.
 *
 * Consumers can pass the strongly typed properties while the helper
 * still allows additional metadata fields (string/number/boolean).
 */
export type AnalyticsEventProperties<Name extends AnalyticsEventName> = Partial<
  AnalyticsEventDefinitions[Name]
> &
  Record<string, string | number | boolean>;

/**
 * Redact email addresses from strings to protect PII.
 *
 * Replaces all email patterns with [EMAIL_REDACTED]. Some emails may be
 * double-redacted if they appear in already-redacted text (defensive behavior).
 *
 * @example
 * sanitizeString("user@example.com sent message")
 * // => "[EMAIL_REDACTED] sent message"
 */
function sanitizeString(value: string): string {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return value.replace(emailPattern, "[EMAIL_REDACTED]");
}

/**
 * Sanitize event properties to remove PII.
 *
 * Type system enforces flat objects with primitives only, so no recursion needed.
 *
 * - Strings: Email redaction via sanitizeString()
 * - Numbers/booleans: Pass through unchanged
 * - null/undefined: Skip
 * - Other types: Convert to string and sanitize
 *
 * @param properties - Raw event properties that may contain PII
 * @returns Sanitized properties safe for analytics transmission
 *
 * @example
 * sanitizeEventProperties({
 *   userId: "user@example.com",
 *   count: 42,
 *   isActive: true
 * })
 * // => { userId: "[EMAIL_REDACTED]", count: 42, isActive: true }
 */
function sanitizeEventProperties(
  properties: Record<string, unknown>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Skip null/undefined
    if (value == null) {
      continue;
    }

    // Pass through primitives
    if (typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
      continue;
    }

    // Everything else becomes a sanitized string
    result[key] = sanitizeString(String(value));
  }

  return result;
}

/**
 * Check if analytics should be enabled.
 *
 * Respects explicit enable/disable flags and auto-disables in dev/test
 * environments to avoid polluting production analytics.
 *
 * @returns true if analytics should track events
 */
function isAnalyticsEnabled(): boolean {
  // Explicit disable flag
  if (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "true") {
    return false;
  }

  // Explicit enable flag (overrides environment checks)
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true") {
    return true;
  }

  // Auto-disable in test environment
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  // Auto-disable in development
  if (process.env.NODE_ENV === "development") {
    return false;
  }

  // Default: enabled (production)
  return true;
}

/**
 * Check if Sentry error tracking should be enabled.
 *
 * Delegates to existing shouldEnableSentry helper from lib/sentry.ts.
 *
 * @returns true if Sentry should report errors
 */
function isSentryEnabled(): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  return shouldEnableSentry(dsn);
}

/**
 * Cached promise for server-side track function.
 *
 * Prevents multiple dynamic imports of @vercel/analytics/server.
 */
let serverTrackPromise: Promise<
  typeof import("@vercel/analytics/server").track | null
> | null = null;

/**
 * Dynamically load Vercel Analytics server track function.
 *
 * Only works on server - returns null on client to prevent errors.
 * Caches the import promise to avoid repeated dynamic imports.
 *
 * @returns Promise resolving to track function on server, null on client
 */
function loadServerTrack() {
  // Client-side check - return null immediately
  if (typeof window !== "undefined") return Promise.resolve(null);

  // Server-side - load once and cache
  if (!serverTrackPromise) {
    serverTrackPromise = import("@vercel/analytics/server")
      .then((m) => m.track)
      .catch(() => null);
  }

  return serverTrackPromise;
}
