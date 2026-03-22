import { streamText } from "ai";
import type { CoachRuntime } from "@/lib/coach/server/runtime";
import {
  buildCoachPresentationSystemPrompt,
  buildCoachPresentationUserPrompt,
} from "./prompt";
import type { CoachPresentationContext } from "./types";

const MODEL_CALL_TIMEOUT_MS = 30_000;

function createModelAbortSignal(signal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(MODEL_CALL_TIMEOUT_MS);
  if (!signal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([signal, timeoutSignal]);
  }

  const controller = new AbortController();

  const abortFrom = (source: AbortSignal) => {
    if (controller.signal.aborted) return;
    controller.abort(source.reason ?? new Error("Presentation aborted"));
  };

  if (signal.aborted) {
    abortFrom(signal);
    return controller.signal;
  }

  if (timeoutSignal.aborted) {
    abortFrom(timeoutSignal);
    return controller.signal;
  }

  signal.addEventListener("abort", () => abortFrom(signal), { once: true });
  timeoutSignal.addEventListener("abort", () => abortFrom(timeoutSignal), {
    once: true,
  });

  return controller.signal;
}

export function streamCoachPresentation({
  runtime,
  context,
  signal,
}: {
  runtime: CoachRuntime;
  context: CoachPresentationContext;
  signal?: AbortSignal;
}) {
  return streamText({
    model: runtime.model,
    system: buildCoachPresentationSystemPrompt({
      preferences: context.preferences,
      conversationSummary: context.conversationSummary,
    }),
    messages: [
      {
        role: "user",
        content: buildCoachPresentationUserPrompt(context),
      },
    ],
    abortSignal: createModelAbortSignal(signal),
  });
}
