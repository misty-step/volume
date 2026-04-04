// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

// Use vi.hoisted so mocks are available inside vi.mock factories
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  setAuth: vi.fn(),
  query: vi.fn(),
  create: vi.fn(),
  getToken: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    setAuth: mocks.setAuth,
    query: mocks.query,
  })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn().mockReturnValue({
    billingPortal: {
      sessions: {
        create: mocks.create,
      },
    },
  }),
}));

vi.mock("@/lib/analytics", () => ({
  reportError: mocks.reportError,
}));

// Mock logger (structured logging)
vi.mock("@/lib/logger", () => ({
  createChildLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    subscriptions: {
      getStripeCustomerId: "mock_getStripeCustomerId",
    },
  },
}));

import { POST } from "./route";

function makeRequest(): Request {
  return new Request("http://localhost/api/stripe/portal", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

describe("POST /api/stripe/portal", () => {
  it("no userId -> 401", async () => {
    mocks.auth.mockResolvedValue({ userId: null, getToken: mocks.getToken });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("getToken returns null -> 401", async () => {
    mocks.getToken.mockResolvedValue(null);
    mocks.auth.mockResolvedValue({ userId: "user1", getToken: mocks.getToken });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("no stripeCustomerId -> 400", async () => {
    mocks.getToken.mockResolvedValue("tok_123");
    mocks.auth.mockResolvedValue({ userId: "user1", getToken: mocks.getToken });
    mocks.query.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("missing NEXT_PUBLIC_CONVEX_URL -> 500", async () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    mocks.getToken.mockResolvedValue("tok_123");
    mocks.auth.mockResolvedValue({ userId: "user1", getToken: mocks.getToken });

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Missing NEXT_PUBLIC_CONVEX_URL",
    });
  });

  it("Stripe throws -> reportError called, status 500", async () => {
    mocks.getToken.mockResolvedValue("tok_123");
    mocks.auth.mockResolvedValue({ userId: "user1", getToken: mocks.getToken });
    mocks.query.mockResolvedValue("cus_123");
    mocks.create.mockRejectedValue(new Error("stripe down"));
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(mocks.reportError).toHaveBeenCalled();
  });

  it("happy path -> status 200, body has url", async () => {
    mocks.getToken.mockResolvedValue("tok_123");
    mocks.auth.mockResolvedValue({ userId: "user1", getToken: mocks.getToken });
    mocks.query.mockResolvedValue("cus_123");
    mocks.create.mockResolvedValue({
      url: "https://billing.stripe.com/session",
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(body.url).toBe("https://billing.stripe.com/session");
  });

  it("Convex query fails -> 500 with reportError", async () => {
    mocks.getToken.mockResolvedValue("tok_123");
    mocks.auth.mockResolvedValue({ userId: "user1", getToken: mocks.getToken });
    mocks.query.mockRejectedValue(new Error("Convex unavailable"));

    const res = await POST(makeRequest());
    const body = (await res.json()) as { error: string };
    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch user data");
    expect(mocks.reportError).toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
