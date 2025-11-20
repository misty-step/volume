import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { trackEvent, reportError } from "@/lib/analytics";
import * as Sentry from "@sentry/nextjs";
import {
  installAnalyticsMock,
  teardownAnalyticsMock,
  resetAnalyticsState,
  mockAnalyticsState,
  expectAnalyticsEvent,
  attachAnalyticsStubToWindow,
} from "../testkit";

// Mock Sentry at module level for ESM compatibility
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(() => "mock-sentry-id"),
  setUser: vi.fn(),
}));

describe("analytics testkit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = "true";
    installAnalyticsMock();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    teardownAnalyticsMock();
  });

  it("captures client-side events via trackEvent", async () => {
    await trackEvent("Marketing Page View", { path: "/landing" });

    expect(mockAnalyticsState.events).toHaveLength(1);
    expectAnalyticsEvent("Marketing Page View", { path: "/landing" });
    expect(mockAnalyticsState.events[0].runtime).toBe("client");
  });

  it("captures server-side events when window is absent", async () => {
    const globalRef = globalThis as { window?: unknown };
    const originalWindow = globalRef.window;
    // Simulate server runtime
    delete globalRef.window;

    await trackEvent("Marketing Page View", { path: "/server" });

    expectAnalyticsEvent("Marketing Page View", { path: "/server" });
    expect(mockAnalyticsState.events[0].runtime).toBe("server");

    // Restore JSDOM window
    globalRef.window = originalWindow;
  });

  it("records reported errors", () => {
    const error = new Error("boom");
    reportError(error, { foo: "bar" });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ extra: { foo: "bar" } })
    );
  });

  it("throws when expected event is missing", () => {
    resetAnalyticsState();
    expect(() => expectAnalyticsEvent("Exercise Created")).toThrow(
      /Exercise Created/
    );
  });

  it("exposes stub on window for Playwright capture", () => {
    attachAnalyticsStubToWindow(globalThis);
    const stub = (globalThis as any).__ANALYTICS__;
    expect(stub.state).toBe(mockAnalyticsState);
    stub.reset();
    expect(mockAnalyticsState.events).toHaveLength(0);
  });
});
