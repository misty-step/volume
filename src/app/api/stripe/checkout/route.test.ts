import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to ensure mocks are available before module evaluation
const { mockStripeCreate, mockConvexQuery, mockSetAuth, mockAuth } = vi.hoisted(
  () => ({
    mockStripeCreate: vi.fn(),
    mockConvexQuery: vi.fn(),
    mockSetAuth: vi.fn(),
    mockAuth: vi.fn(),
  })
);

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

// Mock Stripe
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
      },
    },
  }),
}));

// Mock Convex HTTP client
vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    setAuth: mockSetAuth,
    query: mockConvexQuery,
  })),
}));

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  reportError: vi.fn(),
}));

// Import after mocks are set up
import { POST } from "./route";

describe("Stripe checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null, getToken: vi.fn() });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId: "price_123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when Convex token is not available", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue(null),
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId: "price_123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when priceId is missing", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token_123"),
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Price ID required");
  });

  it("creates subscription session without customer_creation for new users", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token_123"),
    });
    mockConvexQuery.mockResolvedValue(null); // No existing Stripe customer
    mockStripeCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_123",
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId: "price_monthly" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/session_123");

    // CRITICAL: Verify customer_creation is NOT set for subscription mode
    const createCall = mockStripeCreate.mock.calls[0][0];
    expect(createCall.mode).toBe("subscription");
    expect(createCall.customer_creation).toBeUndefined();
    expect(createCall.customer).toBeUndefined();
  });

  it("reuses existing Stripe customer when available", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token_123"),
    });
    mockConvexQuery.mockResolvedValue("cus_existing123"); // Existing customer
    mockStripeCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_456",
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId: "price_monthly" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/session_456");

    // Verify customer is reused
    const createCall = mockStripeCreate.mock.calls[0][0];
    expect(createCall.customer).toBe("cus_existing123");
    expect(createCall.customer_creation).toBeUndefined();
  });

  it("includes clerkUserId in session metadata", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_abc123",
      getToken: vi.fn().mockResolvedValue("token_123"),
    });
    mockConvexQuery.mockResolvedValue(null);
    mockStripeCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_789",
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId: "price_annual" }),
    });

    await POST(request);

    const createCall = mockStripeCreate.mock.calls[0][0];
    expect(createCall.metadata.clerkUserId).toBe("user_abc123");
    expect(createCall.subscription_data.metadata.clerkUserId).toBe(
      "user_abc123"
    );
  });

  it("returns 500 when Stripe API fails", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token_123"),
    });
    mockConvexQuery.mockResolvedValue(null);
    mockStripeCreate.mockRejectedValue(new Error("Stripe API error"));

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId: "price_monthly" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create checkout session");
  });

  it("handles invalid JSON body gracefully", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token_123"),
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });
});
