import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getCanaryInitOptions, getServerCanaryConfigSource } from "./canary";

describe("getCanaryInitOptions", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CANARY_ENDPOINT;
    delete process.env.CANARY_API_KEY;
    delete process.env.NEXT_PUBLIC_CANARY_ENDPOINT;
    delete process.env.NEXT_PUBLIC_CANARY_API_KEY;
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null for client when public Canary env is missing", () => {
    expect(getCanaryInitOptions("client")).toBeNull();
    expect(getServerCanaryConfigSource()).toBeNull();
  });

  it("uses public Canary env for the client", () => {
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = " https://canary.example ";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = " public-key ";

    expect(getCanaryInitOptions("client")).toEqual({
      endpoint: "https://canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
  });

  it("rejects invalid public Canary endpoints", () => {
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";

    expect(getCanaryInitOptions("client")).toBeNull();
    expect(getServerCanaryConfigSource()).toBeNull();
  });

  it("prefers dedicated server Canary env when present", () => {
    process.env.CANARY_ENDPOINT = "https://server-canary.example";
    process.env.CANARY_API_KEY = "server-key";
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "https://public-canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";

    expect(getServerCanaryConfigSource()).toBe("dedicated");
    expect(getCanaryInitOptions("server")).toEqual({
      endpoint: "https://server-canary.example",
      apiKey: "server-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
  });

  it("does not use public fallback for production server capture", () => {
    process.env.CANARY_ENDPOINT = "ftp://server-canary.example";
    process.env.CANARY_API_KEY = "server-key";
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "https://public-canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";

    expect(getServerCanaryConfigSource()).toBeNull();
    expect(getCanaryInitOptions("server")).toBeNull();
  });

  it("falls back to public Canary env on the server outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "https://public-canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";

    expect(getServerCanaryConfigSource()).toBe("public_fallback");
    expect(getCanaryInitOptions("server")).toEqual({
      endpoint: "https://public-canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "development",
      scrubPii: true,
    });
  });

  it("allows public server fallback for Vercel preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_CANARY_ENDPOINT = "https://public-canary.example";
    process.env.NEXT_PUBLIC_CANARY_API_KEY = "public-key";

    expect(getServerCanaryConfigSource()).toBe("public_fallback");
    expect(getCanaryInitOptions("server")).toEqual({
      endpoint: "https://public-canary.example",
      apiKey: "public-key",
      service: "volume",
      environment: "production",
      scrubPii: true,
    });
  });
});
