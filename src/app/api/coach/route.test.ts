// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { E2E_SESSION_COOKIE_NAME } from "@/lib/e2e/test-session";

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

const getCoachRuntimeMock = vi.fn();
vi.mock("@/lib/coach/server/runtime", () => ({
  getCoachRuntime: () => getCoachRuntimeMock(),
}));

vi.mock("@/lib/coach/server/planner", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual };
});

const generateTextMock = vi.fn();
const streamTextMock = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
    streamText: (...args: unknown[]) => streamTextMock(...args),
  };
});

vi.mock("@json-render/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    pipeJsonRender: (stream: ReadableStream) => stream,
  };
});

function createConvexStub(options?: { rateLimitOk?: boolean }) {
  return {
    setAuth: vi.fn(),
    query: vi.fn(async () => []),
    mutation: vi.fn(async (_fn: unknown, args: unknown) => {
      if (args && typeof args === "object" && Object.keys(args).length === 0) {
        if (options?.rateLimitOk === false) {
          return {
            ok: false,
            limit: 10,
            remaining: 0,
            resetAt: Date.now() + 60_000,
            retryAfterMs: 1000,
          };
        }
        return {
          ok: true,
          limit: 10,
          remaining: 9,
          resetAt: Date.now() + 60_000,
        };
      }
      return null;
    }),
    action: vi.fn(async () => null),
  };
}

const ConvexHttpClientMock = vi.fn();
vi.mock("convex/browser", () => ({
  ConvexHttpClient: function (...args: any[]) {
    return ConvexHttpClientMock(...args);
  },
}));

function validBody() {
  return JSON.stringify({
    messages: [{ role: "user", content: "show today's summary" }],
    preferences: {
      unit: "lbs",
      soundEnabled: true,
      timezoneOffsetMinutes: 0,
    },
  });
}

describe("POST /api/coach", () => {
  it("returns 401 when userId is missing", async () => {
    authMock.mockResolvedValue({ userId: null, getToken: vi.fn() });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when token is null", async () => {
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue(null),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid request schema", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wrong: "shape" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("enforces per-user rate limits", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub({ rateLimitOk: false });
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("bypasses rate limits for authenticated E2E sessions", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    process.env.TEST_RESET_SECRET = "test-secret";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub({ rateLimitOk: false });
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${E2E_SESSION_COOKIE_NAME}=test-secret`,
        },
        body: validBody(),
      })
    );

    // E2E session bypasses rate limit; gets runtime-unavailable JSON instead of 429
    expect(response.status).toBe(200);
    expect(convex.mutation).not.toHaveBeenCalled();
  });

  it("returns JSON response when runtime is unavailable", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.assistantText).toBe("I can't process that request right now.");
    expect(json.trace.model).toBe("runtime-unavailable");
    expect(json.trace.fallbackUsed).toBe(false);
    expect(json.trace.toolsUsed).toEqual([]);
  });
});
