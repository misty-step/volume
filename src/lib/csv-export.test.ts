import { describe, it, expect } from "vitest";
import {
  generateWorkoutCSV,
  getDefaultFilename,
  escapeCSVField,
} from "./csv-export";
import type { Id } from "../../convex/_generated/dataModel";

describe("escapeCSVField", () => {
  it("returns empty string for undefined", () => {
    expect(escapeCSVField(undefined)).toBe("");
  });

  it("returns string as-is when no special characters", () => {
    expect(escapeCSVField("Bench Press")).toBe("Bench Press");
  });

  it("wraps field with comma in quotes", () => {
    expect(escapeCSVField("Chest,Triceps")).toBe('"Chest,Triceps"');
  });

  it("doubles quotes and wraps when field contains quotes", () => {
    expect(escapeCSVField('Smith "Machine" Press')).toBe(
      '"Smith ""Machine"" Press"'
    );
  });

  it("wraps field with newline in quotes", () => {
    expect(escapeCSVField("Line1\nLine2")).toBe('"Line1\nLine2"');
  });

  it("handles multiple special characters", () => {
    expect(escapeCSVField('Test, "with"\nnewline')).toBe(
      '"Test, ""with""\nnewline"'
    );
  });

  it("converts numbers to strings", () => {
    expect(escapeCSVField(135)).toBe("135");
    expect(escapeCSVField(0)).toBe("0");
  });
});

describe("generateWorkoutCSV", () => {
  const mockExerciseId1 = "exercise1" as Id<"exercises">;
  const mockExerciseId2 = "exercise2" as Id<"exercises">;

  const mockExerciseMap = new Map([
    [
      mockExerciseId1,
      {
        _id: mockExerciseId1,
        name: "Bench Press",
        muscleGroups: ["Chest", "Triceps"],
      },
    ],
    [
      mockExerciseId2,
      {
        _id: mockExerciseId2,
        name: "Plank",
        muscleGroups: ["Core"],
      },
    ],
  ]);

  it("generates correct CSV header", () => {
    const csv = generateWorkoutCSV([], mockExerciseMap);
    expect(csv).toBe(
      "date,time,exercise,muscle_groups,reps,weight,unit,duration_seconds"
    );
  });

  it("formats rep-based set correctly", () => {
    const sets = [
      {
        _id: "set1" as Id<"sets">,
        exerciseId: mockExerciseId1,
        performedAt: new Date("2026-01-17T14:30:00Z").getTime(),
        reps: 10,
        weight: 135,
        unit: "lbs",
      },
    ];

    const csv = generateWorkoutCSV(sets, mockExerciseMap);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2);
    // Check structure without exact time (timezone-independent)
    expect(lines[1]).toMatch(
      /2026-01-17,\d{2}:\d{2},Bench Press,"Chest,Triceps",10,135,lbs,/
    );
  });

  it("formats duration-based set correctly", () => {
    const sets = [
      {
        _id: "set2" as Id<"sets">,
        exerciseId: mockExerciseId2,
        performedAt: new Date("2026-01-17T15:00:00Z").getTime(),
        duration: 60,
      },
    ];

    const csv = generateWorkoutCSV(sets, mockExerciseMap);
    const lines = csv.split("\n");

    // Check structure without exact time (timezone-independent)
    expect(lines[1]).toMatch(/2026-01-17,\d{2}:\d{2},Plank,Core,,,,60/);
  });

  it("sorts sets by performedAt ascending (oldest first)", () => {
    // Use timestamps directly to avoid timezone issues
    const earlierTime = 1000000000000; // ~2001
    const laterTime = 1000000100000; // 100 seconds later

    const sets = [
      {
        _id: "set2" as Id<"sets">,
        exerciseId: mockExerciseId1,
        performedAt: laterTime,
        reps: 8,
        weight: 155,
        unit: "lbs",
      },
      {
        _id: "set1" as Id<"sets">,
        exerciseId: mockExerciseId1,
        performedAt: earlierTime,
        reps: 10,
        weight: 135,
        unit: "lbs",
      },
    ];

    const csv = generateWorkoutCSV(sets, mockExerciseMap);
    const lines = csv.split("\n");

    // First data row should be the earlier set (weight 135)
    expect(lines[1]).toContain(",135,");
    // Second row should be the later set (weight 155)
    expect(lines[2]).toContain(",155,");
  });

  it("handles unknown exercise gracefully", () => {
    const unknownExerciseId = "unknown" as Id<"exercises">;
    const sets = [
      {
        _id: "set1" as Id<"sets">,
        exerciseId: unknownExerciseId,
        performedAt: new Date("2026-01-17T14:30:00Z").getTime(),
        reps: 10,
      },
    ];

    const csv = generateWorkoutCSV(sets, mockExerciseMap);
    const lines = csv.split("\n");

    expect(lines[1]).toContain("Unknown Exercise");
  });

  it("handles exercise with special characters in name", () => {
    const specialExerciseId = "special" as Id<"exercises">;
    const exerciseMap = new Map([
      [
        specialExerciseId,
        {
          _id: specialExerciseId,
          name: 'Cable "Fly", Incline',
          muscleGroups: ["Chest"],
        },
      ],
    ]);

    const sets = [
      {
        _id: "set1" as Id<"sets">,
        exerciseId: specialExerciseId,
        performedAt: new Date("2026-01-17T14:30:00Z").getTime(),
        reps: 12,
      },
    ];

    const csv = generateWorkoutCSV(sets, exerciseMap);
    const lines = csv.split("\n");

    // Name should be properly escaped
    expect(lines[1]).toContain('"Cable ""Fly"", Incline"');
  });
});

// downloadCSV: browser-only, tested manually in Chrome/Safari/Firefox

describe("getDefaultFilename", () => {
  it("generates filename with current date", () => {
    const filename = getDefaultFilename();

    expect(filename).toMatch(/^volume-export-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("uses ISO date format (YYYY-MM-DD)", () => {
    const filename = getDefaultFilename();
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);

    expect(dateMatch).not.toBeNull();
    // Verify it's a valid date
    const date = new Date(dateMatch![1]);
    expect(date.toString()).not.toBe("Invalid Date");
  });
});
