// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const convexMutationMock = vi.fn();
const convexSetAuthMock = vi.fn();
const ConvexHttpClientMock = vi.fn(() => ({
  setAuth: convexSetAuthMock,
  mutation: convexMutationMock,
}));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: function (...args: unknown[]) {
    return ConvexHttpClientMock(...args);
  },
}));

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

function createRequest(secret: string) {
  return new NextRequest("https://volume.fitness/api/test/reset", {
    method: "POST",
    headers: {
      "X-TEST-SECRET": secret,
    },
  });
}

describe("POST /api/test/reset", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.TEST_RESET_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";

    convexMutationMock.mockReset();
    convexSetAuthMock.mockReset();
    ConvexHttpClientMock.mockClear();
    authMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 404 in production deployments", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
    expect(authMock).not.toHaveBeenCalled();
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("ignores NEXT_PUBLIC_VERCEL_ENV fallback for the server-side production guard", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
    expect(authMock).not.toHaveBeenCalled();
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("fails closed when TEST_RESET_SECRET is missing", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.TEST_RESET_SECRET;

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Invalid secret");
    expect(authMock).not.toHaveBeenCalled();
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("fails closed when TEST_RESET_SECRET is empty", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.TEST_RESET_SECRET = "";

    const { POST } = await import("./route");
    const response = await POST(createRequest(""));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Invalid secret");
    expect(authMock).not.toHaveBeenCalled();
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("allows preview deployments and executes reset", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("convex-token"),
    });
    convexMutationMock.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("User data reset");
    expect(authMock).toHaveBeenCalledTimes(1);
    expect(ConvexHttpClientMock).toHaveBeenCalledWith(
      "https://test.convex.cloud"
    );
    expect(convexSetAuthMock).toHaveBeenCalledWith("convex-token");
    expect(convexMutationMock).toHaveBeenCalledTimes(1);
    expect(convexMutationMock).toHaveBeenCalledWith(expect.anything(), {
      userId: "user_123",
    });
  });

  it("allows local development and executes reset", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("convex-token"),
    });
    convexMutationMock.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("User data reset");
    expect(convexMutationMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid secrets in preview deployments", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    const { POST } = await import("./route");
    const response = await POST(createRequest("wrong-secret"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Invalid secret");
    expect(authMock).not.toHaveBeenCalled();
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("returns 401 when no authenticated user is present", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    authMock.mockResolvedValue({
      userId: null,
      getToken: vi.fn(),
    });

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the Convex auth token is unavailable", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue(null),
    });

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("returns 500 when NEXT_PUBLIC_CONVEX_URL is missing", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.NEXT_PUBLIC_CONVEX_URL;

    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("convex-token"),
    });

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Missing NEXT_PUBLIC_CONVEX_URL");
    expect(ConvexHttpClientMock).not.toHaveBeenCalled();
  });

  it("returns 500 when reset mutation fails", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("convex-token"),
    });
    convexMutationMock.mockRejectedValue(new Error("mutation failed"));

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal Server Error");
  });
});
