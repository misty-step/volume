import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getDeploymentEnvironment,
  isServerProductionDeployment,
} from "./environment";

describe("getDeploymentEnvironment", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses NEXT_PUBLIC_VERCEL_ENV fallback by default", () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
    process.env.NODE_ENV = "production";

    expect(getDeploymentEnvironment()).toBe("preview");
  });

  it("can disable NEXT_PUBLIC_VERCEL_ENV fallback for server-only guards", () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
    process.env.NODE_ENV = "production";

    expect(getDeploymentEnvironment({ preferClientFallback: false })).toBe(
      "production"
    );
  });

  it("falls back to NODE_ENV for unknown VERCEL_ENV values", () => {
    process.env.VERCEL_ENV = "development";
    process.env.NODE_ENV = "production";

    expect(getDeploymentEnvironment()).toBe("production");
  });
});

describe("isServerProductionDeployment", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("treats NODE_ENV=production as production when VERCEL_ENV is absent", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    expect(isServerProductionDeployment()).toBe(true);
  });

  it("returns false for preview deployments", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    expect(isServerProductionDeployment()).toBe(false);
  });
});
