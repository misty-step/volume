/**
 * AI Report Schema Tests
 *
 * Tests for Zod schema validation of AI report structures.
 */

import { describe, it, expect } from "vitest";
import {
  AICreativeOutputSchema,
  AIReportV2Schema,
  type AICreativeOutput,
  type AIReportV2,
  type ReportType,
} from "./reportSchema";

describe("AICreativeOutputSchema", () => {
  it("validates complete output with PR celebration", () => {
    const output: AICreativeOutput = {
      prCelebration: {
        headline: "BENCH PRESS PR!",
        celebrationCopy: "You've been building to this moment.",
        nextMilestone: "At this pace, 250 lbs by March",
      },
      prEmptyMessage: null,
      action: {
        directive: "Add a leg day Wednesday",
        rationale: "Your push volume is 2x your leg volume",
      },
    };

    const result = AICreativeOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("validates output without PR celebration", () => {
    const output: AICreativeOutput = {
      prCelebration: null,
      prEmptyMessage: "No PRs this week, but consistency builds strength.",
      action: {
        directive: "Try progressive overload on squats",
        rationale: "You've hit a plateau at 185 lbs",
      },
    };

    const result = AICreativeOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("requires action directive and rationale", () => {
    const invalid = {
      prCelebration: null,
      prEmptyMessage: null,
      action: {
        directive: "Test", // missing rationale
      },
    };

    const result = AICreativeOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("requires action object", () => {
    const invalid = {
      prCelebration: null,
      prEmptyMessage: null,
      // missing action
    };

    const result = AICreativeOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("AIReportV2Schema", () => {
  const validReportBase = {
    version: "2.0" as const,
    period: {
      type: "weekly" as const,
      startDate: "2024-12-16",
      endDate: "2024-12-22",
      label: "Dec 16-22, 2024",
    },
    metrics: {
      volume: { value: "24,500", unit: "lbs" },
      workouts: { value: 4 },
      streak: { value: 7 },
    },
    action: {
      directive: "Add a leg day Wednesday",
      rationale: "Your push volume is 2x your leg volume",
    },
  };

  it("validates complete report with PR", () => {
    const report: AIReportV2 = {
      ...validReportBase,
      pr: {
        hasPR: true,
        exercise: "Bench Press",
        type: "weight",
        value: "225 lbs",
        previousBest: "215 lbs",
        improvement: "+10 lbs",
        progression: "185 → 205 → 225 lbs",
        headline: "BENCH PRESS PR!",
        celebrationCopy: "You've been building to this.",
        nextMilestone: "250 lbs by March",
      },
    };

    const result = AIReportV2Schema.safeParse(report);
    expect(result.success).toBe(true);
  });

  it("validates report without PR", () => {
    const report: AIReportV2 = {
      ...validReportBase,
      pr: {
        hasPR: false,
        emptyMessage: "No PRs this week, but consistency builds strength.",
      },
    };

    const result = AIReportV2Schema.safeParse(report);
    expect(result.success).toBe(true);
  });

  it("validates all report types", () => {
    const types: ReportType[] = ["daily", "weekly", "monthly"];

    for (const type of types) {
      const report = {
        ...validReportBase,
        period: { ...validReportBase.period, type },
        pr: { hasPR: false },
      };

      const result = AIReportV2Schema.safeParse(report);
      expect(result.success).toBe(true);
    }
  });

  it("enforces discriminated union - PR fields required when hasPR is true", () => {
    const invalid = {
      ...validReportBase,
      pr: {
        hasPR: true,
        // Missing required PR fields: exercise, type, value, etc.
      },
    };

    const result = AIReportV2Schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid version", () => {
    const invalid = {
      ...validReportBase,
      version: "1.0", // Invalid - must be "2.0"
      pr: { hasPR: false },
    };

    const result = AIReportV2Schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid period type", () => {
    const invalid = {
      ...validReportBase,
      period: { ...validReportBase.period, type: "yearly" }, // Invalid
      pr: { hasPR: false },
    };

    const result = AIReportV2Schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid PR type", () => {
    const invalid = {
      ...validReportBase,
      pr: {
        hasPR: true,
        exercise: "Bench Press",
        type: "speed", // Invalid - must be "weight" or "reps"
        value: "225 lbs",
        previousBest: "215 lbs",
        improvement: "+10 lbs",
      },
    };

    const result = AIReportV2Schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("Type exports", () => {
  it("exports AICreativeOutput type", () => {
    const output: AICreativeOutput = {
      prCelebration: null,
      prEmptyMessage: "Test",
      action: { directive: "Test", rationale: "Test" },
    };
    expect(output.action.directive).toBe("Test");
  });

  it("exports AIReportV2 type", () => {
    const report: AIReportV2 = {
      version: "2.0",
      period: {
        type: "daily",
        startDate: "2024-01-01",
        endDate: "2024-01-01",
        label: "Jan 1, 2024",
      },
      metrics: {
        volume: { value: "1,000", unit: "lbs" },
        workouts: { value: 1 },
        streak: { value: 1 },
      },
      pr: { hasPR: false },
      action: { directive: "Test", rationale: "Test" },
    };
    expect(report.version).toBe("2.0");
  });

  it("exports ReportType type", () => {
    const types: ReportType[] = ["daily", "weekly", "monthly"];
    expect(types).toContain("weekly");
  });
});
