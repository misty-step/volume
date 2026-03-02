// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
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
  it("builds a minimal response when assistant text or blocks are empty", () => {
    const response = buildCoachTurnResponse({
      assistantText: "   ",
      blocks: [],
      toolsUsed: [],
      model: "test",
      fallbackUsed: false,
    });

    expect(response.assistantText).toBe("");
    expect(response.blocks[0]?.type).toBe("suggestions");
  });

  it("preserves assistant text and blocks when provided", () => {
    const response = buildCoachTurnResponse({
      assistantText: "Hi.",
      blocks: [
        { type: "status", tone: "info", title: "ok", description: "desc" },
      ],
      toolsUsed: ["test"],
      model: "test",
      fallbackUsed: false,
    });

    expect(response.assistantText).toBe("Hi.");
    expect(response.blocks[0]).toMatchObject({ type: "status" });
  });

  it("passes responseMessages through to response", () => {
    const fakeMessages = [
      { role: "assistant", content: [{ type: "text", text: "hi" }] },
    ];
    const response = buildCoachTurnResponse({
      assistantText: "Hi.",
      blocks: [
        { type: "status", tone: "info", title: "ok", description: "desc" },
      ],
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
    expect(blocks[1]).toMatchObject({ type: "suggestions" });
  });

  it("preserves assistant text even when an undo block is present", () => {
    const response = buildCoachTurnResponse({
      assistantText: "Great work!",
      blocks: [
        {
          type: "undo",
          actionId: "a1",
          turnId: "t1",
          title: "Undo this log",
          description: "Reverts this set.",
        },
      ],
      toolsUsed: ["log_set"],
      model: "test",
      fallbackUsed: false,
    });
    expect(response.assistantText).toBe("Great work!");
    expect(response.blocks[0]).toMatchObject({ type: "undo" });
  });
});
