// @vitest-environment node

import { tool } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachBlock } from "@/lib/coach/schema";

// ---------------------------------------------------------------------------
// Mock createCoachTools — tools call Convex, so we stub the whole factory.
// ---------------------------------------------------------------------------

const mockLogSetExecute = vi.fn();
const mockGetTodaySummaryExecute = vi.fn();

vi.mock("./coach-tools", () => ({
  createCoachTools: () => ({
    log_set: tool({
      description: "Log a set",
      inputSchema: z.object({
        exercise_name: z.string(),
        reps: z.number().optional(),
        duration_seconds: z.number().optional(),
        weight: z.number().optional(),
        unit: z.enum(["lbs", "kg"]).optional(),
      }),
      execute: mockLogSetExecute,
    }),
    get_today_summary: tool({
      description: "Get today summary",
      inputSchema: z.object({}),
      execute: mockGetTodaySummaryExecute,
    }),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUCCESS_BLOCKS: CoachBlock[] = [
  { type: "status", tone: "success", title: "Logged", description: "ok" },
];

function makeRuntime(
  streamFn:
    | (() => Promise<{
        stream: ReturnType<typeof simulateReadableStream>;
        rawCall?: unknown;
      }>)
    | Array<{
        stream: ReturnType<typeof simulateReadableStream>;
        rawCall?: unknown;
      }>
) {
  return {
    model: new MockLanguageModelV3({ doStream: streamFn as any }),
    modelId: "test-model",
  };
}

function toolCallStream(toolName: string, input: Record<string, unknown>) {
  return simulateReadableStream({
    chunks: [
      {
        type: "tool-call" as const,
        toolCallId: "tc-1",
        toolName,
        input: JSON.stringify(input),
      },
      {
        type: "finish" as const,
        finishReason: { unified: "tool-calls" as const, raw: null },
        usage: {
          inputTokens: { total: 10, other: {} },
          outputTokens: { total: 5, other: {} },
        },
      },
    ],
  });
}

function textStream(text: string) {
  return simulateReadableStream({
    chunks: [
      { type: "text-start" as const, id: "t1" },
      { type: "text-delta" as const, id: "t1", delta: text },
      { type: "text-end" as const, id: "t1" },
      {
        type: "finish" as const,
        finishReason: { unified: "stop" as const, raw: null },
        usage: {
          inputTokens: { total: 10, other: {} },
          outputTokens: { total: 5, other: {} },
        },
      },
    ],
  });
}

const DEFAULT_ARGS = {
  history: [{ role: "user" as const, content: "10 pushups" }],
  preferences: { unit: "lbs", soundEnabled: true, timezoneOffsetMinutes: 0 },
  ctx: {
    convex: {} as any,
    defaultUnit: "lbs" as const,
    timezoneOffsetMinutes: 0,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runPlannerTurn", () => {
  beforeEach(() => {
    mockLogSetExecute.mockReset();
    mockGetTodaySummaryExecute.mockReset();
  });

  it("executes a tool then returns assistant text", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockLogSetExecute.mockResolvedValue({
      blocks: SUCCESS_BLOCKS,
      status: "ok",
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("log_set", {
            exercise_name: "Push-ups",
            reps: 10,
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Done."), rawCall: {} };
    });

    const result = await runPlannerTurn({ runtime, ...DEFAULT_ARGS });

    expect(result.kind).toBe("ok");
    expect(result.assistantText).toBe("Done.");
    expect(result.toolsUsed).toEqual(["log_set"]);
    expect(result.blocks).toEqual(SUCCESS_BLOCKS);
    expect(mockLogSetExecute).toHaveBeenCalledTimes(1);
  });

  it("emits tool_start and tool_result events", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      blocks: SUCCESS_BLOCKS,
      status: "ok",
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("get_today_summary", {}),
          rawCall: {},
        };
      }
      return { stream: textStream("Summary."), rawCall: {} };
    });

    const events: unknown[] = [];
    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      history: [{ role: "user", content: "show today's summary" }],
      emitEvent: (event) => events.push(event),
    });

    expect(result.kind).toBe("ok");
    const types = (events as Array<{ type: string }>).map((e) => e.type);
    expect(types).toContain("tool_start");
    expect(types).toContain("tool_result");
    const toolStart = (
      events as Array<{ type: string; toolName?: string }>
    ).find((e) => e.type === "tool_start");
    expect(toolStart?.toolName).toBe("get_today_summary");
  });

  it("includes blocks from tool results in the final response", async () => {
    const { runPlannerTurn } = await import("./planner");

    const blocks: CoachBlock[] = [
      {
        type: "metrics",
        title: "Today",
        metrics: [{ label: "Sets", value: "5" }],
      },
    ];
    mockGetTodaySummaryExecute.mockResolvedValue({ blocks, status: "ok" });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("get_today_summary", {}),
          rawCall: {},
        };
      }
      return { stream: textStream("Here's your summary."), rawCall: {} };
    });

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      history: [{ role: "user", content: "show today's summary" }],
    });

    expect(result.kind).toBe("ok");
    expect(result.blocks).toEqual(blocks);
  });

  it("returns an error result when the model stream throws", async () => {
    const { runPlannerTurn } = await import("./planner");

    const runtime = makeRuntime(async () => {
      throw new Error("Model failed");
    });

    const result = await runPlannerTurn({ runtime, ...DEFAULT_ARGS });

    // AI SDK wraps the underlying error; just verify the planner surfaces an error kind.
    expect(result.kind).toBe("error");
    expect(result.errorMessage).toBeTruthy();
  });

  it("returns an error when the abort signal is pre-aborted", async () => {
    const { runPlannerTurn } = await import("./planner");

    const controller = new AbortController();
    controller.abort(new Error("test_abort"));

    // Model should never be called — but even if it is, it'll throw
    const runtime = makeRuntime(async () => {
      throw new Error("should not be called");
    });

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      signal: controller.signal,
    });

    expect(result.kind).toBe("error");
  });

  it("stops after MAX_TOOL_ROUNDS and reports step limit", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      blocks: [],
      status: "ok",
    });

    // Model always returns a tool call → forces the loop
    const runtime = makeRuntime(async () => ({
      stream: toolCallStream("get_today_summary", {}),
      rawCall: {},
    }));

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      history: [{ role: "user", content: "loop" }],
    });

    expect(result.kind).toBe("ok");
    expect(result.hitToolLimit).toBe(true);
    expect(
      result.blocks.some(
        (b) => b.type === "status" && b.title === "Step limit reached"
      )
    ).toBe(true);
  });
});
