import { NextRequest, NextResponse } from "next/server";
import { trackEvent, reportError } from "../router";
import { AnalyticsEventName, AnalyticsEventProperties } from "../events";

type RouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse>;

/**
 * Wrap a Next.js Route Handler with analytics.
 *
 * Injects a `track` helper into the request context (conceptually)
 * or simply wraps execution to allow easy error reporting.
 *
 * Since Next.js Route Handlers are just functions, this wrapper
 * handles top-level error reporting and allows side-effect tracking.
 *
 * @param handler - Original route handler
 * @returns Wrapped handler
 */
export function withServerAnalytics(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Automatically report uncaught errors in route handlers
      reportError(error as Error, {
        url: req.url,
        method: req.method,
      });
      throw error;
    }
  };
}

/**
 * Helper to track events from within a server-side handler.
 * Just an alias to trackEvent but emphasizes server context.
 */
export const trackServerEvent = trackEvent;
