import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadE2EEnv } from "../../e2e/env";

const originalEnv = process.env;

describe("loadE2EEnv", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      CLERK_SECRET_KEY: "sk_test_123",
      CLERK_JWT_ISSUER_DOMAIN: "clerk.volume.test",
      CLERK_TEST_USER_EMAIL: "test+e2e@example.com",
      CLERK_TEST_USER_PASSWORD: "secure-password",
      NEXT_PUBLIC_CONVEX_URL: "https://volume-test.convex.cloud",
      TEST_RESET_SECRET: "reset-secret",
    };
    delete process.env.CLERK_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("accepts the full CI env contract", () => {
    const env = loadE2EEnv();

    expect(env.NEXT_PUBLIC_CONVEX_URL).toBe("https://volume-test.convex.cloud");
    expect(env.CLERK_PUBLISHABLE_KEY).toBe("pk_test_123");
  });

  it("fails closed when NEXT_PUBLIC_CONVEX_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;

    expect(() => loadE2EEnv()).toThrowError(/NEXT_PUBLIC_CONVEX_URL/);
  });

  it("normalizes NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY into CLERK_PUBLISHABLE_KEY", () => {
    const env = loadE2EEnv();

    expect(env.CLERK_PUBLISHABLE_KEY).toBe(
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    );
  });
});
