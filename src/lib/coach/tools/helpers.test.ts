// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  formatSecondsShort,
  normalizeLookup,
  titleCase,
  uniquePrompts,
} from "./helpers";

describe("helpers", () => {
  describe("normalizeLookup", () => {
    it("lowercases and strips non-alphanumeric characters", () => {
      expect(normalizeLookup("  Push-Ups!!  ")).toBe("pushups");
      expect(normalizeLookup("Bench Press 2.0")).toBe("benchpress20");
    });
  });

  describe("titleCase", () => {
    it("normalizes extra spaces and casing", () => {
      expect(titleCase("   beNCH    press   ")).toBe("Bench Press");
      expect(titleCase("PULL-UPS")).toBe("Pull-ups");
    });
  });

  describe("uniquePrompts", () => {
    it("removes blanks and case-insensitive duplicates while preserving first values", () => {
      expect(
        uniquePrompts([
          "show today's summary",
          " Show today's summary ",
          "",
          "show analytics overview",
          "SHOW ANALYTICS OVERVIEW",
          "show history overview",
        ])
      ).toEqual([
        "show today's summary",
        "show analytics overview",
        "show history overview",
      ]);
    });

    it("caps output at four prompts", () => {
      expect(uniquePrompts(["a", "b", "c", "d", "e", "f"])).toEqual([
        "a",
        "b",
        "c",
        "d",
      ]);
    });
  });

  describe("formatSecondsShort", () => {
    it("formats short durations in seconds", () => {
      expect(formatSecondsShort(45)).toBe("45 sec");
    });

    it("formats whole minutes when divisible by 60", () => {
      expect(formatSecondsShort(120)).toBe("2 min");
    });

    it("falls back to mm:ss format for mixed values", () => {
      expect(formatSecondsShort(125)).toBe("2:05");
    });
  });
});
