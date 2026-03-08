import type {
  CoachPreferences,
  CoachStreamEvent,
  CoachTurnResponse,
} from "@/lib/coach/schema";
import type { ModelMessage } from "ai";
import type { CoachToolContext } from "@/lib/coach/tools/types";
import {
  buildCoachTurnResponse,
  buildPlannerFailedResponse,
  buildPlannerPartialFailureResponse,
  buildRuntimeUnavailableResponse,
} from "./blocks";
import { runPlannerTurn, type PlannerRunResult } from "./planner";
import type { CoachRuntime } from "./runtime";

export const COACH_TURN_TIMEOUT_MS = 60_000;

type RunCoachTurnParams = {
  runtime: CoachRuntime | null;
  history: ModelMessage[];
  preferences: CoachPreferences;
  ctx: CoachToolContext;
  requestSignal: AbortSignal;
  emitEvent?: (event: CoachStreamEvent) => void;
  timeoutMs?: number;
};

function abortTurn(controller: AbortController, reason: string | Error) {
  try {
    controller.abort(reason);
  } catch {
    controller.abort();
  }
}

function buildPlannerResultResponse({
  plannerResult,
  modelId,
  aborted,
}: {
  plannerResult: PlannerRunResult;
  modelId: string;
  aborted: boolean;
}): CoachTurnResponse {
  if (
    plannerResult.kind === "error" &&
    plannerResult.toolsUsed.length === 0 &&
    !aborted
  ) {
    return buildPlannerFailedResponse({
      modelId,
      errorMessage: plannerResult.errorMessage,
    });
  }

  if (plannerResult.kind === "error") {
    return buildPlannerPartialFailureResponse({
      modelId,
      errorMessage: plannerResult.errorMessage,
      blocks: plannerResult.blocks,
      toolsUsed: plannerResult.toolsUsed,
      responseMessages: plannerResult.responseMessages,
    });
  }

  return buildCoachTurnResponse({
    assistantText: plannerResult.assistantText,
    blocks: plannerResult.blocks,
    toolsUsed: plannerResult.toolsUsed,
    model: modelId,
    fallbackUsed: false,
    responseMessages: plannerResult.responseMessages,
  });
}

export async function runCoachTurn({
  runtime,
  history,
  preferences,
  ctx,
  requestSignal,
  emitEvent,
  timeoutMs = COACH_TURN_TIMEOUT_MS,
}: RunCoachTurnParams): Promise<CoachTurnResponse> {
  const send = (event: CoachStreamEvent) => emitEvent?.(event);
  send({
    type: "start",
    model: runtime?.modelId ?? "runtime-unavailable",
  });

  if (!runtime) {
    return buildRuntimeUnavailableResponse();
  }

  const turnController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortTurn(turnController, new Error("Turn timed out"));
  }, timeoutMs);
  const abortHandler = () => {
    abortTurn(turnController, "client_aborted");
  };
  requestSignal.addEventListener("abort", abortHandler);

  try {
    const plannerResult = await runPlannerTurn({
      runtime,
      history,
      preferences,
      ctx,
      emitEvent,
      signal: turnController.signal,
    });

    if (plannerResult.kind === "error") {
      send({ type: "error", message: plannerResult.errorMessage });
    }

    return buildPlannerResultResponse({
      plannerResult,
      modelId: runtime.modelId,
      aborted: turnController.signal.aborted,
    });
  } finally {
    clearTimeout(timeoutId);
    requestSignal.removeEventListener("abort", abortHandler);
  }
}
