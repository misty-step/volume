import * as clientTransport from "../transports/client";
import * as serverTransport from "../transports/server";
import * as sentryTransport from "../transports/sentry";
import * as Sentry from "@sentry/nextjs";
import { vi } from "vitest";
import { AnalyticsEventName } from "../events";

export type AnalyticsEventCall = {
  name: AnalyticsEventName;
  props: Record<string, unknown>;
  runtime: "client" | "server";
};

export type AnalyticsErrorCall = {
  error: unknown;
  context?: Record<string, unknown>;
};

export const mockAnalyticsState: {
  events: AnalyticsEventCall[];
  errors: AnalyticsErrorCall[];
} = {
  events: [],
  errors: [],
};

export function resetAnalyticsState() {
  mockAnalyticsState.events.length = 0;
  mockAnalyticsState.errors.length = 0;
}

/**
 * Install spies over analytics transports so router calls are captured
 * without hitting real providers. Safe to invoke per-test; call
 * vi.restoreAllMocks() or teardownAnalyticsMock() afterwards.
 */
export function installAnalyticsMock() {
  resetAnalyticsState();

  vi.spyOn(clientTransport, "trackClient").mockImplementation(
    (name: string, props: Record<string, string | number | boolean> = {}) => {
      mockAnalyticsState.events.push({
        name: name as AnalyticsEventName,
        props,
        runtime: "client",
      });
    }
  );

  vi.spyOn(serverTransport, "loadServerTrack").mockImplementation(
    async () =>
      async (
        eventName: string,
        properties?: Record<
          string,
          string | number | boolean | null | string[] | number[]
        >
      ) => {
        mockAnalyticsState.events.push({
          name: eventName as AnalyticsEventName,
          props: properties || {},
          runtime: "server",
        });
      }
  );

  vi.spyOn(sentryTransport, "isSentryEnabled").mockReturnValue(true);

  // Note: Sentry must be mocked at module level in ESM (vi.mock('@sentry/nextjs'))
  // Attempting to spy on Sentry exports will fail with "Module namespace is not configurable"
  // Tests should mock Sentry themselves and use mockAnalyticsState.errors if needed

  return mockAnalyticsState;
}

export function teardownAnalyticsMock() {
  vi.restoreAllMocks();
  resetAnalyticsState();
}

/**
 * Expose the mock on window for Playwright capture when
 * PLAYWRIGHT_ANALYTICS_STUB is enabled.
 */
export function attachAnalyticsStubToWindow(
  target: { [key: string]: unknown } | typeof globalThis = globalThis
) {
  if (typeof target === "undefined") return;
  (target as Record<string, unknown>).__ANALYTICS__ = {
    state: mockAnalyticsState,
    reset: resetAnalyticsState,
  } as const;
}
