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
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns pass when all env vars are configured", async () => {
    // Set all required env vars
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";

    // Dynamic import to pick up env changes
    const { GET } = await import("./route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("pass");
    expect(data.checks.convex.status).toBe("pass");
    expect(data.checks.stripe.status).toBe("pass");
    expect(data.checks.coachRuntime.status).toBe("pass");
    expect(data.checks.stripe.missing).toBeUndefined();
  });

  it("returns fail when Convex URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";

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
    expect(data.checks.convex.status).toBe("fail");
  });

  it("returns fail when OpenRouter key is missing", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
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
    expect(data.checks.coachRuntime.missing).toContain("OPENROUTER_API_KEY");
  });

  it("treats whitespace-only OpenRouter key as missing", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
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
    expect(data.checks.coachRuntime.missing).toContain("OPENROUTER_API_KEY");
  });

  it("returns fail when Stripe secret key is missing", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    delete process.env.STRIPE_SECRET_KEY;
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";

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
    expect(data.checks.stripe.missing).toContain("STRIPE_SECRET_KEY");
  });

  it("returns fail when Stripe price IDs are missing", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    delete process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
    delete process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID;
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";

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
    expect(data.checks.stripe.missing).toContain(
      "NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID"
    );
    expect(data.checks.stripe.missing).toContain(
      "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID"
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
      process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
      process.env.STRIPE_SECRET_KEY = key;
      process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
      process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
      process.env.OPENROUTER_API_KEY = "sk-or-v1-test";

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

  it("includes version and timestamp in response", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";

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
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";

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
});
