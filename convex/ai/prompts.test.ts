import { describe, it, expect } from "vitest";
import { formatUserProfileContext } from "./prompts";

describe("formatUserProfileContext", () => {
  it("returns empty string for undefined preferences", () => {
    expect(formatUserProfileContext(undefined)).toBe("");
  });

  it("returns empty string for null preferences", () => {
    expect(formatUserProfileContext(null)).toBe("");
  });

  it("returns empty string for empty preferences object", () => {
    expect(formatUserProfileContext({})).toBe("");
  });

  it("formats goals correctly", () => {
    const result = formatUserProfileContext({
      goals: ["build_muscle", "get_stronger"],
    });

    expect(result).toContain("Goals: Build muscle, Get stronger");
    expect(result).toContain("<user_profile>");
  });

  it("sanitizes < and > characters from user input", () => {
    const result = formatUserProfileContext({
      customGoal: "<gain> lean mass",
      trainingSplit: "Push > Pull > Legs",
      coachNotes: "Notes < keep it light >",
    });

    expect(result).toContain("Custom target: gain lean mass");
    expect(result).toContain("Training approach: Push  Pull  Legs");
    expect(result).toContain("User notes: Notes  keep it light");
    expect(result).not.toContain("<gain>");
    expect(result).not.toContain("> Pull");
  });

  it("only includes non-empty fields", () => {
    const result = formatUserProfileContext({
      goals: [],
      customGoal: "   ",
      trainingSplit: "Upper/Lower",
      coachNotes: "",
    });

    expect(result).toContain("Training approach: Upper/Lower");
    expect(result).not.toContain("Goals:");
    expect(result).not.toContain("Custom target:");
    expect(result).not.toContain("User notes:");
  });
});
