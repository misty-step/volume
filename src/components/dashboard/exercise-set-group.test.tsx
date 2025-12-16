import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExerciseSetGroup } from "./exercise-set-group";
import type { Exercise, Set as WorkoutSet } from "@/types/domain";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/error-handler";
import { computeExerciseMetrics } from "@/lib/exercise-metrics";

// Mock Framer Motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<{
      className?: string;
      "data-testid"?: string;
    }>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
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

// Mock useExerciseCardData hook
vi.mock("@/hooks/useExerciseCardData", () => ({
  useExerciseCardData: () => ({
    isLoading: false,
    sessionDelta: null,
    hasPR: false,
    sparklineData: [],
    trendDirection: "flat" as const,
    enrichedSets: [],
    previousSession: null,
    sessions: [],
  }),
}));

describe("ExerciseSetGroup", () => {
  const mockOnRepeat = vi.fn();
  const mockOnDelete = vi.fn();

  const mockExercise: Exercise = {
    _id: "ex1abc123" as Id<"exercises">,
    userId: "user1",
    name: "Bench Press",
    createdAt: Date.now() - 86400000,
    _creationTime: Date.now() - 86400000,
  };

  const mockSet: WorkoutSet = {
    _id: "set1xyz789" as Id<"sets">,
    _creationTime: Date.now() - 3600000,
    userId: "user1",
    exerciseId: "ex1abc123" as Id<"exercises">,
    reps: 10,
    weight: 135,
    unit: "lbs",
    performedAt: Date.now() - 3600000,
  };

  const defaultProps = {
    exercise: mockExercise,
    sets: [mockSet],
    metrics: computeExerciseMetrics([mockSet], "lbs"),
    preferredUnit: "lbs" as const,
    onRepeat: mockOnRepeat,
    onDelete: mockOnDelete,
    showRepeat: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders exercise name and summary stats", () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      expect(screen.getByText("Bench Press")).toBeInTheDocument();
      expect(screen.getByText("1 SET")).toBeInTheDocument();
    });

    it("renders set details when expanded", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      // Click to expand
      fireEvent.click(screen.getByText("Bench Press"));

      // Set details should now be visible
      await waitFor(() => {
        expect(screen.getByTestId("set-reps-value")).toHaveTextContent("10");
        expect(screen.getByTestId("set-weight-value")).toHaveTextContent("135");
      });
    });

    it("shows delete button for each set when expanded", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
    });

    it("shows TIME summary for duration-based groups", () => {
      const durationSet: WorkoutSet = {
        ...mockSet,
        _id: "setDuration" as Id<"sets">,
        reps: undefined,
        weight: undefined,
        duration: 90,
        performedAt: Date.now(),
      };

      const sets = [durationSet];
      render(
        <ExerciseSetGroup
          {...defaultProps}
          sets={sets}
          metrics={computeExerciseMetrics(sets, "lbs")}
        />
      );

      expect(screen.getByText("TIME")).toBeInTheDocument();
      expect(screen.getByText("1:30")).toBeInTheDocument();
    });

    it("shows both reps and time for mixed groups without volume", () => {
      const repsSet: WorkoutSet = {
        ...mockSet,
        _id: "setRepsOnly" as Id<"sets">,
        weight: undefined,
        performedAt: Date.now() - 1000,
      };
      const durationSet: WorkoutSet = {
        ...mockSet,
        _id: "setDurationOnly" as Id<"sets">,
        reps: undefined,
        weight: undefined,
        duration: 45,
        performedAt: Date.now(),
      };

      const sets = [repsSet, durationSet];
      render(
        <ExerciseSetGroup
          {...defaultProps}
          sets={sets}
          metrics={computeExerciseMetrics(sets, "lbs")}
        />
      );

      expect(screen.getByText("REPS")).toBeInTheDocument();
      expect(screen.getByText("TIME")).toBeInTheDocument();
    });
  });

  describe("delete success path", () => {
    it("calls onDelete with correct set id when confirmed", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      // Expand the group
      fireEvent.click(screen.getByText("Bench Press"));

      // Click delete button
      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });

      // Confirm deletion
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(mockSet._id);
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
      });
    });

    it("shows success toast after delete resolves", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Set deleted");
        expect(toast.success).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call handleMutationError on success", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled();
      });

      expect(handleMutationError).not.toHaveBeenCalled();
    });

    it("closes dialog after successful delete", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      // Dialog is open
      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(screen.queryByText("Delete set?")).not.toBeInTheDocument();
      });
    });
  });

  describe("delete failure path", () => {
    it("calls handleMutationError with error and context on failure", async () => {
      const deleteError = new Error("Network error");
      mockOnDelete.mockRejectedValueOnce(deleteError);

      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(handleMutationError).toHaveBeenCalledWith(
          deleteError,
          "Delete Set"
        );
        expect(handleMutationError).toHaveBeenCalledTimes(1);
      });
    });

    it("does not show success toast on failure", async () => {
      mockOnDelete.mockRejectedValueOnce(new Error("Delete failed"));

      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(handleMutationError).toHaveBeenCalled();
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it("re-enables delete button after failure", async () => {
      mockOnDelete.mockRejectedValueOnce(new Error("Delete failed"));

      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      const deleteBtn = screen.getByTestId(`delete-set-btn-${mockSet._id}`);

      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(handleMutationError).toHaveBeenCalled();
      });

      // After failure, deletingId is reset so button should be enabled again
      // (even though dialog might still be open for user to dismiss)
      await waitFor(() => {
        expect(deleteBtn).not.toBeDisabled();
      });
    });

    it("handles auth errors appropriately", async () => {
      const authError = new Error("Not authenticated");
      mockOnDelete.mockRejectedValueOnce(authError);

      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(handleMutationError).toHaveBeenCalledWith(
          authError,
          "Delete Set"
        );
      });
    });

    it("handles not-found errors appropriately", async () => {
      const notFoundError = new Error("Set not found");
      mockOnDelete.mockRejectedValueOnce(notFoundError);

      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(handleMutationError).toHaveBeenCalledWith(
          notFoundError,
          "Delete Set"
        );
      });
    });
  });

  describe("loading state", () => {
    it("disables delete button while delete is in flight", async () => {
      // Create a promise that we can control
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockOnDelete.mockReturnValueOnce(deletePromise);

      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      const deleteBtn = screen.getByTestId(`delete-set-btn-${mockSet._id}`);

      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      // Button should be disabled during flight
      await waitFor(() => {
        expect(deleteBtn).toBeDisabled();
      });

      // Resolve the delete
      resolveDelete!();

      // Button should be enabled again after resolution
      await waitFor(() => {
        expect(deleteBtn).not.toBeDisabled();
      });
    });

    it("disables repeat button while delete is in flight", async () => {
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockOnDelete.mockReturnValueOnce(deletePromise);

      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`repeat-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      const repeatBtn = screen.getByTestId(`repeat-set-btn-${mockSet._id}`);
      const deleteBtn = screen.getByTestId(`delete-set-btn-${mockSet._id}`);

      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      // Repeat button should be disabled during delete
      await waitFor(() => {
        expect(repeatBtn).toBeDisabled();
      });

      resolveDelete!();

      await waitFor(() => {
        expect(repeatBtn).not.toBeDisabled();
      });
    });
  });

  describe("dialog behavior", () => {
    it("can cancel delete via Cancel button", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      // Dialog is open
      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });

      // Cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText("Delete set?")).not.toBeInTheDocument();
      });

      // onDelete should not have been called
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it("shows warning that action cannot be undone", async () => {
      render(<ExerciseSetGroup {...defaultProps} />);

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${mockSet._id}`)
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId(`delete-set-btn-${mockSet._id}`));

      await waitFor(() => {
        expect(
          screen.getByText("This action cannot be undone.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("multiple sets", () => {
    it("allows deleting specific set from group", async () => {
      const secondSet: WorkoutSet = {
        ...mockSet,
        _id: "set2abc456" as Id<"sets">,
        reps: 8,
        weight: 145,
        performedAt: Date.now() - 1800000,
      };

      render(
        <ExerciseSetGroup
          {...defaultProps}
          sets={[mockSet, secondSet]}
          metrics={computeExerciseMetrics([mockSet, secondSet], "lbs")}
        />
      );

      fireEvent.click(screen.getByText("Bench Press"));

      await waitFor(() => {
        expect(
          screen.getByTestId(`delete-set-btn-${secondSet._id}`)
        ).toBeInTheDocument();
      });

      // Delete the second set specifically
      fireEvent.click(screen.getByTestId(`delete-set-btn-${secondSet._id}`));

      await waitFor(() => {
        expect(screen.getByText("Delete set?")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-delete-btn"));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(secondSet._id);
      });
    });
  });
});
