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
  "Exercise Deleted": {
    exerciseId: string;
    userId?: string;
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
  "Marketing Page View": {
    path: string;
  };
  "Marketing CTA Click": {
    placement: "hero" | "final" | "navbar" | "footer" | "pricing";
    label: string;
  };
  "Marketing FAQ Toggle": {
    question: string;
    isOpen: boolean;
  };
  "Marketing Nav Click": {
    target: string;
    device: "desktop" | "mobile";
  };
  // Analytics & History events
  "Daily Totals Banner Viewed": {
    userId?: string;
  };
  "History Load More Days": {
    days: number;
    userId?: string;
  };
  "Exercise Detail Viewed": {
    exerciseId: string;
    userId?: string;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventDefinitions;

/**
 * Event-specific property helper.
 *
 * Consumers must pass all required properties from event definition
 * while the helper still allows additional metadata fields (string/number/boolean).
 */
export type AnalyticsEventProperties<Name extends AnalyticsEventName> =
  AnalyticsEventDefinitions[Name] & Record<string, string | number | boolean>;

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
 * Handles nested objects, arrays, and circular references safely:
 * - Strings: Email redaction via sanitizeString()
 * - Numbers/booleans: Pass through unchanged
 * - null/undefined: Skip
 * - Objects/Arrays: JSON.stringify then sanitize (preserves structure)
 * - Circular references: Marked as "[Circular]"
 *
 * @param properties - Raw event properties that may contain PII
 * @returns Sanitized properties safe for analytics transmission
 *
 * @example
 * sanitizeEventProperties({
 *   userId: "user@example.com",
 *   count: 42,
 *   isActive: true,
 *   metadata: { email: "test@example.com", plan: "pro" }
 * })
 * // => {
 * //   userId: "[EMAIL_REDACTED]",
 * //   count: 42,
 * //   isActive: true,
 * //   metadata: '{"email":"[EMAIL_REDACTED]","plan":"pro"}'
 * // }
 */
function sanitizeEventProperties(
  properties: Record<string, unknown>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  const seen = new WeakSet();

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

    // Handle nested objects/arrays
    if (typeof value === "object") {
      // Detect circular references
      if (seen.has(value)) {
        result[key] = "[Circular]";
        continue;
      }
      seen.add(value);

      // JSON.stringify then sanitize to preserve structure
      try {
        result[key] = sanitizeString(JSON.stringify(value));
      } catch (error) {
        // Fallback for unstringifiable objects (e.g., functions, symbols)
        result[key] = "[Unstringifiable Object]";
      }
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
 * **IMPORTANT**: Must only be called client-side to prevent user context
 * leakage between HTTP requests in Next.js server environments.
 *
 * @param userId - User identifier (will be sanitized for PII)
 * @param metadata - Optional metadata (e.g., plan: "pro")
 *
 * @throws {Error} If called server-side (typeof window === "undefined")
 *
 * @example
 * // Client-side only (e.g., in useEffect, event handler)
 * setUserContext(user.id, { plan: "free" })
 */
export function setUserContext(
  userId: string,
  metadata: Record<string, string> = {}
): void {
  // Runtime guard: prevent server-side usage to avoid context leakage
  if (typeof window === "undefined") {
    throw new Error(
      "setUserContext must only be called client-side. " +
        "Module-level state persists across HTTP requests in Next.js server environments, " +
        "causing user context to leak between users. " +
        "Call this function from useEffect, event handlers, or client components only."
    );
  }

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
 *
 * **IMPORTANT**: Must only be called client-side to prevent user context
 * leakage between HTTP requests in Next.js server environments.
 *
 * @throws {Error} If called server-side (typeof window === "undefined")
 */
export function clearUserContext(): void {
  // Runtime guard: prevent server-side usage to avoid context leakage
  if (typeof window === "undefined") {
    throw new Error(
      "clearUserContext must only be called client-side. " +
        "Module-level state persists across HTTP requests in Next.js server environments, " +
        "causing user context to leak between users. " +
        "Call this function from useEffect, event handlers, or client components only."
    );
  }

  currentUserContext = null;
  Sentry.setUser(null);
}

/**
 * Merge user context into event properties.
 *
 * Automatically adds userId and metadata to events without overwriting
 * explicitly provided properties.
 *
 * **Defense in depth**: Never uses module-level context server-side to
 * prevent potential user context leakage between HTTP requests.
 *
 * @param properties - Event properties (may already include userId)
 * @returns Properties enriched with user context
 */
function withUserContext(
  properties: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  // Defense in depth: never use module-level context server-side
  // Even though setUserContext() blocks server-side calls, this ensures
  // no context leakage if the guard is somehow bypassed
  if (typeof window === "undefined") return properties;

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
 * TypeScript enforces required properties: events with required fields MUST
 * receive a properties object, events without required fields may omit it.
 *
 * @param name - Event name (type-safe from AnalyticsEventDefinitions)
 * @param args - Conditional: required if event has required properties, optional otherwise
 *
 * @example
 * // Required properties enforced
 * trackEvent("Set Logged", {
 *   setId: set._id,
 *   exerciseId: exercise._id,
 *   reps: 10,
 *   weight: 135
 * })
 *
 * // Optional properties can be omitted
 * trackEvent("Exercise Deleted", {})
 */
export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  ...args: {} extends AnalyticsEventDefinitions[Name]
    ? [properties?: AnalyticsEventProperties<Name>]
    : [properties: AnalyticsEventProperties<Name>]
): void {
  if (!isAnalyticsEnabled()) return;

  const isDev = process.env.NODE_ENV === "development";

  // Extract properties from args (undefined if not provided)
  const properties = args[0] || {};

  // Sanitize and enrich properties
  const sanitized = sanitizeEventProperties(properties);
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

/**
 * PUBLIC API EXPORTS
 *
 * Deep module design: Simple interface, complex implementation.
 *
 * Exported functions:
 * - trackEvent() - Type-safe analytics tracking (client + server)
 * - reportError() - PII-safe error reporting to Sentry
 * - setUserContext() - Enrich events with user identity
 * - clearUserContext() - Remove user identity on logout
 *
 * Exported types:
 * - AnalyticsEventDefinitions - Event catalog with typed properties
 * - AnalyticsEventName - Union of valid event names
 * - AnalyticsEventProperties<Name> - Type-safe properties for event
 *
 * Internal (not exported):
 * - sanitizeString() - Email redaction helper
 * - sanitizeEventProperties() - Recursive PII sanitization
 * - isAnalyticsEnabled() - Environment detection
 * - isSentryEnabled() - Sentry-specific enable check
 * - loadServerTrack() - Dynamic server track loader
 * - withUserContext() - User context merger
 */
