// @vitest-environment node

import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachBlock } from "@/lib/coach/schema";

// ---------------------------------------------------------------------------
// Mock tool runners so planner tests use real createCoachTools wrapping.
// ---------------------------------------------------------------------------

const mockLogSetExecute = vi.fn();
const mockGetTodaySummaryExecute = vi.fn();

vi.mock("@/lib/coach/tools/tool-log-set", () => ({
  runLogSetTool: (...args: unknown[]) => mockLogSetExecute(...args),
}));

vi.mock("@/lib/coach/tools/tool-today-summary", () => ({
  runTodaySummaryTool: (...args: unknown[]) =>
    mockGetTodaySummaryExecute(...args),
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
        finishReason: "tool-calls" as const,
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
      },
    ],
  });
}

function duplicateToolCallStream(
  toolName: string,
  input: Record<string, unknown>
) {
  return simulateReadableStream({
    chunks: [
      {
        type: "tool-call" as const,
        toolCallId: "tc-dup",
        toolName,
        input: JSON.stringify(input),
      },
      {
        type: "tool-call" as const,
        toolCallId: "tc-dup",
        toolName,
        input: JSON.stringify(input),
      },
      {
        type: "finish" as const,
        finishReason: "tool-calls" as const,
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
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
        finishReason: "stop" as const,
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
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
    turnId: "turn-test",
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
      summary: "logged",
      blocks: SUCCESS_BLOCKS,
      outputForModel: { status: "ok" },
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
      summary: "summary",
      blocks: SUCCESS_BLOCKS,
      outputForModel: { status: "ok" },
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

  it("deduplicates repeated tool-call chunks by toolCallId", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks: SUCCESS_BLOCKS,
      outputForModel: { status: "ok" },
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: duplicateToolCallStream("get_today_summary", {}),
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
    expect(result.toolsUsed).toEqual(["get_today_summary"]);
    const toolStartEvents = (
      events as Array<{ type: string; toolName?: string }>
    ).filter((event) => event.type === "tool_start");
    expect(toolStartEvents).toHaveLength(1);
    expect(toolStartEvents[0]?.toolName).toBe("get_today_summary");
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
    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks,
      outputForModel: { status: "ok" },
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

    let modelCalls = 0;
    const runtime = makeRuntime(async () => {
      modelCalls += 1;
      throw new Error("should not be called");
    });

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      signal: controller.signal,
    });

    expect(modelCalls).toBe(0);
    expect(result.kind).toBe("error");
    expect(result.errorMessage).toContain("Planner aborted");
    expect(result.errorMessage).toContain("test_abort");
  });

  it("emits error block when a tool throws", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockLogSetExecute.mockRejectedValue(new Error("tool failed"));

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("log_set", {
            exercise_name: "Squats",
            reps: 5,
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Done."), rawCall: {} };
    });

    const result = await runPlannerTurn({ runtime, ...DEFAULT_ARGS });

    expect(result.kind).toBe("ok");
    expect(
      result.blocks.some(
        (b) =>
          b.type === "status" && b.tone === "error" && b.title === "Tool failed"
      )
    ).toBe(true);
  });

  it("stops after MAX_TOOL_ROUNDS and reports step limit", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks: [],
      outputForModel: { status: "ok" },
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
    expect(result.assistantText).toBe(
      "I reached the step limit. Ask a follow-up and I'll continue."
    );
    expect(
      result.blocks.some(
        (b) => b.type === "status" && b.title === "Step limit reached"
      )
    ).toBe(true);
  });

  it("does not report step limit when it exits before MAX_TOOL_ROUNDS", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks: [],
      outputForModel: { status: "ok" },
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount <= 4) {
        return {
          stream: toolCallStream("get_today_summary", {}),
          rawCall: {},
        };
      }
      return { stream: textStream("Done."), rawCall: {} };
    });

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      history: [{ role: "user", content: "loop but finish" }],
    });

    expect(result.kind).toBe("ok");
    expect(result.hitToolLimit).toBe(false);
    expect(
      result.blocks.some(
        (b) => b.type === "status" && b.title === "Step limit reached"
      )
    ).toBe(false);
  });
});
