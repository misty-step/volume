import * as Sentry from "@sentry/nextjs";
import { sanitizeString } from "./sanitizer";

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
export function withUserContext(
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
 * Get current user context for testing assertions.
 *
 * @internal
 * @returns The current user context or null
 */
export function getUserContextForTests() {
  if (process.env.NODE_ENV === "test") {
    return currentUserContext;
  }
  return null;
}
