import { describe, expect, it } from "vitest";
import { parseCoachIntent, normalizeExerciseLookup } from "./prototype-intent";

describe("parseCoachIntent", () => {
  it("parses reps-first log commands", () => {
    expect(parseCoachIntent("10 pushups")).toEqual({
      type: "log_set",
      exerciseName: "Push-ups",
      reps: 10,
      weight: undefined,
      unit: undefined,
    });
  });

  it("parses weighted logs", () => {
    expect(parseCoachIntent("5 squats @ 225 lbs")).toEqual({
      type: "log_set",
      exerciseName: "Squats",
      reps: 5,
      weight: 225,
      unit: "lbs",
    });
  });

  it("parses duration commands", () => {
    expect(parseCoachIntent("plank for 2 min")).toEqual({
      type: "log_set",
      exerciseName: "Plank",
      durationSeconds: 120,
      weight: undefined,
      unit: undefined,
    });
  });

  it("parses summary requests", () => {
    expect(parseCoachIntent("show today's summary")).toEqual({
      type: "today_summary",
    });
  });

  it("parses exercise report requests", () => {
    expect(parseCoachIntent("show trend for pullups")).toEqual({
      type: "exercise_report",
      exerciseName: "Pull-ups",
    });
  });

  it("parses unit change commands", () => {
    expect(parseCoachIntent("set weight unit to kg")).toEqual({
      type: "set_weight_unit",
      unit: "kg",
    });
  });

  it("parses shorthand unit change commands", () => {
    expect(parseCoachIntent("switch me to lbs")).toEqual({
      type: "set_weight_unit",
      unit: "lbs",
    });
  });

  it("parses sound setting commands", () => {
    expect(parseCoachIntent("turn sound off")).toEqual({
      type: "set_sound",
      enabled: false,
    });
  });

  it("returns unknown for unsupported input", () => {
    expect(parseCoachIntent("hello coach")).toEqual({
      type: "unknown",
      input: "hello coach",
    });
  });
});

describe("normalizeExerciseLookup", () => {
  it("normalizes punctuation and spaces", () => {
    expect(normalizeExerciseLookup("Push-Ups")).toBe("pushups");
    expect(normalizeExerciseLookup("Pull ups")).toBe("pullups");
  });
});
