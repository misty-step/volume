// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/coach/agent-tools", () => ({
  executeCoachTool: vi.fn().mockResolvedValue({
    summary: "test summary",
    blocks: [
      { type: "status", tone: "success", title: "Done", description: "" },
    ],
    outputForModel: { status: "ok" },
  }),
}));

import { executeCoachTool } from "@/lib/coach/agent-tools";
import { runDeterministicFallback } from "./fallback";
import { CoachTurnResponseSchema } from "@/lib/coach/schema";
import type { CoachToolContext } from "@/lib/coach/tools/types";

const mockCtx: CoachToolContext = {
  convex: {
    query: vi.fn(),
    mutation: vi.fn(),
  } as unknown as CoachToolContext["convex"],
  defaultUnit: "lbs",
  timezoneOffsetMinutes: 0,
  turnId: "test-turn",
  userInput: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(executeCoachTool).mockResolvedValue({
    summary: "test summary",
    blocks: [
      { type: "status", tone: "success", title: "Done", description: "" },
    ],
    outputForModel: { status: "ok" },
  });
});

describe("runDeterministicFallback", () => {
  it("'today's summary' -> executeCoachTool called with 'get_today_summary'", async () => {
    await runDeterministicFallback("today's summary", mockCtx);
    expect(executeCoachTool).toHaveBeenCalledWith(
      "get_today_summary",
      expect.anything(),
      mockCtx,
      expect.anything()
    );
  });

  it("'hello' (unknown intent) -> result has status block 'Try a workout command'", async () => {
    const result = await runDeterministicFallback("hello", mockCtx);
    const status = result.blocks.find((b) => b.type === "status");
    expect(status).toBeDefined();
    expect((status as { title: string }).title).toMatch(
      /try a workout command/i
    );
    expect(executeCoachTool).not.toHaveBeenCalled();
  });

  it("executeCoachTool throws -> assistantText includes 'failed', blocks have error tone", async () => {
    vi.mocked(executeCoachTool).mockRejectedValue(new Error("tool crashed"));
    // Use a phrase that definitely triggers a tool call
    const result = await runDeterministicFallback("today's summary", mockCtx);
    expect(result.assistantText.toLowerCase()).toContain("failed");
    const errorBlock = result.blocks.find(
      (b) => b.type === "status" && (b as { tone: string }).tone === "error"
    );
    expect(errorBlock).toBeDefined();
  });

  it("trace.fallbackUsed === true always", async () => {
    const result = await runDeterministicFallback("today's summary", mockCtx);
    expect(result.trace.fallbackUsed).toBe(true);
  });

  it("trace.fallbackUsed === true even for unknown intents", async () => {
    const result = await runDeterministicFallback("hello world", mockCtx);
    expect(result.trace.fallbackUsed).toBe(true);
  });

  it("return value passes CoachTurnResponseSchema.parse()", async () => {
    const result = await runDeterministicFallback("today's summary", mockCtx);
    expect(() => CoachTurnResponseSchema.parse(result)).not.toThrow();
  });

  it("'work on' phrase -> calls get_focus_suggestions", async () => {
    await runDeterministicFallback("what should I work on today?", mockCtx);
    expect(executeCoachTool).toHaveBeenCalledWith(
      "get_focus_suggestions",
      expect.anything(),
      mockCtx,
      expect.anything()
    );
  });
});
