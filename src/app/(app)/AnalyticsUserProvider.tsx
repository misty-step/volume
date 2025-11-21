"use client";

import { useAnalyticsUserContext } from "@/lib/analytics/instrumentation/useAnalyticsUserContext";

/**
 * Context provider that synchronizes Clerk user state with analytics.
 *
 * Must be placed inside ClerkProvider but outside app routes to cover
 * both marketing and app pages.
 */
export function AnalyticsUserProvider() {
  useAnalyticsUserContext();
  return null;
}
