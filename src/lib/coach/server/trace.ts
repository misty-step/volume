import type { ModelMessage } from "ai";
import type { CoachTraceData } from "@/lib/coach/ui-message";
import type { PlannerRunResult } from "@/lib/coach/server/planner";

function countUserTurns(history: ModelMessage[]): number {
  return Math.max(
    0,
    history.filter((message) => message.role === "user").length - 1
  );
}

function extractFirstLoggedExercise(
  plannerResult: PlannerRunResult
): string | null {
  for (const result of plannerResult.toolResults) {
    if (result.toolName !== "log_sets") continue;

    const directExercise = result.outputForModel.exercise_name;
    if (typeof directExercise === "string" && directExercise.trim()) {
      return directExercise;
    }

    const nestedResults = result.outputForModel.results;
    if (!Array.isArray(nestedResults)) continue;

    for (const nestedResult of nestedResults) {
      if (!nestedResult || typeof nestedResult !== "object") continue;
      const exerciseName = (nestedResult as Record<string, unknown>)
        .exercise_name;
      if (typeof exerciseName === "string" && exerciseName.trim()) {
        return exerciseName;
      }
    }
  }

  return null;
}

export function buildCoachTraceData({
  sessionId,
  history,
  plannerResult,
}: {
  sessionId?: string;
  history: ModelMessage[];
  plannerResult: PlannerRunResult;
}): CoachTraceData {
  return {
    session_id: sessionId ?? null,
    tool_calls_count: plannerResult.toolsUsed.length,
    turn_index: countUserTurns(history),
    first_logged_exercise: extractFirstLoggedExercise(plannerResult),
  };
}
