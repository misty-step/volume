import { describe, it, expect, vi } from "vitest";
import {
  buildExerciseSessions,
  computeTrendSummary,
  buildWeightTierBreakdown,
  getRecentSessions,
  getSessionsInDateRange,
  type ExerciseSession,
} from "./exercise-insights";
import type { Set } from "@/types/domain";
import { type Id } from "../../convex/_generated/dataModel";

// Helper to create mock sets
function createSet(overrides: Partial<Set> & { performedAt: number }): Set {
  return {
    _id: `set_${Math.random()}` as Id<"sets">,
    exerciseId: "exercise_1" as Id<"exercises">,
    reps: 10,
    ...overrides,
  };
}

describe("exercise-insights", () => {
  describe("buildExerciseSessions", () => {
    it("returns empty array for no sets", () => {
      const result = buildExerciseSessions([], "lbs");
      expect(result).toEqual([]);
    });

    it("groups sets by day", () => {
      const day1 = new Date("2024-01-15").getTime();
      const day2 = new Date("2024-01-16").getTime();

      // Pass sets in desc order (most recent first) as Convex returns them
      const sets: Set[] = [
        createSet({ performedAt: day2, reps: 8 }),
        createSet({ performedAt: day1 + 3600000, reps: 12 }), // Same day as day1, 1 hour later
        createSet({ performedAt: day1, reps: 10 }),
      ];

      const result = buildExerciseSessions(sets, "lbs");

      expect(result).toHaveLength(2);
      expect(result[0].sets).toHaveLength(1); // Day 2 (first encountered)
      expect(result[1].sets).toHaveLength(2); // Day 1
    });

    it("computes totals correctly for rep-based sets", () => {
      const day = new Date("2024-01-15").getTime();
      const sets: Set[] = [
        createSet({ performedAt: day, reps: 10 }),
        createSet({ performedAt: day + 1000, reps: 12 }),
        createSet({ performedAt: day + 2000, reps: 8 }),
      ];

      const result = buildExerciseSessions(sets, "lbs");

      expect(result).toHaveLength(1);
      expect(result[0].totals.setCount).toBe(3);
      expect(result[0].totals.reps).toBe(30);
      expect(result[0].totals.volume).toBe(0); // No weight
    });

    it("computes volume correctly for weighted sets", () => {
      const day = new Date("2024-01-15").getTime();
      const sets: Set[] = [
        createSet({ performedAt: day, reps: 10, weight: 135, unit: "lbs" }),
        createSet({
          performedAt: day + 1000,
          reps: 8,
          weight: 155,
          unit: "lbs",
        }),
      ];

      const result = buildExerciseSessions(sets, "lbs");

      expect(result[0].totals.volume).toBe(10 * 135 + 8 * 155);
      expect(result[0].maxWeight).toBe(155);
    });

    it("converts weight units correctly", () => {
      const day = new Date("2024-01-15").getTime();
      const sets: Set[] = [
        createSet({ performedAt: day, reps: 10, weight: 100, unit: "kg" }),
      ];

      const result = buildExerciseSessions(sets, "lbs");

      // 100kg * 2.20462 = 220.462 lbs
      expect(result[0].totals.volume).toBeCloseTo(10 * 220.462, 0);
      expect(result[0].maxWeight).toBeCloseTo(220.462, 0);
    });

    it("computes duration totals for time-based sets", () => {
      const day = new Date("2024-01-15").getTime();
      const sets: Set[] = [
        createSet({ performedAt: day, reps: undefined, duration: 60 }),
        createSet({ performedAt: day + 1000, reps: undefined, duration: 45 }),
      ];

      const result = buildExerciseSessions(sets, "lbs");

      expect(result[0].totals.durationSec).toBe(105);
      expect(result[0].totals.reps).toBe(0);
    });

    it("identifies best set (highest volume) for weighted exercises", () => {
      const day = new Date("2024-01-15").getTime();
      const sets: Set[] = [
        createSet({ performedAt: day, reps: 10, weight: 135, unit: "lbs" }), // 1350
        createSet({
          performedAt: day + 1000,
          reps: 8,
          weight: 185,
          unit: "lbs",
        }), // 1480 - best
        createSet({
          performedAt: day + 2000,
          reps: 6,
          weight: 205,
          unit: "lbs",
        }), // 1230
      ];

      const result = buildExerciseSessions(sets, "lbs");

      expect(result[0].bestSet?.reps).toBe(8);
      expect(result[0].bestSet?.weight).toBe(185);
    });

    it("identifies best set (most reps) for bodyweight exercises", () => {
      const day = new Date("2024-01-15").getTime();
      const sets: Set[] = [
        createSet({ performedAt: day, reps: 15 }),
        createSet({ performedAt: day + 1000, reps: 20 }), // Best
        createSet({ performedAt: day + 2000, reps: 12 }),
      ];

      const result = buildExerciseSessions(sets, "lbs");

      expect(result[0].bestSet?.reps).toBe(20);
      expect(result[0].bestSet?.weight).toBeUndefined();
    });

    it("identifies best set (longest duration) for duration exercises", () => {
      const day = new Date("2024-01-15").getTime();
      const sets: Set[] = [
        createSet({ performedAt: day, reps: undefined, duration: 60 }),
        createSet({ performedAt: day + 1000, reps: undefined, duration: 90 }), // Best
        createSet({ performedAt: day + 2000, reps: undefined, duration: 45 }),
      ];

      const result = buildExerciseSessions(sets, "lbs");

      expect(result[0].bestSet?.duration).toBe(90);
    });
  });

  describe("computeTrendSummary", () => {
    it("returns null values for empty sessions", () => {
      const result = computeTrendSummary([], "Last 7 sessions");

      expect(result.sessionCount).toBe(0);
      expect(result.setsPerSessionAvg).toBeNull();
      expect(result.workingWeight).toBeNull();
      expect(result.bestSet).toBeNull();
    });

    it("computes averages correctly", () => {
      const sessions: ExerciseSession[] = [
        {
          dayKey: "Mon Jan 15 2024",
          displayDate: "Jan 15",
          sets: [],
          totals: { setCount: 4, reps: 40, durationSec: 0, volume: 5000 },
          bestSet: null,
          maxWeight: 155,
        },
        {
          dayKey: "Tue Jan 16 2024",
          displayDate: "Jan 16",
          sets: [],
          totals: { setCount: 3, reps: 30, durationSec: 0, volume: 4000 },
          bestSet: null,
          maxWeight: 145,
        },
      ];

      const result = computeTrendSummary(sessions, "Last 7 sessions");

      expect(result.sessionCount).toBe(2);
      expect(result.setsPerSessionAvg).toBe(3.5); // (4+3)/2
      expect(result.repsPerSetAvg).toBeCloseTo(10, 1); // 70/7
      expect(result.volumePerSessionAvg).toBe(4500); // (5000+4000)/2
      expect(result.workingWeight).toBe(155); // Max of all sessions
    });

    it("tracks frequency this week vs last week", () => {
      // Mock system time to control week boundaries
      // Wednesday Jan 17 2024 - week starts Sunday Jan 14
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-17T12:00:00.000Z"));

      const sessions: ExerciseSession[] = [
        {
          dayKey: "Wed Jan 17 2024", // This week (Wed)
          displayDate: "Today",
          sets: [],
          totals: { setCount: 3, reps: 30, durationSec: 0, volume: 0 },
          bestSet: null,
          maxWeight: null,
        },
        {
          dayKey: "Mon Jan 15 2024", // This week (Mon)
          displayDate: "Monday",
          sets: [],
          totals: { setCount: 3, reps: 30, durationSec: 0, volume: 0 },
          bestSet: null,
          maxWeight: null,
        },
        {
          dayKey: "Sat Jan 13 2024", // Last week (Sat)
          displayDate: "Saturday",
          sets: [],
          totals: { setCount: 3, reps: 30, durationSec: 0, volume: 0 },
          bestSet: null,
          maxWeight: null,
        },
      ];

      const result = computeTrendSummary(sessions, "Last 7 sessions");

      expect(result.frequencyThisWeek).toBe(2);
      expect(result.frequencyLastWeek).toBe(1);

      vi.useRealTimers();
    });
  });

  describe("buildWeightTierBreakdown", () => {
    it("returns empty array for no weighted sets", () => {
      const sets: Set[] = [createSet({ performedAt: Date.now(), reps: 10 })];

      const result = buildWeightTierBreakdown(sets, "lbs");
      expect(result).toEqual([]);
    });

    it("groups sets by rounded weight", () => {
      const sets: Set[] = [
        createSet({
          performedAt: Date.now(),
          reps: 10,
          weight: 133,
          unit: "lbs",
        }),
        createSet({
          performedAt: Date.now(),
          reps: 8,
          weight: 137,
          unit: "lbs",
        }),
        createSet({
          performedAt: Date.now(),
          reps: 6,
          weight: 155,
          unit: "lbs",
        }),
      ];

      const result = buildWeightTierBreakdown(sets, "lbs", 5);

      // 133 and 137 both round to 135
      expect(result).toHaveLength(2);

      const tier135 = result.find((t) => t.weight === 135);
      expect(tier135?.setCount).toBe(2);
      expect(tier135?.avgReps).toBe(9); // (10+8)/2

      const tier155 = result.find((t) => t.weight === 155);
      expect(tier155?.setCount).toBe(1);
      expect(tier155?.avgReps).toBe(6);
    });

    it("sorts by weight descending", () => {
      const sets: Set[] = [
        createSet({
          performedAt: Date.now(),
          reps: 10,
          weight: 135,
          unit: "lbs",
        }),
        createSet({
          performedAt: Date.now(),
          reps: 8,
          weight: 185,
          unit: "lbs",
        }),
        createSet({
          performedAt: Date.now(),
          reps: 6,
          weight: 155,
          unit: "lbs",
        }),
      ];

      const result = buildWeightTierBreakdown(sets, "lbs", 5);

      expect(result[0].weight).toBe(185);
      expect(result[1].weight).toBe(155);
      expect(result[2].weight).toBe(135);
    });
  });

  describe("getRecentSessions", () => {
    it("returns first N sessions", () => {
      const sessions: ExerciseSession[] = Array.from(
        { length: 10 },
        (_, i) => ({
          dayKey: `Day ${i}`,
          displayDate: `Day ${i}`,
          sets: [],
          totals: { setCount: 1, reps: 10, durationSec: 0, volume: 0 },
          bestSet: null,
          maxWeight: null,
        })
      );

      const result = getRecentSessions(sessions, 3);

      expect(result).toHaveLength(3);
      expect(result[0].dayKey).toBe("Day 0");
      expect(result[2].dayKey).toBe("Day 2");
    });
  });

  describe("getSessionsInDateRange", () => {
    it("filters sessions within date range", () => {
      const sessions: ExerciseSession[] = [
        {
          dayKey: "Mon Jan 15 2024",
          displayDate: "Jan 15",
          sets: [],
          totals: { setCount: 1, reps: 10, durationSec: 0, volume: 0 },
          bestSet: null,
          maxWeight: null,
        },
        {
          dayKey: "Wed Jan 17 2024",
          displayDate: "Jan 17",
          sets: [],
          totals: { setCount: 1, reps: 10, durationSec: 0, volume: 0 },
          bestSet: null,
          maxWeight: null,
        },
        {
          dayKey: "Fri Jan 19 2024",
          displayDate: "Jan 19",
          sets: [],
          totals: { setCount: 1, reps: 10, durationSec: 0, volume: 0 },
          bestSet: null,
          maxWeight: null,
        },
      ];

      const start = new Date("2024-01-16");
      const end = new Date("2024-01-18");
      const result = getSessionsInDateRange(sessions, start, end);

      expect(result).toHaveLength(1);
      expect(result[0].dayKey).toBe("Wed Jan 17 2024");
    });
  });
});
