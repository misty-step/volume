import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getClientClerkPublishableKey,
  getClientConvexUrl,
} from "./public-service-config.client";

describe("public service config client", () => {
  const originalEnv = process.env;

  function stubHostname(hostname: string) {
    vi.stubGlobal("window", {
      location: { hostname },
    });
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    stubHostname("localhost");
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("returns trimmed public env values when configured", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "  pk_test_configured  ";
    process.env.NEXT_PUBLIC_CONVEX_URL = "  https://configured.convex.cloud  ";

    expect(getClientClerkPublishableKey()).toBe("pk_test_configured");
    expect(getClientConvexUrl()).toBe("https://configured.convex.cloud");
  });

  it("uses deterministic local fallbacks on localhost", () => {
    const publishableKey = getClientClerkPublishableKey();

    expect(publishableKey.startsWith("pk_test_")).toBe(true);
    expect(getClientConvexUrl()).toBe("https://local-build.convex.cloud");

    const encodedFrontendApi = publishableKey.split("_")[2];
    expect(Buffer.from(encodedFrontendApi, "base64").toString("utf8")).toBe(
      "local-build.clerk.accounts.dev$"
    );
  });

  it("fails closed for hosted browser runtimes missing Convex config", () => {
    stubHostname("volume.fitness");

    expect(() => getClientConvexUrl()).toThrow(
      "Missing NEXT_PUBLIC_CONVEX_URL for hosted client runtime"
    );
  });

  it("fails closed for hosted browser runtimes missing Clerk config", () => {
    stubHostname("volume.fitness");

    expect(() => getClientClerkPublishableKey()).toThrow(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for hosted client runtime"
    );
  });
});
