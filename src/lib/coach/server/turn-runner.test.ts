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
});
