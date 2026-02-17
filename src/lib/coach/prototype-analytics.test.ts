import { describe, expect, it } from "vitest";
import {
  aggregateExerciseTrend,
  summarizeTodaySets,
  summarizeExercisePerformance,
  formatSetMetric,
} from "./prototype-analytics";

const DAY = 24 * 60 * 60 * 1000;

describe("aggregateExerciseTrend", () => {
  it("builds reps trend window", () => {
    const reference = Date.UTC(2026, 1, 16, 12, 0, 0); // Feb 16, 2026
    const sets = [
      { exerciseId: "a", performedAt: reference - DAY, reps: 10 },
      { exerciseId: "a", performedAt: reference - DAY, reps: 12 },
      { exerciseId: "a", performedAt: reference, reps: 8 },
    ];

    const summary = aggregateExerciseTrend(sets, {
      days: 2,
      referenceTime: reference,
    });

    expect(summary.metric).toBe("reps");
    expect(summary.total).toBe(30);
    expect(summary.bestDay).toBe(22);
    expect(summary.points).toHaveLength(2);
    expect(summary.points[0]?.value).toBe(22);
    expect(summary.points[1]?.value).toBe(8);
  });

  it("uses duration metric when reps are not present", () => {
    const reference = Date.UTC(2026, 1, 16, 12, 0, 0);
    const sets = [{ exerciseId: "a", performedAt: reference, duration: 90 }];

    const summary = aggregateExerciseTrend(sets, {
      days: 1,
      referenceTime: reference,
    });

    expect(summary.metric).toBe("duration");
    expect(summary.total).toBe(90);
    expect(summary.bestDay).toBe(90);
  });
});

describe("summarizeTodaySets", () => {
  it("returns totals and top exercises", () => {
    const sets = [
      { exerciseId: "push", performedAt: 1, reps: 10 },
      { exerciseId: "push", performedAt: 2, reps: 12 },
      { exerciseId: "plank", performedAt: 3, duration: 45 },
    ];

    const names = new Map<string, string>([
      ["push", "Push-ups"],
      ["plank", "Plank"],
    ]);

    const summary = summarizeTodaySets(sets, names);
    expect(summary.totalSets).toBe(3);
    expect(summary.totalReps).toBe(22);
    expect(summary.totalDurationSeconds).toBe(45);
    expect(summary.topExercises[0]?.exerciseName).toBe("Push-ups");
    expect(summary.topExercises[0]?.sets).toBe(2);
  });
});

describe("summarizeExercisePerformance", () => {
  it("returns best values and totals", () => {
    const summary = summarizeExercisePerformance([
      { exerciseId: "push", performedAt: 10, reps: 10 },
      { exerciseId: "push", performedAt: 20, reps: 14 },
      { exerciseId: "push", performedAt: 30, duration: 60 },
    ]);

    expect(summary.totalSets).toBe(3);
    expect(summary.totalReps).toBe(24);
    expect(summary.totalDurationSeconds).toBe(60);
    expect(summary.bestReps).toBe(14);
    expect(summary.bestDurationSeconds).toBe(60);
    expect(summary.lastPerformedAt).toBe(30);
  });
});

describe("formatSetMetric", () => {
  it("formats weighted rep set", () => {
    expect(
      formatSetMetric(
        {
          exerciseId: "squat",
          performedAt: 1,
          reps: 5,
          weight: 225,
          unit: "lbs",
        },
        "lbs"
      )
    ).toBe("5 reps @ 225 lbs");
  });

  it("formats duration set", () => {
    expect(
      formatSetMetric(
        { exerciseId: "plank", performedAt: 1, duration: 90 },
        "lbs"
      )
    ).toBe("1:30");
  });
});
