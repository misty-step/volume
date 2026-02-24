import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, HEAD, POST } from "./route";

const originalEnv = { ...process.env };

function createNextRequest(url: string, init?: RequestInit): NextRequest {
  const request = new Request(url, init);
  return Object.assign(request, { nextUrl: new URL(url) }) as NextRequest;
}

describe("/ingest proxy route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST;
    delete process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST;
    delete process.env.POSTHOG_PROXY_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("forwards non-static requests and strips unsafe headers", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST = "https://ingest.example.com/";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("ok", {
        status: 202,
        headers: {
          "cache-control": "public, max-age=120",
          "content-type": "text/plain",
          "set-cookie": "ignored=true",
        },
      })
    );

    const request = createNextRequest(
      "https://volume.fitness/ingest/e?foo=bar",
      {
        method: "POST",
        headers: {
          authorization: "Bearer token",
          connection: "keep-alive",
          cookie: "session=1",
          "x-custom": "keep",
          "x-forwarded-for": "1.2.3.4",
        },
        body: JSON.stringify({ hello: "world" }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ path: ["e"] }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ingest.example.com/e?foo=bar",
      expect.objectContaining({
        cache: "no-store",
        method: "POST",
        redirect: "manual",
      })
    );

    const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit & {
      headers: Headers;
    };

    expect(fetchOptions.body).toBeInstanceOf(ArrayBuffer);
    expect(fetchOptions.headers.get("authorization")).toBeNull();
    expect(fetchOptions.headers.get("connection")).toBeNull();
    expect(fetchOptions.headers.get("cookie")).toBeNull();
    expect(fetchOptions.headers.get("x-custom")).toBe("keep");
    expect(fetchOptions.headers.get("x-forwarded-for")).toBe("1.2.3.4");

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).toBe("ok");
  });

  it("routes static assets to assets host and preserves cache headers", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST =
      "https://assets.example.com///";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("asset", {
        status: 200,
        headers: {
          "cache-control": "public, max-age=31536000",
          "set-cookie": "asset=1",
        },
      })
    );

    const request = createNextRequest(
      "https://volume.fitness/ingest/static/app.js?v=123",
      { method: "GET" }
    );

    const response = await GET(request, {
      params: { path: ["static", "app.js"] },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://assets.example.com/static/app.js?v=123",
      expect.objectContaining({
        method: "GET",
      })
    );

    const fetchOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchOptions.body).toBeUndefined();
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000"
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).toBe("asset");
  });

  it("uses configured timeout when provided", async () => {
    process.env.POSTHOG_PROXY_TIMEOUT_MS = "1234";
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(AbortSignal.abort());

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("ok"));
    const request = createNextRequest("https://volume.fitness/ingest/e", {
      method: "HEAD",
    });

    const response = await HEAD(request, {
      params: { path: ["e"] },
    });

    expect(timeoutSpy).toHaveBeenCalledWith(1234);
    expect(response.status).toBe(200);
  });

  it("falls back to default timeout when env value is invalid", async () => {
    process.env.POSTHOG_PROXY_TIMEOUT_MS = "0";
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(AbortSignal.abort());

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("ok"));
    const request = createNextRequest("https://volume.fitness/ingest/e", {
      method: "GET",
    });

    await GET(request, {
      params: { path: ["e"] },
    });

    expect(timeoutSpy).toHaveBeenCalledWith(5_000);
  });

  it("returns 504 when upstream times out", async () => {
    const timeoutError = Object.assign(new Error("timed out"), {
      name: "TimeoutError",
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(timeoutError);

    const request = createNextRequest("https://volume.fitness/ingest/e", {
      method: "GET",
    });

    const response = await GET(request, {
      params: { path: ["e"] },
    });

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: "PostHog ingest proxy timed out",
    });
  });

  it("returns 502 when upstream fetch throws non-timeout errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("boom"));

    const request = createNextRequest("https://volume.fitness/ingest/e", {
      method: "GET",
    });

    const response = await GET(request, {
      params: { path: ["e"] },
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "PostHog ingest proxy failed",
    });
  });
});
