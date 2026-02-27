import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { showPRCelebration } from "./pr-celebration";
import { type PRResult } from "@/lib/pr-detection";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("showPRCelebration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows toast for weight PR", () => {
    const prResult: PRResult = {
      type: "weight",
      currentValue: 315,
      previousValue: 300,
    };

    showPRCelebration("Squats", prResult, "lbs");

    expect(toast.success).toHaveBeenCalledWith(
      "🎉 NEW PR! Squats",
      expect.objectContaining({
        description: "315 lbs (previous: 300 lbs)",
        duration: 5000,
        icon: "🏆",
      })
    );
  });

  it("shows toast for volume PR", () => {
    const prResult: PRResult = {
      type: "volume",
      currentValue: 3780,
      previousValue: 3150,
    };

    showPRCelebration("Bench Press", prResult, "lbs");

    expect(toast.success).toHaveBeenCalledWith(
      "🎉 NEW PR! Bench Press",
      expect.objectContaining({
        description: "3780 lbs total volume (previous: 3150 lbs)",
        duration: 5000,
        icon: "🏆",
      })
    );
  });

  it("shows toast for reps PR", () => {
    const prResult: PRResult = {
      type: "reps",
      currentValue: 15,
      previousValue: 12,
    };

    showPRCelebration("Pull-ups", prResult);

    expect(toast.success).toHaveBeenCalledWith(
      "🎉 NEW PR! Pull-ups",
      expect.objectContaining({
        description: "15 reps (previous: 12 reps)",
        duration: 5000,
        icon: "🏆",
      })
    );
  });

  it("defaults to lbs unit when not specified", () => {
    const prResult: PRResult = {
      type: "weight",
      currentValue: 225,
      previousValue: 205,
    };

    showPRCelebration("Deadlift", prResult);

    expect(toast.success).toHaveBeenCalledWith(
      "🎉 NEW PR! Deadlift",
      expect.objectContaining({
        description: "225 lbs (previous: 205 lbs)",
      })
    );
  });

  it("handles kg unit", () => {
    const prResult: PRResult = {
      type: "weight",
      currentValue: 140,
      previousValue: 130,
    };

    showPRCelebration("Squats", prResult, "kg");

    expect(toast.success).toHaveBeenCalledWith(
      "🎉 NEW PR! Squats",
      expect.objectContaining({
        description: "140 kg (previous: 130 kg)",
      })
    );
  });

  it("shows first-time PR with previous value of 0", () => {
    const prResult: PRResult = {
      type: "weight",
      currentValue: 135,
      previousValue: 0,
    };

    showPRCelebration("Overhead Press", prResult, "lbs");

    expect(toast.success).toHaveBeenCalledWith(
      "🎉 NEW PR! Overhead Press",
      expect.objectContaining({
        description: "135 lbs (previous: 0 lbs)",
        duration: 5000,
        icon: "🏆",
      })
    );
  });
});
