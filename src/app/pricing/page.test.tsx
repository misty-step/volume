import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParamGet = vi.fn();
const mockFetch = vi.fn();
const mockReportError = vi.fn();
const mockAssign = vi.fn();
const originalLocation = window.location;

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockSearchParamGet,
  }),
}));

vi.mock("@/lib/analytics", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

describe("PricingContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        assign: mockAssign,
      },
    });
    mockSearchParamGet.mockReturnValue(null);
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user_123" },
      isLoaded: true,
    } as ReturnType<typeof useUser>);
    vi.mocked(useQuery).mockReturnValue({
      hasAccess: false,
      status: "expired",
    });
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID = "price_monthly_test";
    process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID = "price_annual_test";
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllGlobals();
  });

  it("redirects authenticated users to Stripe checkout when subscribe is clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://checkout.stripe.com/c/pay/cs_test_mock_checkout",
      }),
    });

    vi.resetModules();
    const { PricingContent } = await import("./page");

    render(<PricingContent />);

    const cta = await screen.findByRole("button", { name: /subscribe now/i });
    await userEvent.click(cta);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: "price_annual_test" }),
      });
    });
    expect(mockAssign).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_test_mock_checkout"
    );
  });

  it("shows an error and reports when checkout returns a non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "bad" }),
    });

    vi.resetModules();
    const { PricingContent } = await import("./page");

    render(<PricingContent />);

    await userEvent.click(
      await screen.findByRole("button", { name: /subscribe now/i })
    );

    expect(
      await screen.findByText("Something went wrong. Please try again.")
    ).toBeInTheDocument();
    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("shows an error when checkout succeeds without a redirect url", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    vi.resetModules();
    const { PricingContent } = await import("./page");

    render(<PricingContent />);

    await userEvent.click(
      await screen.findByRole("button", { name: /subscribe now/i })
    );

    expect(
      await screen.findByText("Something went wrong. Please try again.")
    ).toBeInTheDocument();
    expect(mockReportError).not.toHaveBeenCalled();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("shows a connection error and reports when checkout throws", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    vi.resetModules();
    const { PricingContent } = await import("./page");

    render(<PricingContent />);

    await userEvent.click(
      await screen.findByRole("button", { name: /subscribe now/i })
    );

    expect(
      await screen.findByText(
        "Connection error. Please check your internet and try again."
      )
    ).toBeInTheDocument();
    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockAssign).not.toHaveBeenCalled();
  });
});
