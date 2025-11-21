import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setUserContext,
  clearUserContext,
  withUserContext,
  getUserContextForTests,
} from "../context";
import * as Sentry from "@sentry/nextjs";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
}));

describe("ContextManager", () => {
  beforeEach(() => {
    // Clear context before each test
    // We need to bypass the check temporarily or mock window?
    // The implementation checks typeof window === 'undefined'

    // In Vitest (jsdom), window is defined.
    clearUserContext();
    vi.clearAllMocks();
  });

  it("should set user context and sync to Sentry", () => {
    setUserContext("user_123", { plan: "pro", email: "test@example.com" });

    const context = getUserContextForTests();
    expect(context).not.toBeNull();
    expect(context?.userId).toBe("user_123");
    expect(context?.metadata.plan).toBe("pro");
    expect(context?.metadata.email).toBe("[EMAIL_REDACTED]");

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "user_123",
      plan: "pro",
      email: "[EMAIL_REDACTED]",
    });
  });

  it("should clear user context", () => {
    setUserContext("user_123");
    clearUserContext();

    const context = getUserContextForTests();
    expect(context).toBeNull();

    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  it("should enrich properties with user context", () => {
    setUserContext("user_123", { plan: "pro" });

    const props = { eventProp: "value" };
    const enriched = withUserContext(props);

    expect(enriched.eventProp).toBe("value");
    expect(enriched.userId).toBe("user_123");
    expect(enriched.plan).toBe("pro");
  });

  it("should not overwrite existing properties", () => {
    setUserContext("user_123", { plan: "pro" });

    const props = { userId: "explicit_id", plan: "override" };
    const enriched = withUserContext(props);

    expect(enriched.userId).toBe("explicit_id");
    expect(enriched.plan).toBe("override");
  });

  it("should return original props if no context set", () => {
    clearUserContext();
    const props = { eventProp: "value" };
    const enriched = withUserContext(props);

    expect(enriched).toEqual(props);
    expect(enriched).toBe(props); // Optimization: returns same object
  });

  it("should return original props (same ref) if window undefined (SSR guard)", () => {
    // Simulate SSR
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const props = { eventProp: "value" };
    const enriched = withUserContext(props);

    expect(enriched).toBe(props); // Same reference

    // Restore window
    global.window = originalWindow;
  });

  it("should throw error if setUserContext called on server", () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    expect(() => setUserContext("user_123")).toThrow("client-side");

    global.window = originalWindow;
  });
});
