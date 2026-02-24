import { streamText, stepCountIs } from "ai";
import { COACH_AGENT_SYSTEM_PROMPT } from "@/lib/coach/agent-prompt";
import type { CoachBlock, CoachStreamEvent } from "@/lib/coach/schema";
import { normalizeAssistantText } from "./blocks";
import { createCoachTools } from "./coach-tools";
import type { CoachToolContext } from "@/lib/coach/tools/types";
import type { CoachRuntime } from "./runtime";

// Keep the same result shape so route.ts doesn't need structural changes.
export type PlannerRunResult =
  | {
      kind: "ok";
      assistantText: string;
      blocks: CoachBlock[];
      toolsUsed: string[];
      hitToolLimit: boolean;
    }
  | {
      kind: "error";
      assistantText: string;
      blocks: CoachBlock[];
      toolsUsed: string[];
      errorMessage: string;
      hitToolLimit: boolean;
    };

const MAX_TOOL_ROUNDS = 5;
const MODEL_CALL_TIMEOUT_MS = 30_000;

function formatAbortMessage(reason: unknown): string {
  if (typeof reason === "string" && reason.trim()) {
    return `Planner aborted: ${reason}`;
  }
  if (reason instanceof Error && reason.message.trim()) {
    return `Planner aborted: ${reason.message}`;
  }
  return "Planner aborted";
}

function createModelAbortSignal(signal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(MODEL_CALL_TIMEOUT_MS);
  if (!signal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([signal, timeoutSignal]);
  }

  const controller = new AbortController();

  const abortFrom = (source: AbortSignal) => {
    if (controller.signal.aborted) return;
    controller.abort(source.reason ?? new Error("Planner aborted"));
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

export async function runPlannerTurn({
  runtime,
  history,
  preferences,
  ctx,
  emitEvent,
  signal,
}: {
  runtime: CoachRuntime;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  preferences: {
    unit: string;
    soundEnabled: boolean;
    timezoneOffsetMinutes?: number;
  };
  ctx: CoachToolContext;
  emitEvent?: (event: CoachStreamEvent) => void;
  signal?: AbortSignal;
}): Promise<PlannerRunResult> {
  const toolsUsed: string[] = [];
  const blocks: CoachBlock[] = [];

  if (signal?.aborted) {
    return {
      kind: "error",
      assistantText: "",
      blocks,
      toolsUsed,
      errorMessage: formatAbortMessage(signal.reason),
      hitToolLimit: false,
    };
  }

  const seenToolCallIds = new Set<string>();
  // Sanitize user preferences before interpolation into the system prompt.
  const promptUnit = preferences.unit === "kg" ? "kg" : "lbs";
  const promptSound = preferences.soundEnabled ? "enabled" : "disabled";

  const systemPrompt = `${COACH_AGENT_SYSTEM_PROMPT}

User local prefs:
- default weight unit: ${promptUnit}
- tactile sounds: ${promptSound}`;

  const tools = createCoachTools(ctx, {
    onBlocks: (toolName, toolBlocks) => {
      blocks.push(...toolBlocks);
      emitEvent?.({
        type: "tool_result",
        toolName,
        blocks: toolBlocks,
      });
    },
  });

  try {
    const modelAbortSignal = createModelAbortSignal(signal);

    const result = streamText({
      model: runtime.model,
      system: systemPrompt,
      messages: history,
      tools,
      stopWhen: stepCountIs(MAX_TOOL_ROUNDS),
      onChunk: ({ chunk }) => {
        if (chunk.type === "tool-call") {
          if (typeof chunk.toolCallId === "string") {
            if (seenToolCallIds.has(chunk.toolCallId)) return;
            seenToolCallIds.add(chunk.toolCallId);
          }
          toolsUsed.push(chunk.toolName);
          emitEvent?.({ type: "tool_start", toolName: chunk.toolName });
        }
      },
      abortSignal: modelAbortSignal,
    });

    const [text, steps, finishReason] = await Promise.all([
      result.text,
      result.steps,
      result.finishReason,
    ]);
    const normalizedText = normalizeAssistantText(text);
    const hitToolLimit =
      !normalizedText &&
      (finishReason === "tool-calls" || steps.length >= MAX_TOOL_ROUNDS);
    const assistantText =
      normalizedText ||
      (hitToolLimit
        ? "I reached the step limit. Ask a follow-up and I'll continue."
        : "");

    if (hitToolLimit) {
      blocks.push({
        type: "status",
        tone: "info",
        title: "Step limit reached",
        description:
          "I stopped early to avoid an infinite tool loop. Ask a follow-up and I will continue.",
      });
    }

    return { kind: "ok", assistantText, blocks, toolsUsed, hitToolLimit };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown planner error";
    return {
      kind: "error",
      assistantText: "",
      blocks,
      toolsUsed,
      errorMessage: message,
      hitToolLimit: false,
    };
  }
}
