/**
 * Tests for analytics module - focusing on server-side safety guards
 * and Canary-backed error reporting.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const canaryMocks = vi.hoisted(() => ({
  initCanary: vi.fn(),
  captureException: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@canary-obs/sdk", () => ({
  initCanary: (...args: unknown[]) => canaryMocks.initCanary(...args),
  captureException: (...args: unknown[]) =>
    canaryMocks.captureException(...args),
}));

async function loadAnalytics() {
  return await import("./analytics");
}

describe("analytics - server-side safety guards", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    global.window = originalWindow;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe("setUserContext", () => {
    it("throws when called server-side", async () => {
      const { setUserContext } = await loadAnalytics();
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      expect(() => {
        setUserContext("user-123", { plan: "pro" });
      }).toThrow("setUserContext must only be called client-side");

      global.window = originalWindow;
    });

    it("works when called client-side", async () => {
      const { setUserContext } = await loadAnalytics();
      global.window = originalWindow;

      expect(() => {
        setUserContext("user-123", { plan: "pro" });
      }).not.toThrow();
    });

    it("includes the context leakage explanation in the thrown message", async () => {
      const { setUserContext } = await loadAnalytics();
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

      global.window = originalWindow;
    });
  });

  describe("clearUserContext", () => {
    it("throws when called server-side", async () => {
      const { clearUserContext } = await loadAnalytics();
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      expect(() => {
        clearUserContext();
      }).toThrow("clearUserContext must only be called client-side");

      global.window = originalWindow;
    });

    it("works when called client-side", async () => {
      const { clearUserContext } = await loadAnalytics();
      global.window = originalWindow;

      expect(() => {
        clearUserContext();
      }).not.toThrow();
    });

    it("includes the context leakage explanation in the thrown message", async () => {
      const { clearUserContext } = await loadAnalytics();
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

      global.window = originalWindow;
    });
  });

  describe("trackEvent", () => {
    it("works server-side without user context enrichment", async () => {
      const { trackEvent } = await loadAnalytics();
      // @ts-expect-error - Intentionally deleting window for test
      delete global.window;

      expect(() => {
        trackEvent("Exercise Created", {
          exerciseId: "ex-123",
          userId: "user-explicit",
        });
      }).not.toThrow();

      global.window = originalWindow;
    });

    it("works client-side with user context enrichment", async () => {
      const { setUserContext, clearUserContext, trackEvent } =
        await loadAnalytics();
      global.window = originalWindow;

      setUserContext("user-123", { plan: "pro" });

      expect(() => {
        trackEvent("Exercise Created", {
          exerciseId: "ex-123",
        });
      }).not.toThrow();

      clearUserContext();
    });
  });
});

describe("reportError", () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_CANARY_ENDPOINT: "https://canary.example",
      NEXT_PUBLIC_CANARY_API_KEY: "public-key",
      NODE_ENV: "production",
    };
    global.window = originalWindow;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  it("calls Canary captureException with the error", async () => {
    const { reportError } = await loadAnalytics();
    const error = new Error("Test error");

    reportError(error);

    expect(canaryMocks.initCanary).toHaveBeenCalledWith({
      endpoint: "https://canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
    expect(canaryMocks.captureException).toHaveBeenCalledWith(error, {
      context: undefined,
    });
  });

  it("sanitizes context before sending to Canary", async () => {
    const { reportError } = await loadAnalytics();
    const error = new Error("Test error");

    reportError(error, {
      userId: "user@example.com",
      operation: "test-op",
    });

    expect(canaryMocks.captureException).toHaveBeenCalledWith(error, {
      context: {
        userId: "[EMAIL_REDACTED]",
        operation: "test-op",
      },
    });
  });

  it("skips null and undefined context values", async () => {
    const { reportError } = await loadAnalytics();
    const error = new Error("Test error");

    reportError(error, {
      userId: "user-123",
      // @ts-expect-error Testing runtime behavior with null
      nullValue: null,
      // @ts-expect-error Testing runtime behavior with undefined
      undefinedValue: undefined,
    });

    expect(canaryMocks.captureException).toHaveBeenCalledWith(error, {
      context: {
        userId: "user-123",
      },
    });
  });

  it("stringifies and sanitizes nested objects in context", async () => {
    const { reportError } = await loadAnalytics();
    const error = new Error("Test error");

    reportError(error, {
      operation: "test",
      metadata: { email: "user@example.com", plan: "pro" },
    });

    expect(canaryMocks.captureException).toHaveBeenCalledWith(error, {
      context: {
        operation: "test",
        metadata: '{"email":"[EMAIL_REDACTED]","plan":"pro"}',
      },
    });
  });

  it("does not call Canary when it is disabled", async () => {
    const { reportError } = await loadAnalytics();
    process.env = {
      ...originalEnv,
      CANARY_ENDPOINT: undefined,
      CANARY_API_KEY: undefined,
      NEXT_PUBLIC_CANARY_ENDPOINT: undefined,
      NEXT_PUBLIC_CANARY_API_KEY: undefined,
      NODE_ENV: "production",
    };

    reportError(new Error("Test error"));

    expect(canaryMocks.captureException).not.toHaveBeenCalled();
    expect(canaryMocks.initCanary).not.toHaveBeenCalled();
  });

  it("initializes Canary on the server from public fallback env", async () => {
    const { reportError } = await loadAnalytics();
    // @ts-expect-error - Intentionally deleting window for test
    delete global.window;
    process.env = {
      ...originalEnv,
      CANARY_ENDPOINT: undefined,
      CANARY_API_KEY: undefined,
      NEXT_PUBLIC_CANARY_ENDPOINT: "https://canary.example",
      NEXT_PUBLIC_CANARY_API_KEY: "public-key",
      NODE_ENV: "production",
    };

    const error = new Error("Test error");
    reportError(error, { route: "coach" });

    expect(canaryMocks.initCanary).toHaveBeenCalledWith({
      endpoint: "https://canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
    expect(canaryMocks.captureException).toHaveBeenCalledWith(error, {
      context: { route: "coach" },
    });
  });

  it("initializes Canary in the browser before capturing", async () => {
    const { reportError } = await loadAnalytics();
    global.window = {} as Window & typeof globalThis;

    const error = new Error("Test error");
    reportError(error, { boundary: "app/error.tsx" });

    expect(canaryMocks.initCanary).toHaveBeenCalledWith({
      endpoint: "https://canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
    expect(canaryMocks.captureException).toHaveBeenCalledWith(error, {
      context: { boundary: "app/error.tsx" },
    });
  });

  it("merges client user context into Canary error reports", async () => {
    const { setUserContext, reportError } = await loadAnalytics();
    global.window = {} as Window & typeof globalThis;

    setUserContext("user@example.com", { plan: "pro" });
    const error = new Error("Test error");
    reportError(error, { boundary: "app/error.tsx" });

    expect(canaryMocks.captureException).toHaveBeenCalledWith(error, {
      context: {
        boundary: "app/error.tsx",
        userId: "[EMAIL_REDACTED]",
        plan: "pro",
      },
    });
  });
});
