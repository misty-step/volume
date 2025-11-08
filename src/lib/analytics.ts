import * as Sentry from "@sentry/nextjs";
import { track as trackClient } from "@vercel/analytics";
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

/**
 * Current user context enriching all analytics events.
 *
 * Set via setUserContext() on login, cleared via clearUserContext() on logout.
 */
let currentUserContext: {
  userId: string;
  metadata: Record<string, string>;
} | null = null;

/**
 * Set user context for analytics and error tracking.
 *
 * All subsequent trackEvent() calls automatically include userId.
 * Also syncs user info to Sentry for error correlation.
 *
 * @param userId - User identifier (will be sanitized for PII)
 * @param metadata - Optional metadata (e.g., plan: "pro")
 *
 * @example
 * setUserContext(user.id, { plan: "free" })
 */
export function setUserContext(
  userId: string,
  metadata: Record<string, string> = {}
): void {
  // Sanitize user data before storing
  const sanitizedUserId = sanitizeString(userId);
  const sanitizedMetadata = Object.fromEntries(
    Object.entries(metadata).map(([k, v]) => [k, sanitizeString(v)])
  );

  // Store in module state
  currentUserContext = {
    userId: sanitizedUserId,
    metadata: sanitizedMetadata,
  };

  // Sync to Sentry for error correlation
  Sentry.setUser({
    id: sanitizedUserId,
    ...sanitizedMetadata,
  });
}

/**
 * Clear user context on logout.
 *
 * Removes userId from future analytics events and Sentry error reports.
 */
export function clearUserContext(): void {
  currentUserContext = null;
  Sentry.setUser(null);
}

/**
 * Merge user context into event properties.
 *
 * Automatically adds userId and metadata to events without overwriting
 * explicitly provided properties.
 *
 * @param properties - Event properties (may already include userId)
 * @returns Properties enriched with user context
 */
function withUserContext(
  properties: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  if (!currentUserContext) return properties;

  const enriched = { ...properties };

  // Add userId if not already present
  if (!("userId" in enriched)) {
    enriched.userId = currentUserContext.userId;
  }

  // Add metadata if not present (no prefix - typed events prevent conflicts)
  for (const [key, value] of Object.entries(currentUserContext.metadata)) {
    if (!(key in enriched)) {
      enriched[key] = value;
    }
  }

  return enriched;
}

/**
 * Track analytics event with type safety and automatic PII sanitization.
 *
 * Main public API for analytics tracking. Works on both client and server.
 * Automatically enriches events with user context if set via setUserContext().
 *
 * @param name - Event name (type-safe from AnalyticsEventDefinitions)
 * @param properties - Event properties (type-checked against event definition)
 *
 * @example
 * trackEvent("Set Logged", {
 *   setId: set._id,
 *   exerciseId: exercise._id,
 *   reps: 10,
 *   weight: 135
 * })
 */
export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties?: AnalyticsEventProperties<Name>
): void {
  if (!isAnalyticsEnabled()) return;

  const isDev = process.env.NODE_ENV === "development";

  // Sanitize and enrich properties
  const sanitized = sanitizeEventProperties(properties || {});
  const enriched = withUserContext(sanitized);

  // Client-side tracking
  if (typeof window !== "undefined") {
    try {
      trackClient(name, enriched);
    } catch (error) {
      if (isDev) console.warn("Analytics trackEvent failed:", error);
    }
    return;
  }

  // Server-side tracking (fire-and-forget)
  loadServerTrack()
    .then((track) => {
      if (track) track(name, enriched);
    })
    .catch((error) => {
      if (isDev) console.warn("Analytics server track failed:", error);
    });
}

/**
 * Report error to Sentry with automatic PII sanitization.
 *
 * Wraps Sentry.captureException with context sanitization to prevent
 * accidental PII exposure in error reports.
 *
 * @param error - Error to report
 * @param context - Additional context (will be sanitized)
 *
 * @example
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   reportError(error, {
 *     operation: "dangerousOperation",
 *     userId: user.id
 *   });
 * }
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>
): void {
  if (!isSentryEnabled()) return;

  try {
    const sanitizedContext = context
      ? sanitizeEventProperties(context)
      : undefined;

    Sentry.captureException(error, {
      extra: sanitizedContext,
    });
  } catch (sentryError) {
    // Never break user flow due to Sentry errors
    if (process.env.NODE_ENV === "development") {
      console.warn("Sentry reportError failed:", sentryError);
    }
  }
}
