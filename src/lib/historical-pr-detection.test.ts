import { describe, it, expect } from "vitest";
import { detectHistoricalPRs } from "./historical-pr-detection";
import { type Set } from "@/types/domain";
import { type Id } from "../../convex/_generated/dataModel";

describe("detectHistoricalPRs", () => {
  it("marks first set as PR", () => {
    const sets: Set[] = [
      {
        _id: "set1" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 135,
        performedAt: 1000,
        userId: "user1",
      },
    ];

    const prMap = detectHistoricalPRs(sets);

    expect(prMap.get("set1" as Id<"sets">)).toBe("weight");
  });

  it("detects weight PR in chronological order", () => {
    const sets: Set[] = [
      // Newest first (display order)
      {
        _id: "set3" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 225,
        performedAt: 3000,
        userId: "user1",
      },
      {
        _id: "set2" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 205,
        performedAt: 2000,
        userId: "user1",
      },
      {
        _id: "set1" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 185,
        performedAt: 1000,
        userId: "user1",
      },
    ];

    const prMap = detectHistoricalPRs(sets);

    // All three are weight PRs (each heavier than the last)
    expect(prMap.get("set1" as Id<"sets">)).toBe("weight");
    expect(prMap.get("set2" as Id<"sets">)).toBe("weight");
    expect(prMap.get("set3" as Id<"sets">)).toBe("weight");
  });

  it("detects volume PR when reps increase at same weight", () => {
    const sets: Set[] = [
      {
        _id: "set3" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 12,
        weight: 315,
        performedAt: 3000,
        userId: "user1",
      },
      {
        _id: "set2" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 315,
        performedAt: 2000,
        userId: "user1",
      },
      {
        _id: "set1" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 8,
        weight: 300,
        performedAt: 1000,
        userId: "user1",
      },
    ];

    const prMap = detectHistoricalPRs(sets);

    expect(prMap.get("set1" as Id<"sets">)).toBe("weight");
    expect(prMap.get("set2" as Id<"sets">)).toBe("weight");
    // set3: 12 × 315 = 3780 volume (higher than 10 × 315 = 3150)
    expect(prMap.get("set3" as Id<"sets">)).toBe("volume");
  });

  it("does not mark non-PR sets", () => {
    const sets: Set[] = [
      {
        _id: "set3" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 8,
        weight: 300,
        performedAt: 3000,
        userId: "user1",
      },
      {
        _id: "set2" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 315,
        performedAt: 2000,
        userId: "user1",
      },
      {
        _id: "set1" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 12,
        weight: 315,
        performedAt: 1000,
        userId: "user1",
      },
    ];

    const prMap = detectHistoricalPRs(sets);

    // set1 is a PR (first set)
    expect(prMap.get("set1" as Id<"sets">)).toBe("weight");
    // set2 is NOT a PR (same weight, fewer reps)
    expect(prMap.get("set2" as Id<"sets">)).toBeUndefined();
    // set3 is NOT a PR (worse than both previous sets)
    expect(prMap.get("set3" as Id<"sets">)).toBeUndefined();
  });

  it("detects volume PR", () => {
    const sets: Set[] = [
      {
        _id: "set2" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 15,
        weight: 200,
        performedAt: 2000,
        userId: "user1",
      },
      {
        _id: "set1" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 250,
        performedAt: 1000,
        userId: "user1",
      },
    ];

    const prMap = detectHistoricalPRs(sets);

    // set1: 250 * 10 = 2500 volume (weight PR)
    expect(prMap.get("set1" as Id<"sets">)).toBe("weight");
    // set2: 200 * 15 = 3000 volume (volume PR, not weight or reps)
    expect(prMap.get("set2" as Id<"sets">)).toBe("volume");
  });

  it("handles bodyweight exercises (no weight)", () => {
    const sets: Set[] = [
      {
        _id: "set2" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 25,
        weight: undefined,
        performedAt: 2000,
        userId: "user1",
      },
      {
        _id: "set1" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 20,
        weight: undefined,
        performedAt: 1000,
        userId: "user1",
      },
    ];

    const prMap = detectHistoricalPRs(sets);

    // Both sets are reps PRs (no weight to compare)
    expect(prMap.get("set1" as Id<"sets">)).toBe("reps");
    expect(prMap.get("set2" as Id<"sets">)).toBe("reps");
  });

  it("handles empty set list", () => {
    const prMap = detectHistoricalPRs([]);
    expect(prMap.size).toBe(0);
  });

  it("handles sets with same values (no PR)", () => {
    const sets: Set[] = [
      {
        _id: "set2" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 135,
        performedAt: 2000,
        userId: "user1",
      },
      {
        _id: "set1" as Id<"sets">,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 135,
        performedAt: 1000,
        userId: "user1",
      },
    ];

    const prMap = detectHistoricalPRs(sets);

    // Only first set is PR
    expect(prMap.get("set1" as Id<"sets">)).toBe("weight");
    expect(prMap.get("set2" as Id<"sets">)).toBeUndefined();
  });
});
