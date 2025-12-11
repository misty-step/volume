import { describe, it, expect } from "vitest";
import { groupSetsByExercise } from "./exercise-grouping";
import type { Set } from "@/types/domain";
import type { Id } from "../../convex/_generated/dataModel";

describe("exercise-grouping", () => {
  describe("groupSetsByExercise", () => {
    it("returns empty array for undefined input", () => {
      expect(groupSetsByExercise(undefined)).toEqual([]);
    });

    it("returns empty array for empty input", () => {
      expect(groupSetsByExercise([])).toEqual([]);
    });

    it("groups sets by exercise correctly", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          weight: 100,
          unit: "lbs",
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 8,
          weight: 105,
          unit: "lbs",
          performedAt: now + 1000,
          _creationTime: now + 1000,
        },
        {
          _id: "set3" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex2" as Id<"exercises">,
          reps: 5,
          weight: 225,
          unit: "lbs",
          performedAt: now + 2000,
          _creationTime: now + 2000,
        },
      ];

      const groups = groupSetsByExercise(sets, "lbs");
      expect(groups).toHaveLength(2);

      // ex2 should be first (most recent)
      expect(groups[0].exerciseId).toBe("ex2");
      expect(groups[0].sets).toHaveLength(1);
      expect(groups[0].metrics.totalReps).toBe(5);
      expect(groups[0].metrics.totalVolume).toBe(1125); // 5 * 225

      // ex1 should be second
      expect(groups[1].exerciseId).toBe("ex1");
      expect(groups[1].sets).toHaveLength(2);
      expect(groups[1].metrics.totalReps).toBe(18); // 10 + 8
      expect(groups[1].metrics.totalVolume).toBe(1840); // 10*100 + 8*105
    });

    it("sorts groups by most recent set time", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          performedAt: now - 5000,
          _creationTime: now - 5000,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex2" as Id<"exercises">,
          reps: 10,
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set3" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          performedAt: now - 10000,
          _creationTime: now - 10000,
        },
      ];

      const groups = groupSetsByExercise(sets);
      expect(groups[0].exerciseId).toBe("ex2"); // Most recent at now
      expect(groups[1].exerciseId).toBe("ex1"); // Most recent at now-5000
    });

    it("sorts sets within each group newest first", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          performedAt: now - 1000,
          _creationTime: now - 1000,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 8,
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set3" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 12,
          performedAt: now - 2000,
          _creationTime: now - 2000,
        },
      ];

      const groups = groupSetsByExercise(sets);
      expect(groups[0].sets[0]._id).toBe("set2"); // Most recent
      expect(groups[0].sets[1]._id).toBe("set1");
      expect(groups[0].sets[2]._id).toBe("set3"); // Oldest
    });

    it("converts mixed units correctly for volume calculation", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          weight: 100,
          unit: "kg",
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          weight: 100,
          unit: "lbs",
          performedAt: now + 1000,
          _creationTime: now + 1000,
        },
      ];

      const groups = groupSetsByExercise(sets, "lbs");
      // 10 reps * 100kg (220.46 lbs) + 10 reps * 100 lbs = 2204.6 + 1000 = 3204.6
      expect(groups[0].metrics.totalVolume).toBeCloseTo(3204.6, 1);
    });

    it("handles sets without weight (bodyweight exercises)", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 8,
          performedAt: now + 1000,
          _creationTime: now + 1000,
        },
      ];

      const groups = groupSetsByExercise(sets);
      expect(groups[0].metrics.totalReps).toBe(18);
      expect(groups[0].metrics.totalVolume).toBe(0); // No weight
      expect(groups[0].sets).toHaveLength(2);
    });

    it("handles duration-only sets", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          duration: 60,
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          duration: 90,
          performedAt: now + 1000,
          _creationTime: now + 1000,
        },
      ];

      const groups = groupSetsByExercise(sets);
      expect(groups).toHaveLength(1);
      expect(groups[0].metrics.totalDuration).toBe(150);
      expect(groups[0].metrics.totalReps).toBe(0);
      expect(groups[0].metrics.totalVolume).toBe(0);
      expect(groups[0].metrics.primary.kind).toBe("duration");
      expect(groups[0].metrics.secondary).toBeUndefined();
    });

    it("handles mixed reps + duration sets without weight", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          performedAt: now - 1000,
          _creationTime: now - 1000,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          duration: 45,
          performedAt: now,
          _creationTime: now,
        },
      ];

      const groups = groupSetsByExercise(sets);
      expect(groups[0].metrics.totalReps).toBe(10);
      expect(groups[0].metrics.totalDuration).toBe(45);
      expect(groups[0].metrics.primary.kind).toBe("duration");
      expect(groups[0].metrics.secondary?.kind).toBe("reps");
    });

    it("tracks mostRecentSetTime correctly", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          performedAt: now - 5000,
          _creationTime: now - 5000,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 8,
          performedAt: now,
          _creationTime: now,
        },
      ];

      const groups = groupSetsByExercise(sets);
      expect(groups[0].mostRecentSetTime).toBe(now);
    });

    it("skips malformed sets without exerciseId", () => {
      const now = Date.now();
      const sets: Set[] = [
        {
          _id: "set1" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 10,
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set2" as Id<"sets">,
          userId: "user1",
          exerciseId: undefined as unknown as Id<"exercises">, // Malformed data
          reps: 5,
          performedAt: now,
          _creationTime: now,
        },
        {
          _id: "set3" as Id<"sets">,
          userId: "user1",
          exerciseId: "ex1" as Id<"exercises">,
          reps: 8,
          performedAt: now,
          _creationTime: now,
        },
      ];

      const groups = groupSetsByExercise(sets);
      // Should only include the 2 valid sets, skip the malformed one
      expect(groups).toHaveLength(1);
      expect(groups[0].exerciseId).toBe("ex1");
      expect(groups[0].sets).toHaveLength(2);
      expect(groups[0].metrics.totalReps).toBe(18); // 10 + 8, not 10 + 5 + 8
    });
  });
});
