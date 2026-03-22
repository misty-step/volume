// @vitest-environment node

import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("buildPlannerSystemPrompt", () => {
  it("includes the stored conversation summary when provided", async () => {
    const { buildPlannerSystemPrompt } = await import("./planner");

    const prompt = buildPlannerSystemPrompt({
      preferences: { unit: "lbs", soundEnabled: true },
      conversationSummary:
        "Earlier conversation: user logged push-ups and checked analytics.",
    });

    expect(prompt).toContain("Conversation summary:");
    expect(prompt).toContain("user logged push-ups and checked analytics");
  });

  it("omits the conversation summary section when not provided", async () => {
    const { buildPlannerSystemPrompt } = await import("./planner");

    const prompt = buildPlannerSystemPrompt({
      preferences: { unit: "kg", soundEnabled: false },
    });

    expect(prompt).not.toContain("Conversation summary:");
    expect(prompt).toContain("default weight unit: kg");
    expect(prompt).toContain("tactile sounds: disabled");
    expect(prompt).toContain("You are a UI generator that outputs JSON");
    expect(prompt).toContain("When a tool returns `_uiBlocks`");
  });

  it("requires 2-3 contextual suggestions after tool calls", async () => {
    const { buildPlannerSystemPrompt } = await import("./planner");

    const prompt = buildPlannerSystemPrompt({
      preferences: { unit: "lbs", soundEnabled: true },
    });

    expect(prompt).toContain(
      "append a Suggestions component with 2-3 contextual follow-up prompts"
    );
  });
});

describe("buildEndOfTurnSuggestions", () => {
  it.each([
    [
      ["log_sets"],
      [
        "show today's summary",
        "what should I work on today?",
        "show trend for pushups",
      ],
    ],
    [
      ["query_exercise"],
      ["10 pushups", "show today's summary", "show analytics overview"],
    ],
    [
      ["query_workouts"],
      [
        "what should I work on today?",
        "show trend for pushups",
        "show analytics overview",
      ],
    ],
    [
      ["get_insights"],
      ["show today's summary", "show trend for pushups", "10 pushups"],
    ],
    [["modify_set"], ["show history overview", "show today's summary"]],
    [
      ["manage_exercise"],
      [
        "show exercise library",
        "show today's summary",
        "show history overview",
      ],
    ],
    [
      ["get_exercise_library"],
      [
        "show exercise library",
        "show today's summary",
        "show history overview",
      ],
    ],
    [
      ["get_report_history"],
      [
        "show today's summary",
        "show history overview",
        "show exercise library",
      ],
    ],
    [
      ["update_settings"],
      [
        "show today's summary",
        "what should I work on today?",
        "show analytics overview",
      ],
    ],
    [
      ["show_workspace"],
      ["show today's summary", "10 pushups", "what should I work on today?"],
    ],
  ])("maps %j to contextual suggestions", async (toolsUsed, expected) => {
    const { buildEndOfTurnSuggestions } = await import("./planner");

    expect(buildEndOfTurnSuggestions(toolsUsed)).toEqual(expected);
  });

  it("returns null when no tools ran", async () => {
    const { buildEndOfTurnSuggestions } = await import("./planner");

    expect(buildEndOfTurnSuggestions([])).toBeNull();
  });

  it("includes stored memories when provided", async () => {
    const { buildPlannerSystemPrompt } = await import("./planner");

    const prompt = buildPlannerSystemPrompt({
      preferences: { unit: "lbs", soundEnabled: true },
      memories: [
        {
          category: "injury",
          content: "Left shoulder impingement. Avoid heavy overhead pressing.",
          source: "fact_extractor",
          createdAt: 1,
        },
        {
          category: "goal",
          content: "Training for a half marathon in June.",
          source: "explicit_user",
          createdAt: 2,
        },
      ],
      observations: [
        "The user is prioritizing consistency and protecting their left shoulder.",
      ],
    });

    expect(prompt).toContain("What I Know About You");
    expect(prompt).toContain("Left shoulder impingement");
    expect(prompt).toContain("Training for a half marathon");
    expect(prompt).toContain("Recent Long-Term Observations");
  });
});

describe("runPlannerTurn", () => {
  beforeEach(() => {
    mockLogSetExecute.mockReset();
    mockGetTodaySummaryExecute.mockReset();
  });

  it("executes a tool then returns assistant text", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockLogSetExecute.mockResolvedValue({
      summary: "logged",
      blocks: [
        { type: "status", tone: "success", title: "Logged", description: "ok" },
      ],
      outputForModel: { status: "ok" },
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("log_sets", {
            action: "log_set",
            set: { exercise_name: "Push-ups", reps: 10 },
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Done."), rawCall: {} };
    });

    const result = await runPlannerTurn({ runtime, ...DEFAULT_ARGS });

    expect(result.kind).toBe("ok");
    expect(result.assistantText).toBe("Done.");
    expect(result.toolsUsed).toEqual(["log_sets"]);
    expect(mockLogSetExecute).toHaveBeenCalledTimes(1);
    // responseMessages captures the full tool interaction for multi-turn context
    expect(Array.isArray(result.responseMessages)).toBe(true);
    expect(result.responseMessages.length).toBeGreaterThan(0);
    expect(result.toolResults).toEqual([
      expect.objectContaining({
        toolName: "log_sets",
        summary: "logged",
        outputForModel: { status: "ok" },
      }),
    ]);
  });

  it("supports canonical log_sets tool calls", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockLogSetExecute.mockResolvedValue({
      summary: "logged",
      blocks: [
        { type: "status", tone: "success", title: "Logged", description: "ok" },
      ],
      outputForModel: { status: "ok" },
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("log_sets", {
            action: "log_set",
            set: { exercise_name: "Push-ups", reps: 12 },
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Done."), rawCall: {} };
    });

    const result = await runPlannerTurn({ runtime, ...DEFAULT_ARGS });

    expect(result.kind).toBe("ok");
    expect(result.toolsUsed).toEqual(["log_sets"]);
    expect(mockLogSetExecute).toHaveBeenCalledWith(
      { exercise_name: "Push-ups", reps: 12 },
      expect.objectContaining({ turnId: "turn-test" }),
      undefined
    );
  });

  it("supports canonical query_workouts tool calls", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks: [],
      outputForModel: { status: "ok" },
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("query_workouts", {
            action: "today_summary",
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Summary."), rawCall: {} };
    });

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      history: [{ role: "user", content: "what did I do today" }],
    });

    expect(result.kind).toBe("ok");
    expect(result.toolsUsed).toEqual(["query_workouts"]);
    expect(mockGetTodaySummaryExecute).toHaveBeenCalledTimes(1);
  });

  it("tracks toolsUsed without emitting SSE events", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks: [],
      outputForModel: { status: "ok" },
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("query_workouts", {
            action: "today_summary",
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Summary."), rawCall: {} };
    });

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      history: [{ role: "user", content: "show today's summary" }],
    });

    expect(result.kind).toBe("ok");
    expect(result.toolsUsed).toContain("query_workouts");
  });

  it("deduplicates repeated tool-call chunks by toolCallId", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks: [],
      outputForModel: { status: "ok" },
    });

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: duplicateToolCallStream("query_workouts", {
            action: "today_summary",
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Summary."), rawCall: {} };
    });

    const result = await runPlannerTurn({
      runtime,
      ...DEFAULT_ARGS,
      history: [{ role: "user", content: "show today's summary" }],
    });

    expect(result.kind).toBe("ok");
    expect(result.toolsUsed).toEqual(["query_workouts"]);
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
    expect(result.responseMessages).toEqual([]);
    expect(result.toolResults).toEqual([]);
  });

  it("records tool name in toolsUsed when a tool throws", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockLogSetExecute.mockRejectedValue(new Error("tool failed"));

    let callCount = 0;
    const runtime = makeRuntime(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          stream: toolCallStream("log_sets", {
            sets: [{ exercise_name: "Squats", reps: 5 }],
          }),
          rawCall: {},
        };
      }
      return { stream: textStream("Done."), rawCall: {} };
    });

    const result = await runPlannerTurn({ runtime, ...DEFAULT_ARGS });

    expect(result.kind).toBe("ok");
    expect(result.toolsUsed).toContain("log_sets");
  });

  it("stops after MAX_TOOL_ROUNDS and reports step limit", async () => {
    const { runPlannerTurn } = await import("./planner");

    mockGetTodaySummaryExecute.mockResolvedValue({
      summary: "summary",
      blocks: [],
      outputForModel: { status: "ok" },
    });

    // Model always returns a tool call -> forces the loop
    const runtime = makeRuntime(async () => ({
      stream: toolCallStream("query_workouts", {
        action: "today_summary",
      }),
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
          stream: toolCallStream("query_workouts", {
            action: "today_summary",
          }),
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
  });
});
