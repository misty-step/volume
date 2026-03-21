/**
 * Tests for analytics module - focusing on server-side safety guards
 * and coverage for key functionality.
 *
 * Critical: Module-level state must never be used server-side to prevent
 * user context leakage between HTTP requests in Next.js environments.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import * as Canary from "@canary-obs/sdk";
import {
  setUserContext,
  clearUserContext,
  trackEvent,
  reportError,
} from "./analytics";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@canary-obs/sdk", () => ({
  initCanary: vi.fn(),
  captureException: vi.fn(() => Promise.resolve(null)),
}));

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

describe("reportError", () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    // Enable Sentry for these tests
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SENTRY_DSN: "https://test@sentry.io/123",
      NODE_ENV: "production",
    };
    global.window = originalWindow;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  it("should call Sentry.captureException with error", () => {
    const error = new Error("Test error");
    reportError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: undefined,
    });
  });

  it("should sanitize context before sending to Sentry", () => {
    const error = new Error("Test error");
    reportError(error, {
      userId: "user@example.com",
      operation: "test-op",
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        userId: "[EMAIL_REDACTED]",
        operation: "test-op",
      },
    });
  });

  it("should handle null/undefined context values", () => {
    const error = new Error("Test error");
    reportError(error, {
      userId: "user-123",
      // @ts-expect-error Testing runtime behavior with null
      nullValue: null,
      // @ts-expect-error Testing runtime behavior with undefined
      undefinedValue: undefined,
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        userId: "user-123",
        // null/undefined values are skipped
      },
    });
  });

  it("should handle nested objects in context", () => {
    const error = new Error("Test error");
    reportError(error, {
      operation: "test",
      metadata: { email: "user@example.com", plan: "pro" },
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        operation: "test",
        metadata: '{"email":"[EMAIL_REDACTED]","plan":"pro"}',
      },
    });
  });

  it("should not call Sentry when disabled", () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SENTRY_DSN: undefined,
      SENTRY_DSN: undefined,
    };

    const error = new Error("Test error");
    reportError(error);

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("should guard Canary capture when Canary is disabled", () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SENTRY_DSN: "https://test@sentry.io/123",
      CANARY_ENDPOINT: undefined,
      CANARY_API_KEY: undefined,
      NEXT_PUBLIC_CANARY_ENDPOINT: undefined,
      NEXT_PUBLIC_CANARY_API_KEY: undefined,
      NODE_ENV: "production",
    };

    const error = new Error("Test error");
    reportError(error);

    expect(Canary.captureException).not.toHaveBeenCalled();
    expect(Canary.initCanary).not.toHaveBeenCalled();
  });

  it("should initialize Canary in the browser before capturing", () => {
    global.window = {} as Window & typeof globalThis;
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SENTRY_DSN: "https://test@sentry.io/123",
      NEXT_PUBLIC_CANARY_ENDPOINT: "https://canary.example",
      NEXT_PUBLIC_CANARY_API_KEY: "public-key",
      NODE_ENV: "production",
    };

    const error = new Error("Test error");
    reportError(error, { boundary: "app/error.tsx" });

    expect(Canary.initCanary).toHaveBeenCalledWith({
      endpoint: "https://canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
    expect(Canary.captureException).toHaveBeenCalledWith(error, {
      context: { boundary: "app/error.tsx" },
    });
  });
});

describe("setUserContext - Sentry integration", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    global.window = originalWindow;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("should call Sentry.setUser with sanitized data", () => {
    setUserContext("user@example.com", { plan: "pro" });

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "[EMAIL_REDACTED]",
      plan: "pro",
    });
  });

  it("should sanitize metadata emails", () => {
    setUserContext("user-123", { email: "test@example.com" });

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "user-123",
      email: "[EMAIL_REDACTED]",
    });
  });
});

describe("clearUserContext - Sentry integration", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    global.window = originalWindow;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("should call Sentry.setUser with null", () => {
    clearUserContext();

    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});
