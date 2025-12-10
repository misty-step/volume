import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock convex/react
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

// Mock react-body-highlighter
vi.mock("react-body-highlighter", () => ({
  default: ({
    type,
    onClick,
    data,
  }: {
    type: string;
    onClick?: (stats: {
      muscle: string;
      data: { exercises: string[]; frequency: number };
    }) => void;
    data: Array<{ name: string; muscles: string[]; frequency: number }>;
  }) => (
    <div data-testid="body-model" data-type={type}>
      {data.map((exercise) =>
        exercise.muscles.map((muscle) => (
          <button
            key={muscle}
            data-testid={`muscle-${muscle}`}
            onClick={() =>
              onClick?.({
                muscle,
                data: {
                  exercises: [exercise.name],
                  frequency: exercise.frequency,
                },
              })
            }
          >
            {muscle}
          </button>
        ))
      )}
    </div>
  ),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { useQuery } from "convex/react";
import { BodyMapWidget } from "./body-map-widget";

const mockUseQuery = useQuery as unknown as Mock;

const mockRecoveryData = [
  {
    muscleGroup: "Chest",
    lastTrainedDate: "2024-01-15",
    daysSince: 3,
    volumeLast7Days: 5000,
    frequencyLast7Days: 2,
    status: "ready" as const,
  },
  {
    muscleGroup: "Back",
    lastTrainedDate: "2024-01-14",
    daysSince: 1,
    volumeLast7Days: 8000,
    frequencyLast7Days: 3,
    status: "recovering" as const,
  },
  {
    muscleGroup: "Quads",
    lastTrainedDate: null,
    daysSince: 999,
    volumeLast7Days: 0,
    frequencyLast7Days: 0,
    status: "ready" as const,
  },
];

describe("<BodyMapWidget />", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  describe("smoke tests", () => {
    it("renders loading state when data is undefined", () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<BodyMapWidget />);

      expect(screen.getByText("Recovery Map")).toBeInTheDocument();
      // Loading skeleton should be present (animate-pulse class on container)
      const loadingElement = document.querySelector(".animate-pulse");
      expect(loadingElement).toBeInTheDocument();
    });

    it("renders loading state when isLoading prop is true", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget isLoading={true} />);

      const loadingElement = document.querySelector(".animate-pulse");
      expect(loadingElement).toBeInTheDocument();
    });

    it("renders empty state for new users with no workout data", () => {
      const emptyData = mockRecoveryData.map((d) => ({
        ...d,
        daysSince: 999,
        lastTrainedDate: null,
        volumeLast7Days: 0,
        frequencyLast7Days: 0,
      }));
      mockUseQuery.mockReturnValue(emptyData);

      render(<BodyMapWidget />);

      expect(
        screen.getByText("Start logging to see recovery")
      ).toBeInTheDocument();
      expect(screen.getByText("Log First Workout")).toBeInTheDocument();
    });

    it("renders body map with recovery data", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      expect(screen.getByText("Recovery Map")).toBeInTheDocument();
      expect(screen.getByTestId("body-model")).toBeInTheDocument();
    });
  });

  describe("view toggle", () => {
    it("defaults to anterior (front) view", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      const bodyModel = screen.getByTestId("body-model");
      expect(bodyModel).toHaveAttribute("data-type", "anterior");
    });

    it("switches to posterior (back) view when Back button clicked", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      // Use exact match for "Back" toggle button (not muscle buttons like "upper-back")
      const backButton = screen.getByRole("button", { name: /^back$/i });
      fireEvent.click(backButton);

      const bodyModel = screen.getByTestId("body-model");
      expect(bodyModel).toHaveAttribute("data-type", "posterior");
    });

    it("switches back to anterior view when Front button clicked", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      // First switch to back (exact match)
      const backButton = screen.getByRole("button", { name: /^back$/i });
      fireEvent.click(backButton);

      // Then switch to front
      const frontButton = screen.getByRole("button", { name: /front/i });
      fireEvent.click(frontButton);

      const bodyModel = screen.getByTestId("body-model");
      expect(bodyModel).toHaveAttribute("data-type", "anterior");
    });
  });

  describe("muscle click interaction", () => {
    it("opens popover with muscle details when muscle is clicked", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      // Click on chest muscle
      const chestMuscle = screen.getByTestId("muscle-chest");
      fireEvent.click(chestMuscle);

      // Should show muscle name in popover
      expect(screen.getByText("Chest")).toBeInTheDocument();
      // Should show ready status
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("shows Train Now button for ready muscles", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      const chestMuscle = screen.getByTestId("muscle-chest");
      fireEvent.click(chestMuscle);

      expect(
        screen.getByRole("link", { name: /train now/i })
      ).toBeInTheDocument();
    });

    it("shows never trained state for muscles with daysSince 999", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      // Click on quads (never trained in mock data)
      const quadsMuscle = screen.getByTestId("muscle-quadriceps");
      fireEvent.click(quadsMuscle);

      expect(screen.getByText("Never trained")).toBeInTheDocument();
    });
  });

  describe("legend", () => {
    it("renders all three status colors in legend", () => {
      mockUseQuery.mockReturnValue(mockRecoveryData);

      render(<BodyMapWidget />);

      expect(screen.getByText("Recovering (0-2d)")).toBeInTheDocument();
      expect(screen.getByText("Ready (3-7d)")).toBeInTheDocument();
      expect(screen.getByText("Overdue (8+d)")).toBeInTheDocument();
    });
  });
});
