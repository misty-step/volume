import { describe, it, expect } from "vitest";
import { filterFrequencyFromFirstWorkout } from "./analytics-utils";

describe("filterFrequencyFromFirstWorkout", () => {
  const mockData = [
    { date: "2024-10-01", setCount: 0, totalVolume: 0 },
    { date: "2024-10-15", setCount: 5, totalVolume: 500 },
    { date: "2024-10-16", setCount: 3, totalVolume: 300 },
  ];

  it("filters data to start from first workout date (ISO string)", () => {
    // This test exposes the bug: Number("2024-10-15") = NaN
    const result = filterFrequencyFromFirstWorkout(mockData, "2024-10-15");

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2024-10-15");
  });

  it("returns all data when firstWorkoutDate is null", () => {
    const result = filterFrequencyFromFirstWorkout(mockData, null);
    expect(result).toHaveLength(3);
  });

  it("handles empty frequency data", () => {
    const result = filterFrequencyFromFirstWorkout([], "2024-10-15");
    expect(result).toHaveLength(0);
  });
});
