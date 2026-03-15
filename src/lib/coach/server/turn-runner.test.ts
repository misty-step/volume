import { describe, expect, it, vi } from "vitest";
import { buildRuntimeUnavailableResponse } from "./blocks";

const runPlannerTurnMock = vi.fn();
vi.mock("./planner", () => ({
  runPlannerTurn: (args: unknown) => runPlannerTurnMock(args),
}));

describe("runCoachTurn", () => {
  it("returns the runtime-unavailable response without invoking the planner", async () => {
    runPlannerTurnMock.mockReset();

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
      timeoutMs: 25,
    });

    expect(response).toEqual(buildRuntimeUnavailableResponse());
    expect(runPlannerTurnMock).not.toHaveBeenCalled();
  });

  it("returns planner failure response for error with no tools used", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "error",
      assistantText: "",
      toolsUsed: [],
      errorMessage: "planner exploded",
      hitToolLimit: false,
      responseMessages: [],
    });

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
      timeoutMs: 25,
    });

    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.toolsUsed).toEqual([]);
  });

  it("returns the successful planner response", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "ok",
      assistantText: "Summary ready.",
      toolsUsed: ["get_today_summary"],
      hitToolLimit: false,
      responseMessages: [{ role: "assistant", content: "Summary ready." }],
    });

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
      timeoutMs: 25,
    });

    expect(response.assistantText).toBe("Summary ready.");
    expect(response.trace.model).toBe("mock-model-id");
    expect(response.trace.fallbackUsed).toBe(false);
    expect(response.trace.toolsUsed).toEqual(["get_today_summary"]);
    expect(response.responseMessages).toEqual([
      { role: "assistant", content: "Summary ready." },
    ]);
  });

  it("forwards the conversation summary into the planner call", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "ok",
      assistantText: "Summary ready.",
      toolsUsed: [],
      hitToolLimit: false,
      responseMessages: [],
    });

    const { runCoachTurn } = await import("./turn-runner");

    await runCoachTurn({
      runtime: { model: {}, modelId: "mock-model-id" } as never,
      history: [{ role: "user", content: "summary" }],
      conversationSummary:
        "Earlier: user logged chest work and reviewed recovery.",
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 0,
      },
      ctx: {} as never,
      requestSignal: new AbortController().signal,
      timeoutMs: 25,
    });

    expect(runPlannerTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationSummary:
          "Earlier: user logged chest work and reviewed recovery.",
      })
    );
  });

  it("treats aborted no-tool planner failures as full failures", async () => {
    runPlannerTurnMock.mockReset();
    const requestController = new AbortController();
    runPlannerTurnMock.mockImplementation(async () => {
      requestController.abort("client_aborted");
      return {
        kind: "error",
        assistantText: "",
        toolsUsed: [],
        errorMessage: "planner exploded",
        hitToolLimit: false,
        responseMessages: [],
      };
    });

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
      timeoutMs: 25,
    });

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
          toolsUsed: [],
          errorMessage: "Planner aborted: client_aborted",
          hitToolLimit: false,
          responseMessages: [],
        };
      }
    );

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
      timeoutMs: 25,
    });

    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.toolsUsed).toEqual([]);
  });

  it("returns a partial failure response when tools already ran", async () => {
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "error",
      assistantText: "",
      toolsUsed: ["get_today_summary"],
      errorMessage: "planner exploded",
      hitToolLimit: false,
      responseMessages: [{ role: "assistant", content: "partial" }],
    });

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
      timeoutMs: 25,
    });

    expect(response.assistantText).toContain(
      "I hit an error while finishing that."
    );
    expect(response.trace.model).toBe("mock-model-id (planner_failed_partial)");
    expect(response.trace.toolsUsed).toEqual(["get_today_summary"]);
    expect(response.responseMessages).toEqual([
      { role: "assistant", content: "partial" },
    ]);
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
    });

    await vi.advanceTimersByTimeAsync(COACH_TURN_TIMEOUT_MS);
    const response = await responsePromise;
    vi.useRealTimers();

    expect(response.trace.model).toBe("mock-model-id (planner_failed)");
    expect(response.trace.toolsUsed).toEqual([]);
  });
});
