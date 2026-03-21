// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  buildRuntimeUnavailableResponse,
  buildPlannerFailedResponse,
  buildCoachTurnResponse,
  normalizeAssistantText,
  toolErrorBlocks,
} from "./blocks";

describe("coach blocks helpers", () => {
  it("normalizes assistant text", () => {
    expect(normalizeAssistantText("  hi  " as any)).toBe("hi");
    expect(normalizeAssistantText(null as any)).toBe("");
  });
});

describe("normalizeAssistantText — <think> stripping", () => {
  it("strips a complete <think> block", () => {
    expect(normalizeAssistantText("<think>reasoning</think>Response")).toBe(
      "Response"
    );
  });
  it("strips multi-paragraph reasoning", () => {
    const input = "<think>Para one.\n\nPara two.</think>Final sentence.";
    expect(normalizeAssistantText(input)).toBe("Final sentence.");
  });
  it("strips unclosed <think> tag (stream cut off)", () => {
    expect(normalizeAssistantText("<think>reasoning cut off")).toBe("");
  });
  it("strips orphaned </think>", () => {
    expect(normalizeAssistantText("orphaned</think>Response")).toBe("Response");
  });
  it("leaves clean text untouched", () => {
    expect(normalizeAssistantText("Nice work!")).toBe("Nice work!");
  });
  it("returns empty string for non-string input", () => {
    expect(normalizeAssistantText(null as any)).toBe("");
  });
});

describe("coach blocks helpers", () => {
  it("builds a response with trimmed assistant text", () => {
    const response = buildCoachTurnResponse({
      assistantText: "   ",
      toolsUsed: [],
      model: "test",
      fallbackUsed: false,
    });

    expect(response.assistantText).toBe("");
    expect(response.trace.toolsUsed).toEqual([]);
  });

  it("preserves assistant text when provided", () => {
    const response = buildCoachTurnResponse({
      assistantText: "Hi.",
      toolsUsed: ["test"],
      model: "test",
      fallbackUsed: false,
    });

    expect(response.assistantText).toBe("Hi.");
    expect(response.trace.toolsUsed).toEqual(["test"]);
  });

  it("passes responseMessages through to response", () => {
    const fakeMessages = [
      { role: "assistant", content: [{ type: "text", text: "hi" }] },
    ];
    const response = buildCoachTurnResponse({
      assistantText: "Hi.",
      toolsUsed: ["test"],
      model: "test",
      fallbackUsed: false,
      responseMessages: fakeMessages,
    });
    expect(response.responseMessages).toEqual(fakeMessages);
  });

  it("creates error UI blocks for tool failures", () => {
    const blocks = toolErrorBlocks("nope");
    expect(blocks[0]).toMatchObject({ type: "status", tone: "error" });
  });

  it("builds explicit runtime-unavailable response without fallback", () => {
    const response = buildRuntimeUnavailableResponse();
    expect(response.assistantText).toBe(
      "I can't process that request right now."
    );
    expect(response.trace.model).toBe("runtime-unavailable");
    expect(response.trace.fallbackUsed).toBe(false);
    expect(response.trace.toolsUsed).toEqual([]);
    expect(response.responseMessages).toEqual([]);
  });

  it("builds planner-failed response with standardized trace", () => {
    const response = buildPlannerFailedResponse({
      modelId: "mock-model-id",
      errorMessage: "planner exploded",
    });

    expect(response.assistantText).toContain(
      "I hit an error while planning this turn."
    );
    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.fallbackUsed).toBe(false);
    expect(response.trace.toolsUsed).toEqual([]);
  });

  it("preserves assistant text in response", () => {
    const response = buildCoachTurnResponse({
      assistantText: "Great work!",
      toolsUsed: ["log_set"],
      model: "test",
      fallbackUsed: false,
    });
    expect(response.assistantText).toBe("Great work!");
  });
});
