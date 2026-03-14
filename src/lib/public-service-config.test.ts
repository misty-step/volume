import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getClientClerkPublishableKey,
  getClientConvexUrl,
} from "./public-service-config";

describe("public service config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns trimmed public env values when configured", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "  pk_test_configured  ";
    process.env.NEXT_PUBLIC_CONVEX_URL = "  https://configured.convex.cloud  ";

    expect(getClientClerkPublishableKey()).toBe("pk_test_configured");
    expect(getClientConvexUrl()).toBe("https://configured.convex.cloud");
  });

  it("uses deterministic local build fallbacks outside hosted Vercel", () => {
    const publishableKey = getClientClerkPublishableKey();

    expect(publishableKey.startsWith("pk_test_")).toBe(true);
    expect(getClientConvexUrl()).toBe("https://local-build.convex.cloud");

    const encodedFrontendApi = publishableKey.split("_")[2];
    expect(Buffer.from(encodedFrontendApi, "base64").toString("utf8")).toBe(
      "local-build.clerk.accounts.dev$"
    );
  });

  it("fails closed for hosted Vercel builds missing Clerk config", () => {
    process.env.VERCEL_ENV = "preview";

    expect(() => getClientClerkPublishableKey()).toThrow(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for hosted Vercel build"
    );
  });

  it("fails closed for hosted Vercel builds missing Convex config", () => {
    process.env.VERCEL_ENV = "production";

    expect(() => getClientConvexUrl()).toThrow(
      "Missing NEXT_PUBLIC_CONVEX_URL for hosted Vercel build"
    );
  });
});
