"use client";

import { Analytics } from "@vercel/analytics/react";
import type { AnalyticsProps } from "@vercel/analytics/react";

/**
 * Client-side wrapper for Vercel Analytics with URL filtering.
 *
 * Filters sensitive URLs from analytics tracking:
 * - Webhook endpoints (/api/webhooks/*)
 * - URLs with tokens/keys/secrets in query params
 *
 * Must be a client component as Analytics uses browser APIs.
 */
export function AnalyticsWrapper() {
  const beforeSend: AnalyticsProps["beforeSend"] = (event) => {
    const url = event.url || "";

    // Block tracking for sensitive paths and query parameters
    if (
      url.includes("/api/webhooks") || // Webhook endpoints
      url.includes("token=") || // Query params with tokens
      url.includes("key=") || // Query params with keys
      url.includes("secret=") // Query params with secrets
    ) {
      return null; // Don't track this event
    }

    return event;
  };

  return <Analytics beforeSend={beforeSend} />;
}
