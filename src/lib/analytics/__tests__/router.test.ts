import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trackEvent, reportError } from "../router";
import * as Sentry from "@sentry/nextjs";
import { trackClient } from "../transports/client";
import { loadServerTrack } from "../transports/server";
import { isSentryEnabled } from "../transports/sentry";

// Mocks
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("../transports/client", () => ({
  trackClient: vi.fn(),
}));

vi.mock("../transports/server", () => ({
  loadServerTrack: vi.fn(),
}));

vi.mock("../transports/sentry", () => ({
  isSentryEnabled: vi.fn(),
}));

describe("TransportRouter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_ANALYTICS", "true"); // Force enable in tests
    (isSentryEnabled as any).mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("trackEvent", () => {
    it("should not track if disabled via env", () => {
      vi.stubEnv("NEXT_PUBLIC_DISABLE_ANALYTICS", "true");
      trackEvent("Marketing Page View", { path: "/" });
      expect(trackClient).not.toHaveBeenCalled();
    });

    it("should track on client if window defined", () => {
      // window is defined in jsdom environment
      trackEvent("Marketing Page View", { path: "/" });
      expect(trackClient).toHaveBeenCalledWith(
        "Marketing Page View",
        expect.objectContaining({ path: "/" })
      );
    });

    it("should track on server if window undefined", async () => {
      // Simulate server
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const mockTrack = vi.fn();
      (loadServerTrack as any).mockResolvedValue(mockTrack);

      trackEvent("Marketing Page View", { path: "/" });

      // Wait for promise chain
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(loadServerTrack).toHaveBeenCalled();
      expect(mockTrack).toHaveBeenCalledWith(
        "Marketing Page View",
        expect.objectContaining({ path: "/" })
      );

      global.window = originalWindow;
    });

    it("should sanitize properties", () => {
      trackEvent("Marketing CTA Click", {
        placement: "hero",
        label: "user@example.com",
      });
      expect(trackClient).toHaveBeenCalledWith(
        "Marketing CTA Click",
        expect.objectContaining({ label: "[EMAIL_REDACTED]" })
      );
    });

    it("should add breadcrumb on success", () => {
      trackEvent("Marketing Page View", { path: "/" });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "analytics",
          message: "analytics_event_success",
          data: expect.objectContaining({ name: "Marketing Page View" }),
        })
      );
    });

    it("should handle transport errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      (trackClient as any).mockImplementation(() => {
        throw new Error("Network error");
      });

      trackEvent("Marketing Page View", { path: "/" });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Telemetry] Client transport failed:",
        expect.any(Error)
      );
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "analytics_event_error",
          level: "warning",
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("reportError", () => {
    it("should report error to Sentry", () => {
      const error = new Error("Test error");
      reportError(error, { context: "value" });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: { context: "value" },
        })
      );
    });

    it("should sanitize context", () => {
      const error = new Error("Test error");
      reportError(error, { email: "user@test.com" });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: { email: "[EMAIL_REDACTED]" },
        })
      );
    });

    it("should check if Sentry is enabled", () => {
      (isSentryEnabled as any).mockReturnValue(false);
      reportError(new Error("Test"));
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
