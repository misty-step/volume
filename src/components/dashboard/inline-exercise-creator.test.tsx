/**
 * InlineExerciseCreator Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InlineExerciseCreator } from "./inline-exercise-creator";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/error-handler";

// Mock Convex
vi.mock("convex/react", () => ({
  useAction: vi.fn(),
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

// Get the mocked useAction
import { useAction } from "convex/react";
const mockUseAction = vi.mocked(useAction);

describe("InlineExerciseCreator", () => {
  const mockOnCreated = vi.fn();
  const mockOnCancel = vi.fn();
  const mockCreateExercise = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAction.mockReturnValue(mockCreateExercise);
    mockCreateExercise.mockResolvedValue("ex-new-123" as Id<"exercises">);
  });

  describe("rendering", () => {
    it("renders the form with input and buttons", () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByTestId("create-exercise-name-input")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("create-exercise-submit-btn")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("create-exercise-cancel-btn")
      ).toBeInTheDocument();
    });

    it("displays placeholder text", () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByPlaceholderText("e.g. Planks")).toBeInTheDocument();
    });

    it("focuses input on mount", async () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("create-exercise-name-input")).toHaveFocus();
      });
    });
  });

  describe("form submission - success", () => {
    it("creates exercise with trimmed name", async () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByTestId("create-exercise-name-input"), {
        target: { value: "  Bench Press  " },
      });
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      await waitFor(() => {
        expect(mockCreateExercise).toHaveBeenCalledWith({
          name: "Bench Press",
        });
      });
    });

    it("shows success toast after creation", async () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByTestId("create-exercise-name-input"), {
        target: { value: "Squats" },
      });
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Exercise created");
      });
    });

    it("calls onCreated with new exercise ID", async () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByTestId("create-exercise-name-input"), {
        target: { value: "Deadlift" },
      });
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      await waitFor(() => {
        expect(mockOnCreated).toHaveBeenCalledWith("ex-new-123");
      });
    });

    it("resets form after successful creation", async () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByTestId("create-exercise-name-input");
      fireEvent.change(input, { target: { value: "Pull-ups" } });
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      await waitFor(() => {
        expect(mockOnCreated).toHaveBeenCalled();
      });

      // Input should be cleared after successful creation
      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });
  });

  describe("form submission - failure", () => {
    it("calls handleMutationError on failure", async () => {
      const error = new Error("Network error");
      mockCreateExercise.mockRejectedValueOnce(error);

      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByTestId("create-exercise-name-input"), {
        target: { value: "Rowing" },
      });
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      await waitFor(() => {
        expect(handleMutationError).toHaveBeenCalledWith(
          error,
          "Create Exercise"
        );
      });
    });

    it("does not call onCreated on failure", async () => {
      mockCreateExercise.mockRejectedValueOnce(new Error("Failed"));

      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByTestId("create-exercise-name-input"), {
        target: { value: "Lunges" },
      });
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      await waitFor(() => {
        expect(handleMutationError).toHaveBeenCalled();
      });

      expect(mockOnCreated).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("requires name to be provided", async () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      // Submit empty form
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });

      expect(mockCreateExercise).not.toHaveBeenCalled();
    });
  });

  describe("keyboard navigation", () => {
    it("calls onCancel when Escape is pressed", () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.keyDown(screen.getByTestId("create-exercise-name-input"), {
        key: "Escape",
      });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("does not call onCancel for other keys", () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.keyDown(screen.getByTestId("create-exercise-name-input"), {
        key: "Tab",
      });

      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe("cancel button", () => {
    it("calls onCancel when clicked", () => {
      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByTestId("create-exercise-cancel-btn"));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("loading state", () => {
    it("disables inputs while submitting", async () => {
      // Create a promise we can control
      let resolveCreate: (value: Id<"exercises">) => void;
      mockCreateExercise.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          })
      );

      render(
        <InlineExerciseCreator
          onCreated={mockOnCreated}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.change(screen.getByTestId("create-exercise-name-input"), {
        target: { value: "Curls" },
      });
      fireEvent.click(screen.getByTestId("create-exercise-submit-btn"));

      // Elements should be disabled during submission
      await waitFor(() => {
        expect(screen.getByTestId("create-exercise-name-input")).toBeDisabled();
        expect(screen.getByTestId("create-exercise-submit-btn")).toBeDisabled();
        expect(screen.getByTestId("create-exercise-cancel-btn")).toBeDisabled();
      });

      // Button text should change to show AI analysis in progress
      expect(
        screen.getByTestId("create-exercise-submit-btn")
      ).toHaveTextContent("Analyzing...");

      // Resolve the promise
      resolveCreate!("ex-123" as Id<"exercises">);

      // Elements should be enabled after completion
      await waitFor(() => {
        expect(
          screen.getByTestId("create-exercise-name-input")
        ).not.toBeDisabled();
      });
    });
  });
});
