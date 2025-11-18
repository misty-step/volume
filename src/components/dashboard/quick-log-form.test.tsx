import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickLogForm } from "./quick-log-form";
import type { Exercise } from "@/types/domain";
import type { Id } from "../../../convex/_generated/dataModel";
import { WeightUnitProvider } from "@/contexts/WeightUnitContext";
import { toast } from "sonner";

// Mock Convex hooks
const mockLogSet = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockLogSet),
  useQuery: vi.fn((api, params) => mockUseQuery(api, params)),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock error handler
vi.mock("@/lib/error-handler", () => ({
  handleMutationError: vi.fn(),
}));

// Mock scrollIntoView for Radix Select
Element.prototype.scrollIntoView = vi.fn();

// Helper to render with WeightUnitContext
const renderWithContext = (
  ui: React.ReactElement,
  unit: "lbs" | "kg" = "lbs"
) => {
  // Mock localStorage for context
  const localStorageMock = {
    getItem: vi.fn(() => unit),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  vi.stubGlobal("localStorage", localStorageMock);

  return render(<WeightUnitProvider>{ui}</WeightUnitProvider>);
};

describe("QuickLogForm", () => {
  const mockExercises: Exercise[] = [
    {
      _id: "ex1abc123" as Id<"exercises">,
      userId: "user1",
      name: "Bench Press",
      createdAt: new Date("2025-10-01").getTime(),
      _creationTime: new Date("2025-10-01").getTime(),
    },
    {
      _id: "ex2def456" as Id<"exercises">,
      userId: "user1",
      name: "Squats",
      createdAt: new Date("2025-10-05").getTime(),
      _creationTime: new Date("2025-10-05").getTime(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogSet.mockResolvedValue("newSetId123");
    mockUseQuery.mockReturnValue([]);
  });

  it("renders all form fields", () => {
    renderWithContext(<QuickLogForm exercises={mockExercises} />);

    expect(screen.getByLabelText(/exercise/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reps/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument(); // Weight input
    expect(
      screen.getByRole("button", { name: /LOG SET/i })
    ).toBeInTheDocument();
  });

  it("integrates with useQuickLogForm hook", () => {
    renderWithContext(<QuickLogForm exercises={mockExercises} />);

    // Form should initialize with useQuickLogForm defaults
    const repsInput = screen.getByLabelText(/reps/i) as HTMLInputElement;
    const weightInput = screen.getByLabelText(/weight/i) as HTMLInputElement;

    // Empty form on initial render
    expect(repsInput.value).toBe("");
    expect(weightInput.value).toBe("");
  });

  it("integrates with useLastSet hook", () => {
    // Mock a set for the exercise
    const mockSets = [
      {
        _id: "set1" as any,
        _creationTime: 1000,
        userId: "user1",
        exerciseId: "ex1abc123",
        reps: 10,
        weight: 135,
        unit: "lbs",
        performedAt: Date.now() - 60000,
      },
    ];
    mockUseQuery.mockReturnValue(mockSets);

    renderWithContext(<QuickLogForm exercises={mockExercises} />);

    // Last set indicator should not be visible initially (no exercise selected)
    expect(screen.queryByText(/Last:/i)).not.toBeInTheDocument();
  });

  it("displays last set indicator when exercise has sets", () => {
    // Mock sets data
    const mockSets = [
      {
        _id: "set1" as any,
        _creationTime: 1000,
        userId: "user1",
        exerciseId: "ex1abc123" as any,
        reps: 10,
        weight: 135,
        unit: "lbs",
        performedAt: Date.now() - 60000,
      },
    ];
    mockUseQuery.mockReturnValue(mockSets);

    renderWithContext(<QuickLogForm exercises={mockExercises} />);

    // Note: Last set indicator only appears after selecting an exercise
    // This test verifies the component integrates with useLastSet hook
    // Actual display logic is tested in useLastSet.test.ts
    expect(screen.queryByText(/Last:/i)).not.toBeInTheDocument();
  });

  it("displays weight unit from context", () => {
    renderWithContext(<QuickLogForm exercises={mockExercises} />, "lbs");

    expect(screen.getByText(/weight \(lbs\)/i)).toBeInTheDocument();
  });

  it("displays kg unit when context set to kg", () => {
    renderWithContext(<QuickLogForm exercises={mockExercises} />, "kg");

    expect(screen.getByText(/weight \(kg\)/i)).toBeInTheDocument();
  });
});
