import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: ReactNode }) => (
    <div data-testid="chart">{children}</div>
  );

  const MockElement = () => <div data-testid="rechart-element" />;

  return {
    ResponsiveContainer: MockContainer,
    LineChart: MockContainer,
    Line: MockElement,
    XAxis: MockElement,
    YAxis: MockElement,
    CartesianGrid: MockElement,
    Tooltip: MockElement,
    Legend: MockElement,
  };
});

import { useQuery } from "convex/react";
import { ProgressiveOverloadWidget } from "./progressive-overload-widget";

const mockUseQuery = useQuery as unknown as Mock;

describe("<ProgressiveOverloadWidget />", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("filters out exercises without rep data", () => {
    mockUseQuery.mockReturnValue([
      {
        exerciseId: "duration-only",
        exerciseName: "Plank",
        dataPoints: [],
        trend: "plateau",
      },
      {
        exerciseId: "rep-based",
        exerciseName: "Bench Press",
        dataPoints: [
          {
            date: "2024-01-01",
            maxWeight: 135,
            maxReps: 8,
            volume: 1080,
          },
        ],
        trend: "improving",
      },
    ]);

    render(<ProgressiveOverloadWidget />);

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.queryByText("Plank")).not.toBeInTheDocument();
  });

  it("shows fallback message when only duration data exists", () => {
    mockUseQuery.mockReturnValue([
      {
        exerciseId: "duration-only",
        exerciseName: "Wall Sit",
        dataPoints: [],
        trend: "plateau",
      },
    ]);

    render(<ProgressiveOverloadWidget />);

    expect(
      screen.getByText(
        "Log at least one rep-based workout to unlock progression trends."
      )
    ).toBeInTheDocument();
  });
});
