import * as Sentry from "@sentry/nextjs";
import {
  AnalyticsEventDefinitions,
  AnalyticsEventName,
  AnalyticsEventProperties,
} from "./events";
import { sanitizeProperties } from "./sanitizer";
import { withUserContext } from "./context";
import { trackClient } from "./transports/client";
import { loadServerTrack } from "./transports/server";
import { isSentryEnabled } from "./transports/sentry";

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

  // Helper to add Sentry breadcrumb

  const addBreadcrumb = (status: "success" | "error", error?: any) => {
    if (isSentryEnabled()) {
      Sentry.addBreadcrumb({
        category: "analytics",

        message: `analytics_event_${status}`,

        data: {
          name,

          status,

          error: error?.message || String(error),
        },

        level: status === "error" ? "warning" : "info",
      });
    }
  };

  try {
    // Extract properties from args (undefined if not provided)

    const properties = args[0] || {};

    // Sanitize and enrich properties

    const sanitized = sanitizeProperties(properties);

    const enriched = withUserContext(sanitized);

    // Client-side tracking

    if (typeof window !== "undefined") {
      try {
        trackClient(name, enriched);

        addBreadcrumb("success");
      } catch (error) {
        addBreadcrumb("error", error);

        console.warn("[Telemetry] Client transport failed:", error);
      }

      return;
    }

    // Server-side tracking (fire-and-forget)

    loadServerTrack()
      .then((track) => {
        if (track) {
          track(name, enriched);

          addBreadcrumb("success");
        }
      })

      .catch((error) => {
        addBreadcrumb("error", error);

        console.warn("[Telemetry] Server transport failed:", error);
      });
  } catch (error) {
    // Catch sanitization or context errors

    if (isDev) console.warn("[Telemetry] trackEvent processing failed:", error);

    if (isSentryEnabled()) {
      Sentry.addBreadcrumb({
        category: "analytics",

        message: "analytics_processing_failed",

        level: "warning",

        data: { name, error: (error as Error).message },
      });
    }
  }
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
    const sanitizedContext = context ? sanitizeProperties(context) : undefined;

    Sentry.captureException(error, {
      extra: sanitizedContext,
    });
  } catch (sentryError) {
    // Never break user flow due to Sentry errors

    if (process.env.NODE_ENV === "development") {
      console.warn("[Telemetry] Sentry reportError failed:", sentryError);
    }
  }
}
