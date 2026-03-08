import { describe, expect, it, vi } from "vitest";
import { buildRuntimeUnavailableResponse } from "./blocks";

const runPlannerTurnMock = vi.fn();
vi.mock("./planner", () => ({
  runPlannerTurn: (args: unknown) => runPlannerTurnMock(args),
}));

describe("runCoachTurn", () => {
  it("returns the runtime-unavailable response without invoking the planner", async () => {
    runPlannerTurnMock.mockReset();
    const events: unknown[] = [];

    const { runCoachTurn } = await import("./turn-runner");

    const response = await runCoachTurn({
      runtime: null,
      history: [{ role: "user", content: "show today's summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: new AbortController().signal,
      emitEvent: (event) => events.push(event),
      timeoutMs: 25,
    });

    expect(response).toEqual(buildRuntimeUnavailableResponse());
    expect(events).toEqual([{ type: "start", model: "runtime-unavailable" }]);
    expect(runPlannerTurnMock).not.toHaveBeenCalled();
  });

  it("shares planner failure orchestration across transports", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "error",
      assistantText: "",
      blocks: [],
      toolsUsed: [],
      errorMessage: "planner exploded",
      hitToolLimit: false,
      responseMessages: [],
    });
    const events: unknown[] = [];

    const { runCoachTurn } = await import("./turn-runner");

    const response = await runCoachTurn({
      runtime: { model: {}, modelId: "mock-model-id" } as never,
      history: [{ role: "user", content: "summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: new AbortController().signal,
      emitEvent: (event) => events.push(event),
      timeoutMs: 25,
    });

    expect(events).toEqual([
      { type: "start", model: "mock-model-id" },
      { type: "error", message: "planner exploded" },
    ]);
    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.toolsUsed).toEqual([]);
  });

  it("returns the successful planner response unchanged", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "ok",
      assistantText: "Summary ready.",
      blocks: [
        {
          type: "metrics",
          title: "Today",
          metrics: [{ label: "Sets", value: "3" }],
        },
      ],
      toolsUsed: ["get_today_summary"],
      hitToolLimit: false,
      responseMessages: [{ role: "assistant", content: "Summary ready." }],
    });
    const events: unknown[] = [];

    const { runCoachTurn } = await import("./turn-runner");

    const response = await runCoachTurn({
      runtime: { model: {}, modelId: "mock-model-id" } as never,
      history: [{ role: "user", content: "summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: new AbortController().signal,
      emitEvent: (event) => events.push(event),
      timeoutMs: 25,
    });

    expect(events).toEqual([{ type: "start", model: "mock-model-id" }]);
    expect(response.assistantText).toBe("Summary ready.");
    expect(response.trace.model).toBe("mock-model-id");
    expect(response.trace.fallbackUsed).toBe(false);
    expect(response.trace.toolsUsed).toEqual(["get_today_summary"]);
    expect(response.responseMessages).toEqual([
      { role: "assistant", content: "Summary ready." },
    ]);
    expect(response.blocks).toEqual([
      {
        type: "metrics",
        title: "Today",
        metrics: [{ label: "Sets", value: "3" }],
      },
    ]);
  });

  it("treats aborted no-tool planner failures as full failures", async () => {
    runPlannerTurnMock.mockReset();
    const requestController = new AbortController();
    runPlannerTurnMock.mockImplementation(async () => {
      requestController.abort("client_aborted");
      return {
        kind: "error",
        assistantText: "",
        blocks: [],
        toolsUsed: [],
        errorMessage: "planner exploded",
        hitToolLimit: false,
        responseMessages: [],
      };
    });
    const events: unknown[] = [];

    const { runCoachTurn } = await import("./turn-runner");

    const response = await runCoachTurn({
      runtime: { model: {}, modelId: "mock-model-id" } as never,
      history: [{ role: "user", content: "summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: requestController.signal,
      emitEvent: (event) => events.push(event),
      timeoutMs: 25,
    });

    expect(events).toEqual([
      { type: "start", model: "mock-model-id" },
      { type: "error", message: "planner exploded" },
    ]);
    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.toolsUsed).toEqual([]);
  });

  it("propagates pre-aborted request signals into the planner signal", async () => {
    runPlannerTurnMock.mockReset();
    const requestController = new AbortController();
    requestController.abort("client_aborted");
    runPlannerTurnMock.mockImplementation(
      async ({ signal }: { signal: AbortSignal }) => {
        expect(signal.aborted).toBe(true);
        expect(signal.reason).toBe("client_aborted");
        return {
          kind: "error",
          assistantText: "",
          blocks: [],
          toolsUsed: [],
          errorMessage: "Planner aborted: client_aborted",
          hitToolLimit: false,
          responseMessages: [],
        };
      }
    );
    const events: unknown[] = [];

    const { runCoachTurn } = await import("./turn-runner");

    const response = await runCoachTurn({
      runtime: { model: {}, modelId: "mock-model-id" } as never,
      history: [{ role: "user", content: "summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: requestController.signal,
      emitEvent: (event) => events.push(event),
      timeoutMs: 25,
    });

    expect(events).toEqual([
      { type: "start", model: "mock-model-id" },
      { type: "error", message: "Planner aborted: client_aborted" },
    ]);
    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.toolsUsed).toEqual([]);
  });

  it("returns a partial failure response when tools already ran", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "error",
      assistantText: "",
      blocks: [
        {
          type: "metrics",
          title: "Today",
          metrics: [{ label: "Sets", value: "1" }],
        },
      ],
      toolsUsed: ["get_today_summary"],
      errorMessage: "planner exploded",
      hitToolLimit: false,
      responseMessages: [{ role: "assistant", content: "partial" }],
    });
    const events: unknown[] = [];

    const { runCoachTurn } = await import("./turn-runner");

    const response = await runCoachTurn({
      runtime: { model: {}, modelId: "mock-model-id" } as never,
      history: [{ role: "user", content: "summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: new AbortController().signal,
      emitEvent: (event) => events.push(event),
      timeoutMs: 25,
    });

    expect(events).toEqual([
      { type: "start", model: "mock-model-id" },
      { type: "error", message: "planner exploded" },
    ]);
    expect(response.assistantText).toBe(
      "I hit an error while finishing that. Here's what I have so far."
    );
    expect(response.trace.model).toBe("mock-model-id (planner_failed_partial)");
    expect(response.trace.toolsUsed).toEqual(["get_today_summary"]);
    expect(response.responseMessages).toEqual([
      { role: "assistant", content: "partial" },
    ]);
    expect(response.blocks.at(-1)).toEqual({
      type: "metrics",
      title: "Today",
      metrics: [{ label: "Sets", value: "1" }],
    });
  });

  it("uses the default timeout to abort a stalled planner turn", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockImplementation(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((resolve) => {
          signal.addEventListener(
            "abort",
            () =>
              resolve({
                kind: "error",
                assistantText: "",
                blocks: [],
                toolsUsed: [],
                errorMessage:
                  signal.reason instanceof Error
                    ? signal.reason.message
                    : String(signal.reason ?? "planner aborted"),
                hitToolLimit: false,
                responseMessages: [],
              }),
            { once: true }
          );
        })
    );
    vi.useFakeTimers();
    const events: unknown[] = [];

    const { COACH_TURN_TIMEOUT_MS, runCoachTurn } =
      await import("./turn-runner");

    const responsePromise = runCoachTurn({
      runtime: { model: {}, modelId: "mock-model-id" } as never,
      history: [{ role: "user", content: "summary" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: new AbortController().signal,
      emitEvent: (event) => events.push(event),
    });

    await vi.advanceTimersByTimeAsync(COACH_TURN_TIMEOUT_MS);
    const response = await responsePromise;
    vi.useRealTimers();

    expect(events).toEqual([
      { type: "start", model: "mock-model-id" },
      { type: "error", message: "Turn timed out" },
    ]);
    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.toolsUsed).toEqual([]);
    expect(response.blocks[0]).toEqual({
      type: "status",
      tone: "error",
      title: "Tool execution failed",
      description: "Turn timed out",
    });
  });
});
