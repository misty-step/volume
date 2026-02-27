import { describe, it, expect } from "vitest";
import { checkForPR, formatPRMessage, type PRResult } from "./pr-detection";
import { type Set } from "@/types/domain";
import { type Id } from "../../convex/_generated/dataModel";

// Helper to create test sets
const createSet = (
  reps: number,
  weight?: number,
  performedAt: number = Date.now()
): Set => ({
  _id: "test-id" as Id<"sets">,
  exerciseId: "exercise-1" as Id<"exercises">,
  reps,
  weight,
  performedAt,
});

describe("checkForPR", () => {
  describe("first set (no previous sets)", () => {
    it("returns weight PR for first weighted set", () => {
      const currentSet = createSet(10, 100);
      const result = checkForPR(currentSet, []);

      expect(result).toEqual({
        type: "weight",
        currentValue: 100,
        previousValue: 0,
      });
    });

    it("returns reps PR for first bodyweight set", () => {
      const currentSet = createSet(20); // No weight = bodyweight
      const result = checkForPR(currentSet, []);

      expect(result).toEqual({
        type: "reps",
        currentValue: 20,
        previousValue: 0,
      });
    });
  });

  describe("weight PRs", () => {
    it("detects new max weight", () => {
      const currentSet = createSet(5, 315);
      const previousSets = [
        createSet(5, 300),
        createSet(8, 275),
        createSet(10, 250),
      ];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toEqual({
        type: "weight",
        currentValue: 315,
        previousValue: 300,
      });
    });

    it("does not trigger weight PR if not exceeded", () => {
      const currentSet = createSet(8, 300);
      const previousSets = [createSet(5, 315)];

      const result = checkForPR(currentSet, previousSets);

      expect(result).not.toEqual(expect.objectContaining({ type: "weight" }));
    });
  });

  describe("reps PRs", () => {
    it("detects new max reps", () => {
      const currentSet = createSet(15, 185); // 2775 volume
      const previousSets = [
        createSet(10, 185), // 1850 volume
        createSet(8, 200), // 1600 volume
        createSet(12, 185), // 2220 volume
      ];

      const result = checkForPR(currentSet, previousSets);

      // This is actually a volume PR (2775 > 2220), not reps
      // Volume takes priority over reps
      expect(result).toEqual({
        type: "volume",
        currentValue: 2775,
        previousValue: 2220,
      });
    });

    it("detects bodyweight reps PR", () => {
      const currentSet = createSet(25); // Pull-ups
      const previousSets = [createSet(20), createSet(18), createSet(22)];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toEqual({
        type: "reps",
        currentValue: 25,
        previousValue: 22,
      });
    });
  });

  describe("volume PRs", () => {
    it("detects new max volume (weight × reps)", () => {
      const currentSet = createSet(12, 225); // 2700 volume
      const previousSets = [
        createSet(10, 225), // 2250 volume
        createSet(15, 185), // 2775 volume
        createSet(8, 275), // 2200 volume
      ];

      const result = checkForPR(currentSet, previousSets);

      // Volume PR: 2700 is NOT greater than 2775, so no PR
      expect(result).toBeNull();
    });

    it("triggers volume PR when appropriate", () => {
      const currentSet = createSet(15, 200); // 3000 volume
      const previousSets = [
        createSet(10, 225), // 2250 volume
        createSet(12, 225), // 2700 volume
      ];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toEqual({
        type: "volume",
        currentValue: 3000,
        previousValue: 2700,
      });
    });
  });

  describe("PR priority (weight > volume > reps)", () => {
    it("prioritizes weight PR over volume PR", () => {
      const currentSet = createSet(8, 320); // 2560 volume
      const previousSets = [
        createSet(10, 315), // 3150 volume (higher), 315 weight (lower)
      ];

      const result = checkForPR(currentSet, previousSets);

      // Should prioritize weight PR even though volume is lower
      expect(result).toEqual({
        type: "weight",
        currentValue: 320,
        previousValue: 315,
      });
    });

    it("prioritizes volume PR over reps PR", () => {
      const currentSet = createSet(15, 185); // 2775 volume
      const previousSets = [
        createSet(12, 185), // 2220 volume, 12 reps
        createSet(10, 200), // 2000 volume, 10 reps
      ];

      const result = checkForPR(currentSet, previousSets);

      // Both volume and reps are PRs, should prioritize volume
      expect(result?.type).toBe("volume");
    });
  });

  describe("edge cases", () => {
    it("returns null when no PR achieved", () => {
      const currentSet = createSet(8, 275);
      const previousSets = [
        createSet(10, 315), // Better in all metrics
      ];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toBeNull();
    });

    it("handles zero weight gracefully", () => {
      const currentSet = createSet(10, 0);
      const previousSets = [createSet(8, 0)];

      const result = checkForPR(currentSet, previousSets);

      // Reps PR
      expect(result).toEqual({
        type: "reps",
        currentValue: 10,
        previousValue: 8,
      });
    });

    it("handles undefined weight as bodyweight", () => {
      const currentSet = createSet(30); // No weight property
      const previousSets = [createSet(25)];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toEqual({
        type: "reps",
        currentValue: 30,
        previousValue: 25,
      });
    });
  });

  describe("duration-based exercises", () => {
    const createDurationSet = (
      duration: number,
      performedAt: number = Date.now()
    ): Set => ({
      _id: "test-id" as Id<"sets">,
      exerciseId: "exercise-1" as Id<"exercises">,
      reps: undefined,
      duration,
      performedAt,
    });

    it("returns null for duration-based current set (no reps)", () => {
      const currentSet = createDurationSet(60);
      const previousSets = [createSet(10, 100)];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toBeNull();
    });

    it("treats as first rep-based set when all previous sets are duration-based", () => {
      const currentSet = createSet(10, 100);
      const previousSets = [createDurationSet(60), createDurationSet(90)];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toEqual({
        type: "weight",
        currentValue: 100,
        previousValue: 0,
      });
    });

    it("returns reps PR when first rep-based set has no weight", () => {
      const currentSet = createSet(15);
      const previousSets = [createDurationSet(60), createDurationSet(90)];

      const result = checkForPR(currentSet, previousSets);

      expect(result).toEqual({
        type: "reps",
        currentValue: 15,
        previousValue: 0,
      });
    });

    it("returns reps PR when first rep-based set has zero weight but positive reps", () => {
      const currentSet = createSet(10, 0);
      const previousSets = [createDurationSet(60)];

      const result = checkForPR(currentSet, previousSets);

      // With weight=0 and reps=10, volume=0, so reps PR takes priority
      expect(result).toEqual({
        type: "reps",
        currentValue: 10,
        previousValue: 0,
      });
    });

    it("returns null when rep-based set has zero values and no previous rep-based sets", () => {
      const currentSet = createSet(0, 0);
      const previousSets = [createDurationSet(60)];

      const result = checkForPR(currentSet, previousSets);

      // No PR when reps=0, weight=0, volume=0
      expect(result).toBeNull();
    });
  });

  describe("first set edge cases", () => {
    it("returns null when first set has zero weight and zero reps", () => {
      // This tests the path where weight=0, reps=0 but we still try volume
      const currentSet = createSet(0, 0);
      const result = checkForPR(currentSet, []);

      // No PR because all values are 0
      expect(result).toBeNull();
    });

    it("returns null when first set has undefined reps", () => {
      const durationSet: Set = {
        _id: "test-id" as Id<"sets">,
        exerciseId: "exercise-1" as Id<"exercises">,
        reps: undefined,
        duration: 60,
        performedAt: Date.now(),
      };

      const result = checkForPR(durationSet, []);

      expect(result).toBeNull();
    });
  });
});

describe("formatPRMessage", () => {
  it("formats weight PR message", () => {
    const prResult: PRResult = {
      type: "weight",
      currentValue: 315,
      previousValue: 300,
    };

    const message = formatPRMessage("Squats", prResult, "lbs");

    expect(message).toBe("🎉 NEW PR! Squats: 315 lbs (previous: 300 lbs)");
  });

  it("formats volume PR message", () => {
    const prResult: PRResult = {
      type: "volume",
      currentValue: 3000,
      previousValue: 2700,
    };

    const message = formatPRMessage("Bench Press", prResult, "kg");

    expect(message).toBe(
      "🎉 NEW PR! Bench Press: 3000 kg total volume (previous: 2700 kg)"
    );
  });

  it("formats reps PR message", () => {
    const prResult: PRResult = {
      type: "reps",
      currentValue: 25,
      previousValue: 20,
    };

    const message = formatPRMessage("Pull-ups", prResult);

    expect(message).toBe("🎉 NEW PR! Pull-ups: 25 reps (previous: 20 reps)");
  });

  it("uses default unit (lbs) when not specified", () => {
    const prResult: PRResult = {
      type: "weight",
      currentValue: 225,
      previousValue: 200,
    };

    const message = formatPRMessage("Deadlift", prResult);

    expect(message).toContain("lbs");
  });
});
