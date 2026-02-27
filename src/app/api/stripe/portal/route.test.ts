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
});
