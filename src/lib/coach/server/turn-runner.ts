import type {
  CoachPreferences,
  CoachStreamEvent,
  CoachTurnResponse,
} from "@/lib/coach/schema";
import { sanitizeError } from "@/lib/coach/sanitize-error";
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
  conversationSummary?: string | null;
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
}: {
  plannerResult: PlannerRunResult;
  modelId: string;
}): CoachTurnResponse {
  if (plannerResult.kind === "error" && plannerResult.toolsUsed.length === 0) {
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
  conversationSummary,
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
  if (requestSignal.aborted) {
    abortHandler();
  } else {
    requestSignal.addEventListener("abort", abortHandler);
  }

  try {
    const plannerResult = await runPlannerTurn({
      runtime,
      history,
      conversationSummary,
      preferences,
      ctx,
      emitEvent,
      signal: turnController.signal,
    });

    if (plannerResult.kind === "error") {
      const safeErrorMessage = sanitizeError(plannerResult.errorMessage);
      send({
        type: "error",
        message: safeErrorMessage,
      });

      return buildPlannerResultResponse({
        plannerResult: {
          ...plannerResult,
          errorMessage: safeErrorMessage,
        },
        modelId: runtime.modelId,
      });
    }

    return buildPlannerResultResponse({
      plannerResult,
      modelId: runtime.modelId,
    });
  } finally {
    clearTimeout(timeoutId);
    requestSignal.removeEventListener("abort", abortHandler);
  }
}
