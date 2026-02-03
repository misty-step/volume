/**
 * Exercise Classification Tests
 *
 * Tests for exercise classification using pattern-matching fallback.
 * In test environments, the OpenRouter client returns null, so these tests
 * verify the deterministic fallback classification behavior.
 */

import { describe, it, expect, vi } from "vitest";
import { classifyExercise, isConfigured } from "./classify";

describe("classifyExercise (fallback mode)", () => {
  // Tests run in test environment where OpenRouter client returns null
  // So all tests hit the deterministic fallback classification

  describe("chest exercises", () => {
    it("classifies bench press", async () => {
      const result = await classifyExercise("Bench Press");
      expect(result).toEqual(["Chest", "Triceps"]);
    });

    it("classifies chest fly", async () => {
      const result = await classifyExercise("Cable Chest Fly");
      expect(result).toEqual(["Chest", "Triceps"]);
    });

    it("classifies pec deck", async () => {
      const result = await classifyExercise("Pec Deck");
      expect(result).toEqual(["Chest", "Triceps"]);
    });

    it("classifies dips", async () => {
      const result = await classifyExercise("Tricep Dips");
      expect(result).toEqual(["Chest", "Triceps"]);
    });

    it("classifies incline exercises", async () => {
      // Note: "Incline" by itself triggers Chest, but "Press" comes first in pattern order
      // and matches Shoulders. This tests actual behavior.
      const result = await classifyExercise("Incline Bench Press");
      expect(result).toEqual(["Chest", "Triceps"]);
    });
  });

  describe("back exercises", () => {
    it("classifies pull-ups (hyphenated)", async () => {
      const result = await classifyExercise("Pull-ups");
      expect(result).toEqual(["Back", "Biceps"]);
    });

    it("classifies pullups (no hyphen)", async () => {
      const result = await classifyExercise("Pullups");
      expect(result).toEqual(["Back", "Biceps"]);
    });

    it("classifies rows", async () => {
      const result = await classifyExercise("Barbell Row");
      expect(result).toEqual(["Back", "Biceps"]);
    });

    it("classifies back-specific exercises", async () => {
      const result = await classifyExercise("Lat Pulldown Back Focus");
      expect(result).toEqual(["Back", "Biceps"]);
    });
  });

  describe("leg exercises", () => {
    it("classifies squats", async () => {
      const result = await classifyExercise("Barbell Squat");
      expect(result).toEqual(["Quads", "Glutes"]);
    });

    it("classifies leg press", async () => {
      const result = await classifyExercise("Leg Press");
      expect(result).toEqual(["Quads", "Glutes"]);
    });

    it("classifies quad-focused exercises", async () => {
      const result = await classifyExercise("Quad Extension");
      expect(result).toEqual(["Quads", "Glutes"]);
    });

    it("classifies lunges", async () => {
      const result = await classifyExercise("Walking Lunges");
      expect(result).toEqual(["Quads", "Glutes"]);
    });

    it("classifies deadlifts", async () => {
      const result = await classifyExercise("Deadlift");
      expect(result).toEqual(["Back", "Hamstrings", "Glutes"]);
    });

    it("classifies RDL", async () => {
      const result = await classifyExercise("Romanian RDL");
      expect(result).toEqual(["Back", "Hamstrings", "Glutes"]);
    });

    it("classifies hamstring exercises", async () => {
      const result = await classifyExercise("Hamstring Curl");
      expect(result).toEqual(["Back", "Hamstrings", "Glutes"]);
    });
  });

  describe("arm exercises", () => {
    it("classifies bicep curls", async () => {
      const result = await classifyExercise("Bicep Curls");
      expect(result).toEqual(["Biceps"]);
    });

    it("classifies hammer curls", async () => {
      const result = await classifyExercise("Hammer Curl");
      expect(result).toEqual(["Biceps"]);
    });

    it("classifies tricep exercises", async () => {
      const result = await classifyExercise("Tricep Pushdown");
      expect(result).toEqual(["Triceps"]);
    });

    it("classifies tricep extensions", async () => {
      const result = await classifyExercise("Overhead Tricep Extension");
      expect(result).toEqual(["Triceps"]);
    });
  });

  describe("shoulder exercises", () => {
    it("classifies shoulder press", async () => {
      const result = await classifyExercise("Shoulder Press");
      expect(result).toEqual(["Shoulders", "Triceps"]);
    });

    it("classifies overhead press", async () => {
      const result = await classifyExercise("Overhead Press");
      expect(result).toEqual(["Shoulders", "Triceps"]);
    });
  });

  describe("core exercises", () => {
    it("classifies planks", async () => {
      const result = await classifyExercise("Plank");
      expect(result).toEqual(["Core"]);
    });

    it("classifies crunches", async () => {
      const result = await classifyExercise("Bicycle Crunch");
      expect(result).toEqual(["Core"]);
    });

    it("classifies ab exercises", async () => {
      const result = await classifyExercise("Ab Rollout");
      expect(result).toEqual(["Core"]);
    });

    it("classifies core-labeled exercises", async () => {
      const result = await classifyExercise("Core Rotation");
      expect(result).toEqual(["Core"]);
    });
  });

  describe("calf exercises", () => {
    it("classifies calf raises", async () => {
      const result = await classifyExercise("Calf Raises");
      expect(result).toEqual(["Calves"]);
    });

    it("classifies standing raises", async () => {
      const result = await classifyExercise("Standing Calf Raise");
      expect(result).toEqual(["Calves"]);
    });
  });

  describe("unknown exercises", () => {
    it("returns Other for unrecognized exercises", async () => {
      const result = await classifyExercise("Random Exercise Name XYZ");
      expect(result).toEqual(["Other"]);
    });

    it("returns Other for completely custom exercises", async () => {
      // Avoid any keyword that might match existing patterns
      const result = await classifyExercise("Zzzz Custom Thing");
      expect(result).toEqual(["Other"]);
    });
  });

  describe("case insensitivity", () => {
    it("handles uppercase", async () => {
      const result = await classifyExercise("BENCH PRESS");
      expect(result).toEqual(["Chest", "Triceps"]);
    });

    it("handles mixed case", async () => {
      const result = await classifyExercise("BaRbElL sQuAt");
      expect(result).toEqual(["Quads", "Glutes"]);
    });
  });
});

describe("isConfigured", () => {
  it("is a function that returns a boolean", () => {
    expect(typeof isConfigured).toBe("function");
    expect(typeof isConfigured()).toBe("boolean");
  });
});
