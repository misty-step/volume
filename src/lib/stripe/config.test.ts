import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

function setRequiredPriceIds() {
  process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly_default";
  process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual_default";
}

describe("stripe config", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    setRequiredPriceIds();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("getRequiredEnv throws when env var is missing", async () => {
    const { getRequiredEnv } = await import("./config");

    delete process.env.STRIPE_SECRET_KEY;

    expect(() => getRequiredEnv("STRIPE_SECRET_KEY")).toThrow(
      "Missing required Stripe environment variable: STRIPE_SECRET_KEY"
    );
  });

  it("getRequiredEnv returns trimmed value", async () => {
    const { getRequiredEnv } = await import("./config");

    process.env.STRIPE_SECRET_KEY = "  sk_test_12345  ";

    expect(getRequiredEnv("STRIPE_SECRET_KEY")).toBe("sk_test_12345");
  });

  it("STRIPE_API_VERSION is a non-empty string", async () => {
    const { STRIPE_API_VERSION } = await import("./config");

    expect(typeof STRIPE_API_VERSION).toBe("string");
    expect(STRIPE_API_VERSION.length).toBeGreaterThan(0);
  });

  it("PRICE_IDS uses trimmed module-level values", async () => {
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "  price_monthly_trim  ";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "  price_annual_trim  ";

    vi.resetModules();
    const { PRICE_IDS } = await import("./config");

    expect(PRICE_IDS).toEqual({
      monthly: "price_monthly_trim",
      annual: "price_annual_trim",
    });
  });

  it("throws at module load when required price ids are missing", async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
    delete process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID;

    vi.resetModules();
    await expect(import("./config")).rejects.toThrow(
      "Missing Stripe price IDs: NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID, NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID"
    );
  });
});
