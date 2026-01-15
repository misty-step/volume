import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PaywallGate } from "./paywall-gate";

const mockReplace = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockGetOrCreateUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mockUseQuery(),
  useMutation: () => mockUseMutation(),
}));

describe("PaywallGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(mockGetOrCreateUser);
    mockGetOrCreateUser.mockResolvedValue("user_1");
  });

  it("shows a loading state while subscription status loads", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(
      <PaywallGate>
        <div>Protected Content</div>
      </PaywallGate>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
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
