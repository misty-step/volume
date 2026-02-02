/**
 * AI Prompts Tests
 *
 * Tests for prompt generation functions.
 */

import { describe, it, expect } from "vitest";
import { systemPrompt, formatCreativePrompt } from "./prompts";
import type { AICreativeContext } from "./reportSchema";

describe("systemPrompt", () => {
  it("is a non-empty string", () => {
    expect(typeof systemPrompt).toBe("string");
    expect(systemPrompt.length).toBeGreaterThan(0);
  });

  it("includes JSON schema structure", () => {
    expect(systemPrompt).toContain("prCelebration");
    expect(systemPrompt).toContain("prEmptyMessage");
    expect(systemPrompt).toContain("action");
    expect(systemPrompt).toContain("directive");
    expect(systemPrompt).toContain("rationale");
  });

  it("specifies directive tone rule", () => {
    expect(systemPrompt).toContain("Directive tone");
    expect(systemPrompt).toContain('not "consider adding"');
  });

  it("specifies one action rule", () => {
    expect(systemPrompt).toContain("ONE action only");
  });
});

describe("formatCreativePrompt", () => {
  it("formats context with PR", () => {
    const context: AICreativeContext = {
      hasPR: true,
      exerciseName: "Bench Press",
      prType: "weight",
      value: "225 lbs",
      improvement: "+10 lbs",
      progression: "185 → 205 → 225 lbs",
      volumeTrend: "up 15%",
      muscleBalance: "Push heavy, legs light",
      workoutFrequency: 4,
    };

    const result = formatCreativePrompt(context);

    expect(result).toContain("hasPR: true");
    expect(result).toContain("exerciseName: Bench Press");
    expect(result).toContain("prType: weight");
    expect(result).toContain("value: 225 lbs");
    expect(result).toContain("improvement: +10 lbs");
    expect(result).toContain("progression: 185 → 205 → 225 lbs");
    expect(result).toContain("volumeTrend: up 15%");
    expect(result).toContain("muscleBalance: Push heavy, legs light");
    expect(result).toContain("workoutFrequency: 4 days this week");
    expect(result).toContain("Generate celebration/message and action.");
  });

  it("formats context without PR", () => {
    const context: AICreativeContext = {
      hasPR: false,
      volumeTrend: "stable",
      muscleBalance: "Balanced",
      workoutFrequency: 3,
    };

    const result = formatCreativePrompt(context);

    expect(result).toContain("hasPR: false");
    expect(result).toContain("volumeTrend: stable");
    expect(result).toContain("muscleBalance: Balanced");
    expect(result).toContain("workoutFrequency: 3 days this week");

    // Should NOT contain PR-specific fields
    expect(result).not.toContain("exerciseName:");
    expect(result).not.toContain("prType:");
    expect(result).not.toContain("improvement:");
  });

  it("handles reps PR type", () => {
    const context: AICreativeContext = {
      hasPR: true,
      exerciseName: "Pull-ups",
      prType: "reps",
      value: "15 reps",
      improvement: "+3 reps",
      progression: "10 → 12 → 15 reps",
      volumeTrend: "up 10%",
      muscleBalance: "Upper dominant",
      workoutFrequency: 5,
    };

    const result = formatCreativePrompt(context);

    expect(result).toContain("prType: reps");
    expect(result).toContain("value: 15 reps");
  });

  it("handles missing optional fields gracefully", () => {
    const context: AICreativeContext = {
      hasPR: true,
      exerciseName: "Squat",
      prType: "weight",
      value: "315 lbs",
      improvement: "+20 lbs",
      // progression is optional
      volumeTrend: "up 20%",
      muscleBalance: "Leg focused",
      workoutFrequency: 3,
    };

    const result = formatCreativePrompt(context);

    expect(result).toContain("exerciseName: Squat");
    expect(result).toContain("progression: undefined");
  });

  it("wraps context in XML-style tags", () => {
    const context: AICreativeContext = {
      hasPR: false,
      volumeTrend: "down 5%",
      muscleBalance: "Push dominant",
      workoutFrequency: 2,
    };

    const result = formatCreativePrompt(context);

    expect(result).toContain("<context>");
    expect(result).toContain("</context>");
  });
});
