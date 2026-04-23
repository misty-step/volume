import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import { buildCoachTraceData } from "./trace";
import type { PlannerRunResult } from "./planner";

function makePlannerResult(
  overrides?: Partial<PlannerRunResult>
): PlannerRunResult {
  return {
    kind: "ok",
    assistantText: "Done",
    toolsUsed: [],
    hitToolLimit: false,
    responseMessages: [],
    toolResults: [],
    ...overrides,
  };
}

describe("buildCoachTraceData", () => {
  const history: ModelMessage[] = [{ role: "user", content: "log 10 pushups" }];

  it("counts user turns from history", () => {
    const trace = buildCoachTraceData({
      sessionId: "session_123",
      history,
      plannerResult: makePlannerResult({ toolsUsed: ["query_workouts"] }),
    });

    expect(trace.turn_index).toBe(0);
    expect(trace.tool_calls_count).toBe(1);
    expect(trace.session_id).toBe("session_123");
  });

  it("extracts the exercise name from single log_set output", () => {
    const trace = buildCoachTraceData({
      sessionId: "session_123",
      history,
      plannerResult: makePlannerResult({
        toolsUsed: ["log_sets"],
        toolResults: [
          {
            toolName: "log_sets",
            input: { action: "log_set" },
            summary: "Logged set",
            outputForModel: {
              status: "ok",
              exercise_name: "Push-ups",
            },
            legacyBlocks: [],
          },
        ],
      }),
    });

    expect(trace.first_logged_exercise).toBe("Push-ups");
  });

  it("extracts the first exercise name from bulk_log output", () => {
    const trace = buildCoachTraceData({
      sessionId: "session_123",
      history,
      plannerResult: makePlannerResult({
        toolsUsed: ["log_sets"],
        toolResults: [
          {
            toolName: "log_sets",
            input: { action: "bulk_log" },
            summary: "Logged sets",
            outputForModel: {
              status: "ok",
              results: [
                { exercise_name: "Push-ups" },
                { exercise_name: "Squat" },
              ],
            },
            legacyBlocks: [],
          },
        ],
      }),
    });

    expect(trace.first_logged_exercise).toBe("Push-ups");
  });
});
