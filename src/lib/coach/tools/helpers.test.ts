// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  formatSecondsShort,
  normalizeLookup,
  titleCase,
  toTodayTotalsOutput,
  uniquePrompts,
} from "./helpers";

describe("helpers", () => {
  describe("normalizeLookup", () => {
    it("lowercases and strips non-alphanumeric characters", () => {
      expect(normalizeLookup("  Push-Ups!!  ")).toBe("pushups");
      expect(normalizeLookup("Bench Press 2.0")).toBe("benchpress20");
    });
  });

  describe("titleCase", () => {
    it("normalizes extra spaces and casing", () => {
      expect(titleCase("   beNCH    press   ")).toBe("Bench Press");
      expect(titleCase("PULL-UPS")).toBe("Pull-ups");
    });
  });

  describe("uniquePrompts", () => {
    it("removes blanks and case-insensitive duplicates while preserving first values", () => {
      expect(
        uniquePrompts([
          "show today's summary",
          " Show today's summary ",
          "",
          "show analytics overview",
          "SHOW ANALYTICS OVERVIEW",
          "show history overview",
        ])
      ).toEqual([
        "show today's summary",
        "show analytics overview",
        "show history overview",
      ]);
    });

    it("caps output at four prompts", () => {
      expect(uniquePrompts(["a", "b", "c", "d", "e", "f"])).toEqual([
        "a",
        "b",
        "c",
        "d",
      ]);
    });
  });

  describe("toTodayTotalsOutput", () => {
    it("serializes all fields to snake_case", () => {
      const output = toTodayTotalsOutput({
        totalSets: 5,
        totalReps: 50,
        totalDurationSeconds: 120,
        exerciseCount: 2,
        topExercises: [
          {
            exerciseId: "ex1",
            exerciseName: "Bench",
            sets: 3,
            reps: 30,
            durationSeconds: 0,
          },
          {
            exerciseId: "ex2",
            exerciseName: "Plank",
            sets: 2,
            reps: 0,
            durationSeconds: 120,
          },
        ],
      });

      expect(output).toEqual({
        total_sets: 5,
        total_reps: 50,
        total_duration_seconds: 120,
        exercise_count: 2,
        top_exercises: [
          { exercise_name: "Bench", sets: 3, reps: 30, duration_seconds: null },
          {
            exercise_name: "Plank",
            sets: 2,
            reps: null,
            duration_seconds: 120,
          },
        ],
      });
    });

    it("returns empty top_exercises for zero-set day", () => {
      const output = toTodayTotalsOutput({
        totalSets: 0,
        totalReps: 0,
        totalDurationSeconds: 0,
        exerciseCount: 0,
        topExercises: [],
      });

      expect(output.total_sets).toBe(0);
      expect(output.total_duration_seconds).toBe(0);
      expect(output.top_exercises).toEqual([]);
    });

    it("nullifies zero reps and zero duration in top_exercises", () => {
      const output = toTodayTotalsOutput({
        totalSets: 1,
        totalReps: 0,
        totalDurationSeconds: 0,
        exerciseCount: 1,
        topExercises: [
          {
            exerciseId: "ex1",
            exerciseName: "Test",
            sets: 1,
            reps: 0,
            durationSeconds: 0,
          },
        ],
      });

      expect(output.top_exercises[0]?.reps).toBeNull();
      expect(output.top_exercises[0]?.duration_seconds).toBeNull();
    });
  });

  describe("formatSecondsShort", () => {
    it("formats short durations in seconds", () => {
      expect(formatSecondsShort(45)).toBe("45 sec");
    });

    it("formats whole minutes when divisible by 60", () => {
      expect(formatSecondsShort(120)).toBe("2 min");
    });

    it("falls back to mm:ss format for mixed values", () => {
      expect(formatSecondsShort(125)).toBe("2:05");
    });
  });
});
