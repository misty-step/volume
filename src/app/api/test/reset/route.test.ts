// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMutationMock = vi.fn();
vi.mock("convex/nextjs", () => ({
  fetchMutation: (...args: unknown[]) => fetchMutationMock(...args),
}));

const currentUserMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: () => currentUserMock(),
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

    fetchMutationMock.mockReset();
    currentUserMock.mockReset();
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
    expect(currentUserMock).not.toHaveBeenCalled();
    expect(fetchMutationMock).not.toHaveBeenCalled();
  });

  it("ignores NEXT_PUBLIC_VERCEL_ENV fallback for the server-side production guard", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
    expect(currentUserMock).not.toHaveBeenCalled();
    expect(fetchMutationMock).not.toHaveBeenCalled();
  });

  it("allows preview deployments and executes reset", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    currentUserMock.mockResolvedValue({ id: "user_123" });
    fetchMutationMock.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("User data reset");
    expect(currentUserMock).toHaveBeenCalledTimes(1);
    expect(fetchMutationMock).toHaveBeenCalledTimes(1);
    expect(fetchMutationMock).toHaveBeenCalledWith(expect.anything(), {
      userId: "user_123",
      secret: "test-secret",
    });
  });

  it("allows local development and executes reset", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    currentUserMock.mockResolvedValue({ id: "user_123" });
    fetchMutationMock.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("User data reset");
    expect(fetchMutationMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid secrets in preview deployments", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    const { POST } = await import("./route");
    const response = await POST(createRequest("wrong-secret"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Invalid secret");
    expect(currentUserMock).not.toHaveBeenCalled();
    expect(fetchMutationMock).not.toHaveBeenCalled();
  });

  it("returns 401 when no authenticated user is present", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    currentUserMock.mockResolvedValue(null);

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(fetchMutationMock).not.toHaveBeenCalled();
  });

  it("returns 500 when reset mutation fails", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";

    currentUserMock.mockResolvedValue({ id: "user_123" });
    fetchMutationMock.mockRejectedValue(new Error("mutation failed"));

    const { POST } = await import("./route");
    const response = await POST(createRequest("test-secret"));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal Server Error");
  });
});
