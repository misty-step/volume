import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getClientConvexUrl } from "./public-service-config.client";

describe("public service config client", () => {
  const originalEnv = process.env;

  function stubHostname(hostname: string) {
    vi.stubGlobal("window", {
      location: { hostname },
    });
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    stubHostname("localhost");
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("returns trimmed public env values when configured", () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "  https://configured.convex.cloud  ";

    expect(getClientConvexUrl()).toBe("https://configured.convex.cloud");
  });

  it("uses deterministic local fallbacks on localhost", () => {
    expect(getClientConvexUrl()).toBe("https://local-build.convex.cloud");
  });

  it("fails closed for hosted browser runtimes missing Convex config", () => {
    stubHostname("volume.fitness");

    expect(() => getClientConvexUrl()).toThrow(
      "Missing NEXT_PUBLIC_CONVEX_URL for hosted client runtime"
    );
  });

  it("fails closed during SSR for hosted deployments", () => {
    vi.stubGlobal("window", undefined);
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

    expect(() => getClientConvexUrl()).toThrow(
      "Missing NEXT_PUBLIC_CONVEX_URL for hosted client runtime"
    );
  });
});
