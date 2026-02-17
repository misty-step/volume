// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const executeCoachToolMock = vi.fn();

vi.mock("@/lib/coach/agent-tools", () => ({
  COACH_TOOL_DEFINITIONS: [],
  executeCoachTool: (...args: unknown[]) => executeCoachToolMock(...args),
}));

function createToolCall(args: {
  name: string;
  arguments: string;
  id?: string;
}) {
  return {
    id: args.id ?? "call_1",
    type: "function",
    function: { name: args.name, arguments: args.arguments },
  };
}

function createRuntimeWithResponses(responses: any[]) {
  const create = vi.fn().mockImplementation(async () => ({
    choices: [{ message: responses.shift() }],
  }));

  const runtime = {
    model: "test-model",
    client: { chat: { completions: { create } } },
  } as any;

  return { runtime, create };
}

describe("runPlannerTurn", () => {
  beforeEach(() => {
    executeCoachToolMock.mockReset();
  });

  it("executes a tool then returns assistant text", async () => {
    const { runPlannerTurn } = await import("./planner");

    executeCoachToolMock.mockResolvedValueOnce({
      summary: "Logged.",
      blocks: [{ type: "status", tone: "success", title: "ok" }],
      outputForModel: { status: "ok" },
    });

    const { runtime, create } = createRuntimeWithResponses([
      {
        content: null,
        tool_calls: [
          createToolCall({
            name: "log_set",
            arguments: JSON.stringify({ exercise_name: "Push-ups", reps: 10 }),
          }),
        ],
      },
      { content: "Done.", tool_calls: [] },
    ]);

    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "10 pushups" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(executeCoachToolMock).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("ok");
    expect(result.assistantText).toBe("Done.");
    expect(result.toolsUsed).toEqual(["log_set"]);
    expect(result.blocks.length).toBe(1);
  });

  it("emits tool_start and tool_result events", async () => {
    const { runPlannerTurn } = await import("./planner");

    executeCoachToolMock.mockResolvedValueOnce({
      summary: "ok",
      blocks: [{ type: "status", tone: "success", title: "ok" }],
      outputForModel: { status: "ok" },
    });

    const { runtime } = createRuntimeWithResponses([
      {
        content: null,
        tool_calls: [
          createToolCall({
            name: "get_today_summary",
            arguments: JSON.stringify({}),
          }),
        ],
      },
      { content: "Summary.", tool_calls: [] },
    ]);

    const events: any[] = [];
    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "show today's summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
      emitEvent: (event) => events.push(event),
    });

    expect(result.kind).toBe("ok");
    expect(events.map((e) => e.type)).toEqual(["tool_start", "tool_result"]);
    expect(events[0].toolName).toBe("get_today_summary");
  });

  it("avoids emitting duplicate tool_result events when tools stream blocks", async () => {
    const { runPlannerTurn } = await import("./planner");

    executeCoachToolMock.mockImplementationOnce(
      async (
        _toolName: unknown,
        _args: unknown,
        _ctx: unknown,
        options: any
      ) => {
        options?.onBlocks?.([
          { type: "status", tone: "info", title: "partial" },
        ]);
        return {
          summary: "ok",
          blocks: [{ type: "status", tone: "success", title: "final" }],
          outputForModel: { status: "ok" },
        };
      }
    );

    const { runtime } = createRuntimeWithResponses([
      {
        content: null,
        tool_calls: [
          createToolCall({
            name: "get_today_summary",
            arguments: JSON.stringify({}),
          }),
        ],
      },
      { content: "Done.", tool_calls: [] },
    ]);

    const events: any[] = [];
    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "show today's summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
      emitEvent: (event) => events.push(event),
    });

    expect(result.kind).toBe("ok");
    const toolResultEvents = events.filter(
      (event) => event.type === "tool_result"
    );
    expect(toolResultEvents).toHaveLength(1);
    expect(toolResultEvents[0]?.blocks?.[0]?.title).toBe("partial");
  });

  it("adds error blocks when tool execution throws", async () => {
    const { runPlannerTurn } = await import("./planner");

    executeCoachToolMock.mockRejectedValueOnce(new Error("boom"));

    const { runtime } = createRuntimeWithResponses([
      {
        content: null,
        tool_calls: [
          createToolCall({
            name: "log_set",
            arguments: JSON.stringify({ exercise_name: "Push-ups", reps: 10 }),
          }),
        ],
      },
      { content: "Ok.", tool_calls: [] },
    ]);

    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "10 pushups" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
    });

    expect(result.kind).toBe("ok");
    expect(result.blocks[0]).toMatchObject({ type: "status", tone: "error" });
  });

  it("returns an error when the model returns no message", async () => {
    const { runPlannerTurn } = await import("./planner");

    const create = vi.fn().mockResolvedValue({ choices: [] });
    const runtime = {
      model: "test-model",
      client: { chat: { completions: { create } } },
    } as any;

    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "hello" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
    });

    expect(result.kind).toBe("error");
    expect(result.errorMessage).toBe("Model returned no message");
  });

  it("adds error blocks when tool args are invalid JSON", async () => {
    const { runPlannerTurn } = await import("./planner");

    const { runtime } = createRuntimeWithResponses([
      {
        content: null,
        tool_calls: [
          createToolCall({
            name: "log_set",
            arguments: "{not-json",
          }),
        ],
      },
      { content: "Ok.", tool_calls: [] },
    ]);

    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "10 pushups" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
    });

    expect(result.kind).toBe("ok");
    expect(result.toolsUsed).toEqual(["log_set"]);
    expect(result.blocks[0]).toMatchObject({ type: "status", tone: "error" });
  });

  it("returns an error when aborted before running", async () => {
    const { runPlannerTurn } = await import("./planner");

    const controller = new AbortController();
    controller.abort(new Error("test_abort"));

    const { runtime, create } = createRuntimeWithResponses([]);

    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "hello" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
      signal: controller.signal,
    });

    expect(create).not.toHaveBeenCalled();
    expect(result.kind).toBe("error");
    expect(result.errorMessage).toContain("Planner aborted");
  });

  it("aborts before executing tools if the signal is cancelled after model response", async () => {
    const { runPlannerTurn } = await import("./planner");

    const controller = new AbortController();

    const create = vi.fn().mockImplementation(async () => {
      controller.abort("mid_round");
      return {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                createToolCall({
                  name: "get_today_summary",
                  arguments: JSON.stringify({}),
                }),
              ],
            },
          },
        ],
      };
    });

    const runtime = {
      model: "test-model",
      client: { chat: { completions: { create } } },
    } as any;

    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "hello" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
      signal: controller.signal,
    });

    expect(executeCoachToolMock).not.toHaveBeenCalled();
    expect(result.kind).toBe("error");
    expect(result.errorMessage).toContain("Planner aborted");
  });

  it("stops after MAX_TOOL_ROUNDS and reports step limit", async () => {
    const { runPlannerTurn } = await import("./planner");

    executeCoachToolMock.mockResolvedValue({
      summary: "ok",
      blocks: [],
      outputForModel: { status: "ok" },
    });

    // Always return a tool call so the planner hits the round cap.
    const responses = Array.from({ length: 6 }, () => ({
      content: null,
      tool_calls: [
        createToolCall({
          name: "get_today_summary",
          arguments: JSON.stringify({}),
        }),
      ],
    }));

    const { runtime, create } = createRuntimeWithResponses(responses);

    const result = await runPlannerTurn({
      runtime,
      history: [{ role: "user", content: "loop" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: { convex: {} as any, defaultUnit: "lbs", timezoneOffsetMinutes: 0 },
    });

    expect(create).toHaveBeenCalledTimes(6);
    expect(result.kind).toBe("ok");
    expect(result.hitToolLimit).toBe(true);
    expect(
      result.blocks.some(
        (b) => b.type === "status" && b.title === "Step limit reached"
      )
    ).toBe(true);
  });
});
