import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GhostSetDisplay } from "./ghost-set-display";
import * as useLastSetModule from "@/hooks/useLastSet";

// Mock the useLastSet hook
vi.mock("@/hooks/useLastSet", () => ({
  useLastSet: vi.fn(),
}));

describe("GhostSetDisplay", () => {
  it("renders nothing when no exerciseId provided", () => {
    vi.mocked(useLastSetModule.useLastSet).mockReturnValue({
      lastSet: null,
      formatTimeAgo: vi.fn(),
    });

    const { container } = render(<GhostSetDisplay exerciseId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no last set exists", () => {
    vi.mocked(useLastSetModule.useLastSet).mockReturnValue({
      lastSet: null,
      formatTimeAgo: vi.fn(),
    });

    const { container } = render(<GhostSetDisplay exerciseId="exercise123" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders last set with weight and reps", () => {
    const mockFormatTimeAgo = vi.fn(() => "2h ago");
    vi.mocked(useLastSetModule.useLastSet).mockReturnValue({
      lastSet: {
        _id: "set123" as any,
        _creationTime: 0,
        userId: "user123",
        exerciseId: "exercise123" as any,
        reps: 10,
        weight: 135,
        performedAt: Date.now() - 7200000, // 2 hours ago
      },
      formatTimeAgo: mockFormatTimeAgo,
    });

    render(<GhostSetDisplay exerciseId="exercise123" />);

    // Check for label
    expect(screen.getByText("Last Set")).toBeInTheDocument();

    // Check for weight
    expect(screen.getByText("135")).toBeInTheDocument();

    // Check for reps
    expect(screen.getByText("10")).toBeInTheDocument();

    // Check for time ago
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("renders last set with duration", () => {
    const mockFormatTimeAgo = vi.fn(() => "1d ago");
    vi.mocked(useLastSetModule.useLastSet).mockReturnValue({
      lastSet: {
        _id: "set123" as any,
        _creationTime: 0,
        userId: "user123",
        exerciseId: "exercise123" as any,
        duration: 90, // 1:30
        performedAt: Date.now() - 86400000, // 1 day ago
      },
      formatTimeAgo: mockFormatTimeAgo,
    });

    render(<GhostSetDisplay exerciseId="exercise123" />);

    // Check for duration formatted as MM:SS
    expect(screen.getByText("1:30")).toBeInTheDocument();

    // Check for time ago
    expect(screen.getByText("1d ago")).toBeInTheDocument();
  });

  it("renders reps without weight", () => {
    const mockFormatTimeAgo = vi.fn(() => "30m ago");
    vi.mocked(useLastSetModule.useLastSet).mockReturnValue({
      lastSet: {
        _id: "set123" as any,
        _creationTime: 0,
        userId: "user123",
        exerciseId: "exercise123" as any,
        reps: 15,
        performedAt: Date.now() - 1800000, // 30 minutes ago
      },
      formatTimeAgo: mockFormatTimeAgo,
    });

    render(<GhostSetDisplay exerciseId="exercise123" />);

    // Should show reps without weight
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.queryByText("×")).not.toBeInTheDocument();
  });
});
