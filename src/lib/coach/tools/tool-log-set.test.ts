import { describe, expect, it } from "vitest";
import { preferParsedSetArgs } from "./tool-log-set";

describe("preferParsedSetArgs", () => {
  it("returns raw args when user input is missing", () => {
    const raw = { exercise_name: "Push-ups", reps: 5 };
    expect(preferParsedSetArgs(raw)).toEqual(raw);
  });

  it("returns raw args when user input is not a log intent", () => {
    const raw = { exercise_name: "Push-ups", reps: 5 };
    expect(preferParsedSetArgs(raw, "show today's summary")).toEqual(raw);
  });

  it("does not override when exercise names do not match", () => {
    const raw = { exercise_name: "Squats", reps: 5, weight: 225, unit: "lbs" };
    expect(preferParsedSetArgs(raw, "10 pushups")).toEqual(raw);
  });

  it("prefers parsed reps and clears duration_seconds", () => {
    const raw = {
      exercise_name: "pushups",
      reps: 1,
      duration_seconds: 60,
      weight: 10,
      unit: "kg" as const,
    };

    expect(preferParsedSetArgs(raw, "10 pushups @ 50 lbs")).toEqual({
      exercise_name: "pushups",
      reps: 10,
      duration_seconds: undefined,
      weight: 50,
      unit: "lbs",
    });
  });

  it("keeps tool weight/unit when user input has none", () => {
    const raw = {
      exercise_name: "push-ups",
      reps: 1,
      duration_seconds: 60,
      weight: 10,
      unit: "kg" as const,
    };

    expect(preferParsedSetArgs(raw, "10 pushups")).toEqual({
      exercise_name: "push-ups",
      reps: 10,
      duration_seconds: undefined,
      weight: 10,
      unit: "kg",
    });
  });

  it("prefers parsed duration and clears reps", () => {
    const raw = {
      exercise_name: "plank",
      reps: 30,
      duration_seconds: 15,
      weight: 10,
      unit: "lbs" as const,
    };

    expect(preferParsedSetArgs(raw, "plank for 2 min")).toEqual({
      exercise_name: "plank",
      reps: undefined,
      duration_seconds: 120,
      weight: 10,
      unit: "lbs",
    });
  });
});
