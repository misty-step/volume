// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initCanaryMock = vi.fn();

vi.mock("@canary-obs/sdk", () => ({
  initCanary: (...args: unknown[]) => initCanaryMock(...args),
}));

vi.mock("@canary-obs/sdk/nextjs", () => ({
  onRequestError: vi.fn(),
}));

describe("instrumentation register", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CANARY_ENDPOINT;
    delete process.env.CANARY_API_KEY;
    delete process.env.NEXT_PUBLIC_CANARY_ENDPOINT;
    delete process.env.NEXT_PUBLIC_CANARY_API_KEY;
    process.env.NODE_ENV = "production";
    initCanaryMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("initializes server Canary from public fallback env", async () => {
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "https://canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";

    vi.resetModules();
    const { register } = await import("./instrumentation");
    register();

    expect(initCanaryMock).toHaveBeenCalledWith({
      endpoint: "https://canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
  });
});
