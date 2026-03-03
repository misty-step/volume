import { describe, expect, it } from "vitest";
import { LogSetArgsSchema } from "./schemas";

describe("LogSetArgsSchema", () => {
  it("passes LLM-provided args through unchanged", () => {
    const llmArgs = {
      exercise_name: "Bench Press",
      reps: 15,
      weight: 45,
      unit: "lbs",
    };

    const parsed = LogSetArgsSchema.parse(llmArgs);

    expect(parsed).toEqual(llmArgs);
  });

  it("preserves weight when only reps are provided", () => {
    const llmArgs = {
      exercise_name: "Squat",
      reps: 5,
      weight: 225,
      unit: "lbs",
    };

    const parsed = LogSetArgsSchema.parse(llmArgs);

    expect(parsed.weight).toBe(225);
    expect(parsed.reps).toBe(5);
  });

  it("accepts duration-based sets", () => {
    const llmArgs = {
      exercise_name: "Plank",
      duration_seconds: 120,
    };

    const parsed = LogSetArgsSchema.parse(llmArgs);

    expect(parsed.duration_seconds).toBe(120);
    expect(parsed.reps).toBeUndefined();
  });
});
