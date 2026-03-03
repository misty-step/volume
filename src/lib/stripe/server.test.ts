import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockStripeConstructor,
  mockGetRequiredEnv,
  mockGetDeploymentEnvironment,
} = vi.hoisted(() => ({
  mockStripeConstructor: vi.fn().mockImplementation(() => ({})),
  mockGetRequiredEnv: vi.fn(),
  mockGetDeploymentEnvironment: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("stripe", () => ({
  default: mockStripeConstructor,
}));

vi.mock("./config", () => ({
  getRequiredEnv: mockGetRequiredEnv,
  STRIPE_API_VERSION: "2026-01-28.clover",
}));

vi.mock("@/lib/environment", () => ({
  getDeploymentEnvironment: mockGetDeploymentEnvironment,
}));

async function loadGetStripe() {
  const mod = await import("./server");
  return mod.getStripe;
}

describe("getStripe", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("succeeds with live key in production", async () => {
    mockGetRequiredEnv.mockReturnValue("sk_live_prod_123");
    mockGetDeploymentEnvironment.mockReturnValue("production");

    const getStripe = await loadGetStripe();
    expect(() => getStripe()).not.toThrow();

    expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
    expect(mockStripeConstructor).toHaveBeenCalledWith(
      "sk_live_prod_123",
      expect.objectContaining({
        apiVersion: "2026-01-28.clover",
        typescript: true,
      })
    );
  });

  it("throws FATAL error for test key in production", async () => {
    mockGetRequiredEnv.mockReturnValue("sk_test_prod_123");
    mockGetDeploymentEnvironment.mockReturnValue("production");

    const getStripe = await loadGetStripe();

    expect(() => getStripe()).toThrow(/FATAL: Test Stripe key/);
    expect(mockStripeConstructor).not.toHaveBeenCalled();
  });

  it("throws FATAL error for live key in development", async () => {
    mockGetRequiredEnv.mockReturnValue("sk_live_dev_123");
    mockGetDeploymentEnvironment.mockReturnValue("development");

    const getStripe = await loadGetStripe();

    expect(() => getStripe()).toThrow(/FATAL: Live Stripe key/);
    expect(mockStripeConstructor).not.toHaveBeenCalled();
  });

  it("succeeds with test key in development", async () => {
    mockGetRequiredEnv.mockReturnValue("sk_test_dev_123");
    mockGetDeploymentEnvironment.mockReturnValue("development");

    const getStripe = await loadGetStripe();

    expect(() => getStripe()).not.toThrow();
    expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
  });

  it("accepts null-mode keys without env validation failure", async () => {
    mockGetRequiredEnv.mockReturnValue("whsec_123456");
    mockGetDeploymentEnvironment.mockReturnValue("production");

    const getStripe = await loadGetStripe();

    expect(() => getStripe()).not.toThrow();
    expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
  });

  it("applies parseKeyMode behavior for publishable key prefixes", async () => {
    mockGetRequiredEnv.mockReturnValue("pk_test_123");
    mockGetDeploymentEnvironment.mockReturnValue("production");
    let getStripe = await loadGetStripe();
    expect(() => getStripe()).toThrow(/FATAL: Test Stripe key/);

    vi.resetModules();
    vi.clearAllMocks();
    mockGetRequiredEnv.mockReturnValue("pk_live_123");
    mockGetDeploymentEnvironment.mockReturnValue("development");
    getStripe = await loadGetStripe();
    expect(() => getStripe()).toThrow(/FATAL: Live Stripe key/);
  });

  it("returns the same singleton instance across repeated calls", async () => {
    const instance = { client: "stripe" };
    mockStripeConstructor.mockImplementation(() => instance);
    mockGetRequiredEnv.mockReturnValue("sk_test_singleton_123");
    mockGetDeploymentEnvironment.mockReturnValue("development");

    const getStripe = await loadGetStripe();

    const first = getStripe();
    const second = getStripe();

    expect(first).toBe(second);
    expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
    expect(mockGetRequiredEnv).toHaveBeenCalledTimes(1);
  });
});
