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
    (name: AnalyticsEventName, props: Record<string, unknown>) => {
      mockAnalyticsState.events.push({
        name,
        props,
        runtime: "client",
      });
    }
  );

  vi.spyOn(serverTransport, "loadServerTrack").mockImplementation(
    async () =>
      async (name: AnalyticsEventName, props: Record<string, unknown>) => {
        mockAnalyticsState.events.push({
          name,
          props,
          runtime: "server",
        });
      }
  );

  vi.spyOn(sentryTransport, "isSentryEnabled").mockReturnValue(true);

  vi.spyOn(Sentry, "captureException").mockImplementation(
    (error: unknown, options?: { extra?: Record<string, unknown> }) => {
      mockAnalyticsState.errors.push({
        error,
        context: options?.extra,
      });
      return "mock-sentry-id" as any;
    }
  );

  vi.spyOn(Sentry, "addBreadcrumb").mockImplementation(() => {});
  vi.spyOn(Sentry, "setUser").mockImplementation(() => {});

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
