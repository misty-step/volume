/**
 * Tests for analytics module - focusing on server-side safety guards.
 *
 * Critical: Module-level state must never be used server-side to prevent
 * user context leakage between HTTP requests in Next.js environments.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setUserContext, clearUserContext, trackEvent } from "./analytics";

describe("analytics - server-side safety guards", () => {
  // Save original window to restore after tests
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset module state between tests
    vi.clearAllMocks();
  });

  describe("setUserContext", () => {
    it("should throw error when called server-side", () => {
      // Simulate server environment
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      expect(() => {
        setUserContext("user-123", { plan: "pro" });
      }).toThrow("setUserContext must only be called client-side");

      // Restore window
      global.window = originalWindow;
    });

    it("should work when called client-side", () => {
      // Simulate client environment (window exists)
      global.window = originalWindow;

      // Should not throw
      expect(() => {
        setUserContext("user-123", { plan: "pro" });
      }).not.toThrow();
    });

    it("should include helpful error message about context leakage", () => {
      // Simulate server environment
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      try {
        setUserContext("user-123");
        expect.fail("Should have thrown error");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("Module-level state persists");
        expect(message).toContain("HTTP requests");
        expect(message).toContain("causing user context to leak");
      }

      // Restore window
      global.window = originalWindow;
    });
  });

  describe("clearUserContext", () => {
    it("should throw error when called server-side", () => {
      // Simulate server environment
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      expect(() => {
        clearUserContext();
      }).toThrow("clearUserContext must only be called client-side");

      // Restore window
      global.window = originalWindow;
    });

    it("should work when called client-side", () => {
      // Simulate client environment
      global.window = originalWindow;

      // Should not throw
      expect(() => {
        clearUserContext();
      }).not.toThrow();
    });

    it("should include helpful error message about context leakage", () => {
      // Simulate server environment
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      try {
        clearUserContext();
        expect.fail("Should have thrown error");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("Module-level state persists");
        expect(message).toContain("HTTP requests");
        expect(message).toContain("causing user context to leak");
      }

      // Restore window
      global.window = originalWindow;
    });
  });

  describe("trackEvent - server-side behavior", () => {
    it("should work server-side without user context enrichment", () => {
      // Simulate server environment
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      // Should not throw (trackEvent is allowed server-side)
      expect(() => {
        trackEvent("Exercise Created", {
          exerciseId: "ex-123",
          userId: "user-explicit",
        });
      }).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });

    it("should work client-side with user context enrichment", () => {
      // Simulate client environment
      global.window = originalWindow;

      // Set context first
      setUserContext("user-123", { plan: "pro" });

      // Should not throw
      expect(() => {
        trackEvent("Exercise Created", {
          exerciseId: "ex-123",
        });
      }).not.toThrow();

      // Cleanup
      clearUserContext();
    });
  });
});
