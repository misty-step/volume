import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServerClerkPublishableKey } from "./public-service-config.server";

describe("public service config server", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns trimmed public env values when configured", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "  pk_test_configured  ";

    expect(getServerClerkPublishableKey()).toBe("pk_test_configured");
  });

  it("uses deterministic local fallback outside hosted builds", () => {
    const publishableKey = getServerClerkPublishableKey();

    expect(publishableKey.startsWith("pk_test_")).toBe(true);

    const encodedFrontendApi = publishableKey.split("_")[2];
    expect(Buffer.from(encodedFrontendApi, "base64").toString("utf8")).toBe(
      "local-build.clerk.accounts.dev$"
    );
  });

  it("fails closed for hosted server builds missing Clerk config", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";

    expect(() => getServerClerkPublishableKey()).toThrow(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for hosted server build"
    );
  });
});
