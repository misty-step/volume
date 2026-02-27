import { describe, expect, it } from "vitest";
import { filterValidMuscleGroups, MUSCLE_GROUPS } from "./muscleGroups";

describe("filterValidMuscleGroups", () => {
  it("empty array -> ['Other']", () => {
    expect(filterValidMuscleGroups([])).toEqual(["Other"]);
  });

  it("all invalid -> ['Other']", () => {
    expect(filterValidMuscleGroups(["garbage", "invalid", "unknown"])).toEqual([
      "Other",
    ]);
  });

  it("all valid -> returns them unchanged", () => {
    expect(filterValidMuscleGroups(["Chest", "Back"])).toEqual([
      "Chest",
      "Back",
    ]);
  });

  it("mixed valid and invalid -> returns only valid ones", () => {
    expect(filterValidMuscleGroups(["Chest", "garbage", "Back"])).toEqual([
      "Chest",
      "Back",
    ]);
  });

  it("case-sensitive: 'chest' is not valid", () => {
    expect(filterValidMuscleGroups(["chest"])).toEqual(["Other"]);
  });

  it("case-sensitive: 'CHEST' is not valid", () => {
    expect(filterValidMuscleGroups(["CHEST"])).toEqual(["Other"]);
  });

  it("single invalid -> ['Other']", () => {
    expect(filterValidMuscleGroups(["garbage"])).toEqual(["Other"]);
  });

  it("'Other' itself is a valid group", () => {
    expect(filterValidMuscleGroups(["Other"])).toEqual(["Other"]);
  });
});

describe("MUSCLE_GROUPS", () => {
  it("contains 'Chest' (capitalized, not lowercase)", () => {
    expect(MUSCLE_GROUPS).toContain("Chest");
    expect(MUSCLE_GROUPS).not.toContain("chest");
  });

  it("contains all expected groups", () => {
    const expected = [
      "Chest",
      "Back",
      "Shoulders",
      "Biceps",
      "Triceps",
      "Quads",
      "Hamstrings",
      "Glutes",
      "Calves",
      "Core",
      "Other",
    ];
    for (const group of expected) {
      expect(MUSCLE_GROUPS).toContain(group);
    }
  });
});
