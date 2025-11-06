import { describe, it, expect } from "vitest";
import {
  validateReps,
  validateWeight,
  validateUnit,
  validateDuration,
  validateExerciseName,
} from "./validate";

describe("validateReps", () => {
  it("accepts valid integers 1-1000", () => {
    expect(() => validateReps(1)).not.toThrow();
    expect(() => validateReps(500)).not.toThrow();
    expect(() => validateReps(1000)).not.toThrow();
  });

  it("rejects decimals", () => {
    expect(() => validateReps(5.5)).toThrow("whole number");
    expect(() => validateReps(10.1)).toThrow("whole number");
  });

  it("rejects out-of-bounds values", () => {
    expect(() => validateReps(0)).toThrow();
    expect(() => validateReps(-5)).toThrow();
    expect(() => validateReps(1001)).toThrow();
  });

  it("rejects non-finite values", () => {
    expect(() => validateReps(NaN)).toThrow();
    expect(() => validateReps(Infinity)).toThrow();
  });
});

describe("validateWeight", () => {
  it("returns undefined for undefined input", () => {
    expect(validateWeight(undefined)).toBeUndefined();
  });

  it("rounds to 2 decimal places", () => {
    expect(validateWeight(22.555)).toBe(22.56);
    expect(validateWeight(99.999)).toBe(100);
    expect(validateWeight(10.1234)).toBe(10.12);
  });

  it("accepts minimum weight 0.1", () => {
    expect(validateWeight(0.1)).toBe(0.1);
  });

  it("rejects values below 0.1", () => {
    expect(() => validateWeight(0)).toThrow("between 0.1 and 10000");
    expect(() => validateWeight(0.05)).toThrow("between 0.1 and 10000");
  });

  it("rejects values above 10000", () => {
    expect(() => validateWeight(10001)).toThrow("between 0.1 and 10000");
  });

  it("rejects non-finite values", () => {
    expect(() => validateWeight(NaN)).toThrow();
    expect(() => validateWeight(Infinity)).toThrow();
  });
});

describe("validateUnit", () => {
  it("allows valid units with weight", () => {
    expect(() => validateUnit("lbs", 100)).not.toThrow();
    expect(() => validateUnit("kg", 50)).not.toThrow();
  });

  it("rejects invalid units when weight provided", () => {
    expect(() => validateUnit("pounds", 100)).toThrow();
    expect(() => validateUnit(undefined, 100)).toThrow();
  });

  it("allows no unit when no weight", () => {
    expect(() => validateUnit(undefined, undefined)).not.toThrow();
  });
});

describe("validateDuration", () => {
  it("returns undefined for undefined input", () => {
    expect(validateDuration(undefined)).toBeUndefined();
  });

  it("rounds to nearest second", () => {
    expect(validateDuration(45.4)).toBe(45);
    expect(validateDuration(45.6)).toBe(46);
    expect(validateDuration(60.5)).toBe(61);
  });

  it("accepts valid durations", () => {
    expect(validateDuration(1)).toBe(1);
    expect(validateDuration(60)).toBe(60);
    expect(validateDuration(3600)).toBe(3600);
    expect(validateDuration(86400)).toBe(86400); // 24 hours
  });

  it("rejects zero or negative values", () => {
    expect(() => validateDuration(0)).toThrow(
      "Duration must be between 1 and 86400 seconds"
    );
    expect(() => validateDuration(-10)).toThrow(
      "Duration must be between 1 and 86400 seconds"
    );
  });

  it("rejects values over 24 hours", () => {
    expect(() => validateDuration(86401)).toThrow(
      "Duration must be between 1 and 86400 seconds"
    );
    expect(() => validateDuration(100000)).toThrow(
      "Duration must be between 1 and 86400 seconds"
    );
  });

  it("rejects non-finite values", () => {
    expect(() => validateDuration(NaN)).toThrow();
    expect(() => validateDuration(Infinity)).toThrow();
  });
});

describe("validateExerciseName", () => {
  it("trims whitespace", () => {
    expect(validateExerciseName("  push-ups  ")).toBe("push-ups");
  });

  it("preserves original casing", () => {
    expect(validateExerciseName("Bench Press")).toBe("Bench Press");
    expect(validateExerciseName("bench press")).toBe("bench press");
    expect(validateExerciseName("SQUATS")).toBe("SQUATS");
  });

  it("rejects empty strings", () => {
    expect(() => validateExerciseName("")).toThrow("cannot be empty");
    expect(() => validateExerciseName("   ")).toThrow("cannot be empty");
  });

  it("rejects too short names", () => {
    expect(() => validateExerciseName("a")).toThrow("2-100 characters");
  });

  it("rejects too long names", () => {
    const longName = "a".repeat(101);
    expect(() => validateExerciseName(longName)).toThrow("2-100 characters");
  });
});
