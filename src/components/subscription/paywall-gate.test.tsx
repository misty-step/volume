import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { PaywallGate } from "./paywall-gate";

const mockReplace = vi.fn();
const mockUseQuery = vi.fn();
const mockUseConvexAuth = vi.fn();
const mockUseMutation = vi.fn();
const mockUseAction = vi.fn();
const mockGetOrCreateUser = vi.fn();
const mockSyncCheckout = vi.fn();
const mockSearchParamsGet = vi.fn();
const mockUseAuth = vi.fn();
const mockTrackEvent = vi.fn();
const mockReportError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useConvexAuth: () => mockUseConvexAuth(),
  useMutation: () => mockUseMutation(),
  useAction: () => mockUseAction(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

describe("PaywallGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockUseMutation.mockReturnValue(mockGetOrCreateUser);
    mockUseAction.mockReturnValue(mockSyncCheckout);
    mockGetOrCreateUser.mockResolvedValue("user_1");
    mockSyncCheckout.mockResolvedValue({ success: true });
    mockSearchParamsGet.mockReturnValue(null); // No checkout params by default
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      userId: "user_1",
    });
    mockUseConvexAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a loading state while subscription status loads", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), {});
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("waits for Convex auth readiness before interpreting subscription state", async () => {
    mockUseConvexAuth
      .mockReturnValueOnce({
        isLoading: true,
        isAuthenticated: false,
      })
      .mockReturnValueOnce({
        isLoading: false,
        isAuthenticated: true,
      });
    mockUseQuery.mockReturnValueOnce(undefined).mockReturnValueOnce(null);

    const { rerender } = render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    expect(mockUseQuery).toHaveBeenNthCalledWith(1, expect.anything(), "skip");
    expect(mockGetOrCreateUser).not.toHaveBeenCalled();

    rerender(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(mockUseQuery).toHaveBeenNthCalledWith(2, expect.anything(), {});
      expect(mockGetOrCreateUser).toHaveBeenCalledTimes(1);
    });
  });

  it("creates a user record when none exists", async () => {
    mockUseQuery.mockReturnValue(null);

    render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(mockGetOrCreateUser).toHaveBeenCalledTimes(1);
    });
  });

  it("shows recovery UI and reports telemetry when auth never becomes ready", async () => {
    vi.useFakeTimers();
    mockUseConvexAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });
    mockUseQuery.mockReturnValue(undefined);

    render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.getByTestId("paywall-bootstrap-error")).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't finish connecting to Volume.")
    ).toBeInTheDocument();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "Subscription Gate Bootstrap Delayed",
      expect.objectContaining({
        phase: "convex_auth",
        hasUserId: true,
        isAuthenticated: false,
      })
    );
    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: "PaywallGate",
        phase: "convex_auth",
      })
    );
  });

  it("shows recovery UI and reports telemetry when user bootstrap fails", async () => {
    const failure = new Error("Unauthorized: No valid authentication token.");
    mockUseQuery.mockReturnValue(null);
    mockGetOrCreateUser.mockRejectedValue(failure);

    render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't finish loading your account.")
      ).toBeInTheDocument();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "Subscription Gate User Bootstrap Failed",
      { error: failure.message }
    );
    expect(mockReportError).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({
        component: "PaywallGate",
        operation: "getOrCreateUser",
      })
    );
  });

  it("redirects when access is denied", async () => {
    mockUseQuery.mockReturnValue({ hasAccess: false, status: "expired" });

    render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/pricing?reason=expired");
    });
  });

  it("renders children when access is granted", () => {
    mockUseQuery.mockReturnValue({ hasAccess: true, status: "active" });

    render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
