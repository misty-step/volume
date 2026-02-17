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

  it("builds a minimal response when assistant text or blocks are empty", () => {
    const response = buildCoachTurnResponse({
      assistantText: "   ",
      blocks: [],
      toolsUsed: [],
      model: "test",
      fallbackUsed: false,
    });

    expect(response.assistantText).toContain("Done");
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

  it("creates error UI blocks for tool failures", () => {
    const blocks = toolErrorBlocks("nope");
    expect(blocks[0]).toMatchObject({ type: "status", tone: "error" });
    expect(blocks[1]).toMatchObject({ type: "suggestions" });
  });
});
