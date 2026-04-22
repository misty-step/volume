// @vitest-environment node

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/version", () => ({
  resolveVersion: () => "test-version-123",
}));

describe("GET /api/health", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CANARY_ENDPOINT;
    delete process.env.CANARY_API_KEY;
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "https://canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loadRoute() {
    vi.resetModules();
    vi.mock("@/lib/version", () => ({
      resolveVersion: () => "test-version-123",
    }));
    return await import("./route");
  }

  it("returns pass when all env vars are configured", async () => {
    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("pass");
    expect(data.checks.clientRuntime.status).toBe("pass");
    expect(data.checks.convex.status).toBe("pass");
    expect(data.checks.stripe.status).toBe("pass");
    expect(data.checks.coachRuntime.status).toBe("pass");
    expect(data.checks.errorTracking.status).toBe("pass");
    expect(data.checks.errorTracking.clientConfigured).toBe(true);
    expect(data.checks.errorTracking.serverConfigured).toBe(true);
    expect(data.checks.errorTracking.serverKeySource).toBe("public_fallback");
    expect(data.checks.coachRuntime.defaultModel).toBe(
      "google/gemini-3-flash-preview"
    );
    expect(data.checks.coachRuntime.configuredModel).toBe(
      "google/gemini-3-flash-preview"
    );
    expect(data.checks.coachRuntime.apiKeyEnvVar).toBeUndefined();
    expect(data.checks.coachRuntime.modelOverrideEnvVar).toBeUndefined();
    expect(data.checks.stripe.reason).toBeUndefined();
  });

  it("reflects the configured coach model override", async () => {
    process.env.COACH_AGENT_MODEL = "openai/gpt-4o-mini";

    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.checks.coachRuntime.defaultModel).toBe(
      "google/gemini-3-flash-preview"
    );
    expect(data.checks.coachRuntime.configuredModel).toBe("openai/gpt-4o-mini");
  });

  it("returns fail when Convex URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;

    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.clientRuntime.status).toBe("fail");
    expect(data.checks.convex.status).toBe("fail");
  });

  it("returns fail when OpenRouter key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const { GET } = await loadRoute();
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

    const { GET } = await loadRoute();
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

    const { GET } = await loadRoute();
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

    const { GET } = await loadRoute();
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

      const { GET } = await loadRoute();
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

  it("returns pass when public Canary env provides both client and server error tracking", async () => {
    delete process.env.CANARY_ENDPOINT;
    delete process.env.CANARY_API_KEY;

    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("pass");
    expect(data.checks.errorTracking.status).toBe("pass");
    expect(data.checks.errorTracking.clientConfigured).toBe(true);
    expect(data.checks.errorTracking.serverConfigured).toBe(true);
    expect(data.checks.errorTracking.serverKeySource).toBe("public_fallback");
  });

  it("returns fail in production when server Canary falls back to public config", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    delete process.env.CANARY_ENDPOINT;
    delete process.env.CANARY_API_KEY;

    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.errorTracking.status).toBe("fail");
    expect(data.checks.errorTracking.clientConfigured).toBe(true);
    expect(data.checks.errorTracking.serverConfigured).toBe(true);
    expect(data.checks.errorTracking.serverKeySource).toBe("public_fallback");
    expect(data.checks.errorTracking.reason).toBe(
      "missing dedicated server Canary configuration"
    );
  });

  it("returns pass in production when dedicated server Canary env is present", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    process.env.CANARY_ENDPOINT = "https://server-canary.example";
    process.env.CANARY_API_KEY = "server-key";

    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("pass");
    expect(data.checks.errorTracking.status).toBe("pass");
    expect(data.checks.errorTracking.clientConfigured).toBe(true);
    expect(data.checks.errorTracking.serverConfigured).toBe(true);
    expect(data.checks.errorTracking.serverKeySource).toBe("dedicated");
  });

  it("returns fail when no public Canary client configuration is present", async () => {
    delete process.env.NEXT_PUBLIC_CANARY_ENDPOINT;
    delete process.env.NEXT_PUBLIC_CANARY_API_KEY;
    process.env.CANARY_ENDPOINT = "https://server-canary.example";
    process.env.CANARY_API_KEY = "server-key";

    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("fail");
    expect(data.checks.errorTracking.status).toBe("fail");
    expect(data.checks.errorTracking.clientConfigured).toBe(false);
    expect(data.checks.errorTracking.serverConfigured).toBe(true);
    expect(data.checks.errorTracking.serverKeySource).toBe("dedicated");
    expect(data.checks.errorTracking.reason).toBe(
      "missing required Canary configuration"
    );
  });

  it("includes version and timestamp in response", async () => {
    const { GET } = await loadRoute();
    const response = await GET();
    const data = await response.json();

    expect(data.version).toBe("test-version-123");
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("sets no-cache headers", async () => {
    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate"
    );
  });

  it("returns fail when Clerk publishable key is missing", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    const { GET } = await loadRoute();
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
