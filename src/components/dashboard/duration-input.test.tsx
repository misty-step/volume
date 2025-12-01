/**
 * DurationInput Component Tests
 *
 * Tests the MM:SS composite input component for duration logging.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DurationInput } from "./duration-input";

describe("DurationInput", () => {
  const mockOnChange = vi.fn();
  const mockOnEnter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders minutes and seconds inputs", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      expect(screen.getByTestId("duration-minutes")).toBeInTheDocument();
      expect(screen.getByTestId("duration-seconds")).toBeInTheDocument();
    });

    it("renders with placeholder values when no value provided", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      const minutesInput = screen.getByTestId("duration-minutes");
      const secondsInput = screen.getByTestId("duration-seconds");

      expect(minutesInput).toHaveAttribute("placeholder", "MM");
      expect(secondsInput).toHaveAttribute("placeholder", "SS");
      expect(minutesInput).toHaveValue(null);
      expect(secondsInput).toHaveValue(null);
    });

    it("renders with disabled state", () => {
      render(
        <DurationInput
          onChange={mockOnChange}
          disabled
          data-testid="duration"
        />
      );

      expect(screen.getByTestId("duration-minutes")).toBeDisabled();
      expect(screen.getByTestId("duration-seconds")).toBeDisabled();
    });

    it("applies custom className", () => {
      render(
        <DurationInput
          onChange={mockOnChange}
          className="custom-class"
          data-testid="duration"
        />
      );

      expect(screen.getByTestId("duration")).toHaveClass("custom-class");
    });
  });

  describe("controlled value", () => {
    it("displays minutes and seconds from total seconds value", () => {
      render(
        <DurationInput
          value={125}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      // 125 seconds = 2 minutes, 5 seconds
      expect(screen.getByTestId("duration-minutes")).toHaveValue(2);
      expect(screen.getByTestId("duration-seconds")).toHaveValue(5);
    });

    it("displays only seconds when less than 60", () => {
      render(
        <DurationInput
          value={45}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      // 45 seconds = 0 minutes, 45 seconds (minutes empty)
      expect(screen.getByTestId("duration-minutes")).toHaveValue(null);
      expect(screen.getByTestId("duration-seconds")).toHaveValue(45);
    });

    it("displays only minutes when seconds are 0", () => {
      render(
        <DurationInput
          value={120}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      // 120 seconds = 2 minutes, 0 seconds (seconds empty)
      expect(screen.getByTestId("duration-minutes")).toHaveValue(2);
      expect(screen.getByTestId("duration-seconds")).toHaveValue(null);
    });

    it("clears inputs when value is undefined", () => {
      const { rerender } = render(
        <DurationInput
          value={125}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      expect(screen.getByTestId("duration-minutes")).toHaveValue(2);

      rerender(
        <DurationInput
          value={undefined}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      expect(screen.getByTestId("duration-minutes")).toHaveValue(null);
      expect(screen.getByTestId("duration-seconds")).toHaveValue(null);
    });

    it("handles NaN value as undefined", () => {
      render(
        <DurationInput
          value={NaN}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      expect(screen.getByTestId("duration-minutes")).toHaveValue(null);
      expect(screen.getByTestId("duration-seconds")).toHaveValue(null);
    });
  });

  describe("minutes input", () => {
    it("emits total seconds when minutes change", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      fireEvent.change(screen.getByTestId("duration-minutes"), {
        target: { value: "5" },
      });

      expect(mockOnChange).toHaveBeenCalledWith(300); // 5 * 60
    });

    it("handles empty minutes input", () => {
      render(
        <DurationInput
          value={120}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      fireEvent.change(screen.getByTestId("duration-minutes"), {
        target: { value: "" },
      });

      expect(mockOnChange).toHaveBeenCalledWith(undefined); // 0 minutes, 0 seconds
    });

    it("combines minutes with existing seconds", () => {
      render(
        <DurationInput
          value={30}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      fireEvent.change(screen.getByTestId("duration-minutes"), {
        target: { value: "2" },
      });

      expect(mockOnChange).toHaveBeenCalledWith(150); // 2*60 + 30
    });
  });

  describe("seconds input", () => {
    it("emits total seconds when seconds change", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      fireEvent.change(screen.getByTestId("duration-seconds"), {
        target: { value: "45" },
      });

      expect(mockOnChange).toHaveBeenCalledWith(45);
    });

    it("clamps seconds to max 59", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      fireEvent.change(screen.getByTestId("duration-seconds"), {
        target: { value: "75" },
      });

      expect(mockOnChange).toHaveBeenCalledWith(59);
    });

    it("handles empty seconds input", () => {
      render(
        <DurationInput
          value={45}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      fireEvent.change(screen.getByTestId("duration-seconds"), {
        target: { value: "" },
      });

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it("combines seconds with existing minutes", () => {
      render(
        <DurationInput
          value={120}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      fireEvent.change(screen.getByTestId("duration-seconds"), {
        target: { value: "30" },
      });

      expect(mockOnChange).toHaveBeenCalledWith(150); // 2*60 + 30
    });
  });

  describe("keyboard navigation", () => {
    it("Enter on minutes focuses seconds", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      const minutesInput = screen.getByTestId("duration-minutes");
      const secondsInput = screen.getByTestId("duration-seconds");

      minutesInput.focus();
      fireEvent.keyDown(minutesInput, { key: "Enter" });

      expect(document.activeElement).toBe(secondsInput);
    });

    it("Enter on seconds calls onEnter callback", () => {
      render(
        <DurationInput
          onChange={mockOnChange}
          onEnter={mockOnEnter}
          data-testid="duration"
        />
      );

      const secondsInput = screen.getByTestId("duration-seconds");
      fireEvent.keyDown(secondsInput, { key: "Enter" });

      expect(mockOnEnter).toHaveBeenCalledTimes(1);
    });

    it("Enter on seconds does nothing without onEnter callback", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      const secondsInput = screen.getByTestId("duration-seconds");

      // Should not throw
      expect(() => {
        fireEvent.keyDown(secondsInput, { key: "Enter" });
      }).not.toThrow();
    });

    it("other keys do not trigger special behavior", () => {
      render(
        <DurationInput
          onChange={mockOnChange}
          onEnter={mockOnEnter}
          data-testid="duration"
        />
      );

      const minutesInput = screen.getByTestId("duration-minutes");
      fireEvent.keyDown(minutesInput, { key: "Tab" });

      // onEnter should not be called
      expect(mockOnEnter).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles zero value", () => {
      render(
        <DurationInput
          value={0}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      // 0 should show empty inputs
      expect(screen.getByTestId("duration-minutes")).toHaveValue(null);
      expect(screen.getByTestId("duration-seconds")).toHaveValue(null);
    });

    it("handles large minutes value", () => {
      render(
        <DurationInput
          value={3600}
          onChange={mockOnChange}
          data-testid="duration"
        />
      );

      // 3600 seconds = 60 minutes
      expect(screen.getByTestId("duration-minutes")).toHaveValue(60);
    });

    it("combines changed minutes and seconds correctly", () => {
      render(<DurationInput onChange={mockOnChange} data-testid="duration" />);

      // Enter 3 minutes
      fireEvent.change(screen.getByTestId("duration-minutes"), {
        target: { value: "3" },
      });
      expect(mockOnChange).toHaveBeenLastCalledWith(180);

      // Now add 45 seconds
      fireEvent.change(screen.getByTestId("duration-seconds"), {
        target: { value: "45" },
      });
      expect(mockOnChange).toHaveBeenLastCalledWith(225); // 3*60 + 45
    });
  });
});
