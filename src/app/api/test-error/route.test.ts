import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  reportError: vi.fn(),
}));

describe("api/test-error route", () => {
  const originalVercel = process.env.VERCEL_ENV;
  const url = "http://localhost/api/test-error?type=report";

  beforeEach(() => {
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env.VERCEL_ENV = originalVercel;
  });

  it("returns 404 outside development", async () => {
    process.env.VERCEL_ENV = "production";
    const { GET } = await import("./route");
    const res = await GET(new Request(url));
    expect(res.status).toBe(404);
  });

  it("returns 200 for report in development", async () => {
    delete process.env.VERCEL_ENV;
    const { GET } = await import("./route");
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
  });
});
