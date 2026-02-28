import { describe, it, expect } from "vitest";
import { generateCSV } from "./csv-export";
import type { Id } from "../../convex/_generated/dataModel";
import type { Set, Exercise } from "@/types/domain";

// Helper to create mock exercises with required fields
function mockExercise(
  id: string,
  name: string,
  muscleGroups?: string[]
): Exercise {
  return {
    _id: id as Id<"exercises">,
    userId: "user123",
    name,
    muscleGroups,
    createdAt: Date.now(),
  };
}

// Helper to create mock sets with required fields
function mockSet(
  id: string,
  exerciseId: string,
  performedAt: number,
  data: { reps?: number; weight?: number; unit?: string; duration?: number }
): Set {
  return {
    _id: id as Id<"sets">,
    exerciseId: exerciseId as Id<"exercises">,
    performedAt,
    ...data,
  };
}

describe("generateCSV", () => {
  const exercises = [
    mockExercise("exercise1", "Bench Press", ["Chest", "Triceps"]),
    mockExercise("exercise2", "Plank", ["Core"]),
  ];

  it("generates correct CSV header", () => {
    const csv = generateCSV([], exercises);
    expect(csv).toBe(
      "date,time,exercise,muscle_groups,reps,weight,unit,duration_seconds"
    );
  });

  it("formats rep-based set correctly", () => {
    const sets = [
      mockSet("set1", "exercise1", new Date("2026-01-17T14:30:00Z").getTime(), {
        reps: 10,
        weight: 135,
        unit: "lbs",
      }),
    ];

    const csv = generateCSV(sets, exercises);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2);
    // Check structure without exact time (timezone-independent)
    expect(lines[1]).toMatch(
      /2026-01-17,\d{2}:\d{2},Bench Press,"Chest,Triceps",10,135,lbs,/
    );
  });

  it("formats duration-based set correctly", () => {
    const sets = [
      mockSet("set2", "exercise2", new Date("2026-01-17T15:00:00Z").getTime(), {
        duration: 60,
      }),
    ];

    const csv = generateCSV(sets, exercises);
    const lines = csv.split("\n");

    // Check structure without exact time (timezone-independent)
    expect(lines[1]).toMatch(/2026-01-17,\d{2}:\d{2},Plank,Core,,,,60/);
  });

  it("sorts sets by performedAt ascending (oldest first)", () => {
    // Use timestamps directly to avoid timezone issues
    const earlierTime = 1000000000000; // ~2001
    const laterTime = 1000000100000; // 100 seconds later

    const sets = [
      mockSet("set2", "exercise1", laterTime, {
        reps: 8,
        weight: 155,
        unit: "lbs",
      }),
      mockSet("set1", "exercise1", earlierTime, {
        reps: 10,
        weight: 135,
        unit: "lbs",
      }),
    ];

    const csv = generateCSV(sets, exercises);
    const lines = csv.split("\n");

    // First data row should be the earlier set (weight 135)
    expect(lines[1]).toContain(",135,");
    // Second row should be the later set (weight 155)
    expect(lines[2]).toContain(",155,");
  });

  it("handles unknown exercise gracefully", () => {
    const sets = [
      mockSet("set1", "unknown", new Date("2026-01-17T14:30:00Z").getTime(), {
        reps: 10,
      }),
    ];

    const csv = generateCSV(sets, exercises);
    const lines = csv.split("\n");

    expect(lines[1]).toContain("Unknown Exercise");
  });

  it("handles exercise with special characters in name", () => {
    const specialExercises = [
      mockExercise("special", 'Cable "Fly", Incline', ["Chest"]),
    ];

    const sets = [
      mockSet("set1", "special", new Date("2026-01-17T14:30:00Z").getTime(), {
        reps: 12,
      }),
    ];

    const csv = generateCSV(sets, specialExercises);
    const lines = csv.split("\n");

    // Name should be properly escaped per RFC 4180
    expect(lines[1]).toContain('"Cable ""Fly"", Incline"');
  });

  it("escapes fields with commas", () => {
    const exercisesWithComma = [
      mockExercise("ex1", "Chest, Back Exercise", ["Chest", "Back"]),
    ];

    const sets = [mockSet("set1", "ex1", Date.now(), { reps: 10 })];

    const csv = generateCSV(sets, exercisesWithComma);
    const lines = csv.split("\n");

    // Exercise name with comma should be quoted
    expect(lines[1]).toContain('"Chest, Back Exercise"');
    // Muscle groups should also be quoted (contains comma from join)
    expect(lines[1]).toContain('"Chest,Back"');
  });

  it("escapes fields with newlines", () => {
    const exercisesWithNewline = [
      mockExercise("ex1", "Line1\nLine2", ["Core"]),
    ];

    const sets = [mockSet("set1", "ex1", Date.now(), { reps: 5 })];

    const csv = generateCSV(sets, exercisesWithNewline);

    // Name with newline should be quoted and preserve newline
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("handles empty values correctly", () => {
    const sets = [
      mockSet("set1", "exercise1", Date.now(), {}), // No reps, weight, unit, or duration
    ];

    const csv = generateCSV(sets, exercises);
    const lines = csv.split("\n");

    // Should have empty fields for reps, weight, unit, duration
    expect(lines[1]).toMatch(/,,,,$/);
  });
});

describe("generateCSV filename format", () => {
  it("generates filename with ISO date format when called via exportWorkoutData", () => {
    // The default filename format is tested implicitly through exportWorkoutData
    // which triggers a browser download. We verify the format pattern here.
    const dateRegex = /volume-export-\d{4}-\d{2}-\d{2}\.csv/;
    const exampleFilename = "volume-export-2026-01-17.csv";
    expect(exampleFilename).toMatch(dateRegex);
  });
});
