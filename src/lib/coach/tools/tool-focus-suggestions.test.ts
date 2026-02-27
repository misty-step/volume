import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the Convex generated api
vi.mock("@/../convex/_generated/api", () => ({
  api: {
    analyticsFocus: {
      getFocusSuggestions: "mock_getFocusSuggestions",
    },
  },
}));

import { runFocusSuggestionsTool } from "./tool-focus-suggestions";
import type { CoachToolContext } from "./types";

function makeCtx(queryReturnValue: unknown): CoachToolContext {
  return {
    convex: {
      query: vi.fn().mockResolvedValue(queryReturnValue),
    } as unknown as CoachToolContext["convex"],
    defaultUnit: "lbs",
    timezoneOffsetMinutes: 0,
    turnId: "test-turn",
    userInput: "what should I work on",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runFocusSuggestionsTool", () => {
  it("empty suggestions -> status block 'No major training gaps detected'", async () => {
    const result = await runFocusSuggestionsTool(makeCtx([]));
    const status = result.blocks.find((b) => b.type === "status");
    expect(status).toBeDefined();
    expect((status as { title: string }).title).toMatch(
      /no major training gaps detected/i
    );
  });

  it("empty suggestions -> outputForModel.status==='ok', suggestions is empty array", async () => {
    const result = await runFocusSuggestionsTool(makeCtx([]));
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.suggestions).toEqual([]);
  });

  it("non-empty suggestions -> table block is present", async () => {
    const suggestions = [
      {
        type: "muscle_group",
        priority: "high",
        title: "Train Chest",
        reason: "Chest has not been trained in 7 days",
        suggestedExercises: ["Bench Press"],
      },
    ];
    const result = await runFocusSuggestionsTool(makeCtx(suggestions));
    const table = result.blocks.find((b) => b.type === "table");
    expect(table).toBeDefined();
  });

  it("non-empty suggestions -> suggestions block with prompts", async () => {
    const suggestions = [
      {
        type: "muscle_group",
        priority: "high",
        title: "Train Chest",
        reason: "Chest has not been trained in 7 days",
        suggestedExercises: ["Bench Press"],
      },
    ];
    const result = await runFocusSuggestionsTool(makeCtx(suggestions));
    const suggestionsBlock = result.blocks.find(
      (b) => b.type === "suggestions"
    );
    expect(suggestionsBlock).toBeDefined();
    const prompts = (suggestionsBlock as { prompts: string[] }).prompts;
    expect(prompts.some((p) => p.includes("chest"))).toBe(true);
  });

  it("'Train Chest' title -> prompts include 'show trend for chest'", async () => {
    const suggestions = [
      {
        type: "muscle_group",
        priority: "high",
        title: "Train Chest",
        reason: "Chest has not been trained in 7 days",
      },
    ];
    const result = await runFocusSuggestionsTool(makeCtx(suggestions));
    const suggestionsBlock = result.blocks.find(
      (b) => b.type === "suggestions"
    );
    const prompts = (suggestionsBlock as { prompts: string[] }).prompts;
    expect(prompts).toContain("show trend for chest");
  });

  it("non-empty suggestions -> outputForModel suggestions length matches input", async () => {
    const suggestions = [
      {
        type: "exercise",
        priority: "medium",
        title: "Train Back",
        reason: "Back has not been trained recently",
      },
      {
        type: "exercise",
        priority: "low",
        title: "Train Legs",
        reason: "Legs skipped this week",
      },
    ];
    const result = await runFocusSuggestionsTool(makeCtx(suggestions));
    expect(result.outputForModel.status).toBe("ok");
    const outSuggestions = result.outputForModel.suggestions as unknown[];
    expect(outSuggestions).toHaveLength(2);
  });
});
