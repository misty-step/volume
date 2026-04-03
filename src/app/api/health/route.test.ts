// @vitest-environment node

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock resolveVersion before importing the module
vi.mock("@/lib/version", () => ({
  resolveVersion: () => "test-version-123",
}));

describe("GET /api/health", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to known state
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://public@sentry.io/456";
    process.env.SENTRY_DSN = "https://server@sentry.io/123";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns pass when all env vars are configured", async () => {
    // Dynamic import to pick up env changes
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("pass");
    expect(data.checks.clientRuntime.status).toBe("pass");
    expect(data.checks.convex.status).toBe("pass");
    expect(data.checks.stripe.status).toBe("pass");
    expect(data.checks.coachRuntime.status).toBe("pass");
    expect(data.checks.errorTracking.status).toBe("pass");
    expect(data.checks.sentry.status).toBe("pass");
    expect(data.checks.coachRuntime.defaultModel).toBe(
      "qwen/qwen3.5-flash-02-23"
    );
    expect(data.checks.coachRuntime.configuredModel).toBe(
      "qwen/qwen3.5-flash-02-23"
    );
    expect(data.checks.coachRuntime.apiKeyEnvVar).toBeUndefined();
    expect(data.checks.coachRuntime.modelOverrideEnvVar).toBeUndefined();
    expect(data.checks.stripe.reason).toBeUndefined();
  });

  it("reflects the configured coach model override", async () => {
    process.env.COACH_AGENT_MODEL = "openai/gpt-4o-mini";

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.checks.coachRuntime.defaultModel).toBe(
      "qwen/qwen3.5-flash-02-23"
    );
    expect(data.checks.coachRuntime.configuredModel).toBe("openai/gpt-4o-mini");
  });

  it("returns fail when Convex URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;

    // Re-import to pick up env changes
    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.clientRuntime.status).toBe("fail");
    expect(data.checks.convex.status).toBe("fail");
  });

  it("returns fail when OpenRouter key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.coachRuntime.status).toBe("fail");
    expect(data.checks.coachRuntime.reason).toBe(
      "missing required coach runtime configuration"
    );
    expect(data.checks.coachRuntime.apiKeyEnvVar).toBeUndefined();
  });

  it("treats whitespace-only OpenRouter key as missing", async () => {
    process.env.OPENROUTER_API_KEY = "   ";

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.coachRuntime.status).toBe("fail");
    expect(data.checks.coachRuntime.reason).toBe(
      "missing required coach runtime configuration"
    );
  });

  it("returns fail when Stripe secret key is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.stripe.status).toBe("fail");
    expect(data.checks.stripe.reason).toBe(
      "missing required billing configuration"
    );
  });

  it("returns fail when Stripe price IDs are missing", async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
    delete process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID;

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.stripe.status).toBe("fail");
    expect(data.checks.stripe.reason).toBe(
      "missing required billing configuration"
    );
  });

  it.each([
    {
      env: "production",
      key: "sk_test_123",
      expectedWarning: "KEY/ENV MISMATCH: test key in production",
    },
    {
      env: "development",
      key: "sk_live_123",
      expectedWarning: "KEY/ENV MISMATCH: live key in development",
    },
  ])(
    "returns fail when Stripe key mode mismatches deployment env ($env)",
    async ({ env, key, expectedWarning }) => {
      process.env.VERCEL_ENV = env;
      process.env.NODE_ENV =
        env === "production" ? "production" : "development";
      process.env.STRIPE_SECRET_KEY = key;

      vi.resetModules();
      vi.mock("@/lib/version", () => ({
        resolveVersion: () => "test-version-123",
      }));
      const { GET } = await import("./route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("fail");
      expect(data.checks.stripe.status).toBe("fail");
      expect(data.checks.stripe.keyMode).toBe(
        key.startsWith("sk_live_") ? "live" : "test"
      );
      expect(data.checks.stripe.environment).toBe(env);
      expect(data.checks.stripe.warning).toBe(expectedWarning);
      expect(data.checks.coachRuntime.status).toBe("pass");
    }
  );

  it("returns pass when Canary public env provides both client and server error tracking", async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "https://canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("pass");
    expect(data.checks.errorTracking.status).toBe("pass");
    expect(data.checks.errorTracking.clientProviders).toEqual({
      sentry: false,
      canary: true,
    });
    expect(data.checks.errorTracking.serverProviders).toEqual({
      sentry: false,
      canary: true,
    });
    expect(data.checks.sentry.status).toBe("fail");
  });

  it("includes version and timestamp in response", async () => {
    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(data.version).toBe("test-version-123");
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
  });

  it("sets no-cache headers", async () => {
    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate"
    );
  });

  it("returns fail when no client error-tracking provider is configured", async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.errorTracking.status).toBe("fail");
    expect(data.checks.sentry.status).toBe("fail");
    expect(data.checks.errorTracking.reason).toBe(
      "missing required error-tracking configuration"
    );
  });

  it("returns fail when Clerk publishable key is missing", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.clientRuntime.status).toBe("fail");
    expect(data.checks.clientRuntime.reason).toBe(
      "missing required public auth/bootstrap configuration"
    );
  });
});
