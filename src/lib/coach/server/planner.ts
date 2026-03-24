import {
  streamText,
  stepCountIs,
  type AssistantModelMessage,
  type ModelMessage,
  type ToolModelMessage,
} from "ai";
import { COACH_AGENT_SYSTEM_PROMPT } from "@/lib/coach/agent-prompt";
import { catalog } from "@/lib/coach/catalog";
import { normalizeAssistantText } from "./blocks";
import { createCoachTools } from "./coach-tools";
import type { ToolExecutionRecord } from "@/lib/coach/presentation/types";
import type { CoachToolContext } from "@/lib/coach/tools/types";
import type { CoachRuntime } from "./runtime";

export type ResponseMessage = AssistantModelMessage | ToolModelMessage;

export type PlannerRunResult =
  | {
      kind: "ok";
      assistantText: string;
      toolsUsed: string[];
      hitToolLimit: boolean;
      responseMessages: ResponseMessage[];
      toolResults: ToolExecutionRecord[];
    }
  | {
      kind: "error";
      assistantText: string;
      toolsUsed: string[];
      errorMessage: string;
      hitToolLimit: boolean;
      responseMessages: ResponseMessage[];
      toolResults: ToolExecutionRecord[];
    };

const MAX_TOOL_ROUNDS = 5;
const MODEL_CALL_TIMEOUT_MS = 30_000;

/** Custom catalog rules that guide the model's JSONL generation. */
const CATALOG_CUSTOM_RULES = [
  "When a tool returns `_uiBlocks`, convert each block to the matching json-render component. " +
    "Map the block `type` to the catalog component name: status→Status, metrics→Metrics, " +
    "trend→Trend, table→Table, suggestions→Suggestions, entity_list→EntityList, " +
    "detail_panel→DetailPanel, billing_panel→BillingPanel, quick_log_form→QuickLogForm, " +
    "confirmation→Confirmation, client_action→ClientAction, undo→Undo.",
  "Preserve ALL data values exactly (IDs, numbers, strings). Never invent or modify actionId, turnId, or payload values.",
  "After all tools complete, append a Suggestions component with 2-3 contextual follow-up prompts based on what the user most likely wants next.",
  "ClientAction components are invisible side-effects — always emit them when present in _uiBlocks.",
];
export function buildPlannerSystemPrompt({
  preferences,
  conversationSummary,
}: {
  preferences: {
    unit: string;
    soundEnabled: boolean;
  };
  conversationSummary?: string | null;
}) {
  const promptUnit = preferences.unit === "kg" ? "kg" : "lbs";
  const promptSound = preferences.soundEnabled ? "enabled" : "disabled";
  const summarySection =
    typeof conversationSummary === "string" && conversationSummary.trim()
      ? `\n\nConversation summary:\n${conversationSummary.trim()}`
      : "";
  const catalogPrompt = catalog.prompt({
    mode: "inline",
    customRules: CATALOG_CUSTOM_RULES,
  });

  return `${COACH_AGENT_SYSTEM_PROMPT}

User local prefs:
- default weight unit: ${promptUnit}
- tactile sounds: ${promptSound}${summarySection}

${catalogPrompt}`;
}

/**
 * Build a single end-of-turn suggestions block based on which tools ran.
 * Returns null if no suggestions are warranted (e.g., no tools ran and the
 * model just chatted).
 */
export function buildEndOfTurnSuggestions(
  toolsUsed: string[]
): string[] | null {
  const set = new Set(toolsUsed);

  if (set.has("log_sets")) {
    return [
      "show today's summary",
      "what should I work on today?",
      "show trend for pushups",
    ];
  }

  if (set.has("query_exercise")) {
    return ["10 pushups", "show today's summary", "show analytics overview"];
  }

  if (set.has("query_workouts")) {
    return [
      "what should I work on today?",
      "show trend for pushups",
      "show analytics overview",
    ];
  }

  if (set.has("get_insights")) {
    return ["show today's summary", "show trend for pushups", "10 pushups"];
  }

  if (set.has("modify_set")) {
    return ["show history overview", "show today's summary"];
  }

  if (set.has("manage_exercise") || set.has("get_exercise_library")) {
    return [
      "show exercise library",
      "show today's summary",
      "show history overview",
    ];
  }

  if (set.has("get_report_history")) {
    return [
      "show today's summary",
      "show history overview",
      "show exercise library",
    ];
  }

  if (set.has("update_settings")) {
    return [
      "show today's summary",
      "what should I work on today?",
      "show analytics overview",
    ];
  }

  if (set.has("show_workspace")) {
    return [
      "show today's summary",
      "10 pushups",
      "what should I work on today?",
    ];
  }

  if (toolsUsed.length === 0) return null;

  return ["show today's summary", "what should I work on today?"];
}

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
  conversationSummary,
  preferences,
  ctx,
  signal,
}: {
  runtime: CoachRuntime;
  history: ModelMessage[];
  conversationSummary?: string | null;
  preferences: {
    unit: string;
    soundEnabled: boolean;
    timezoneOffsetMinutes?: number;
  };
  ctx: CoachToolContext;
  signal?: AbortSignal;
}): Promise<PlannerRunResult> {
  const toolsUsed: string[] = [];
  const toolResults: ToolExecutionRecord[] = [];

  if (signal?.aborted) {
    return {
      kind: "error",
      assistantText: "",
      toolsUsed,
      errorMessage: formatAbortMessage(signal.reason),
      hitToolLimit: false,
      responseMessages: [],
      toolResults,
    };
  }

  const seenToolCallIds = new Set<string>();
  const systemPrompt = buildPlannerSystemPrompt({
    preferences,
    conversationSummary,
  });

  const tools = createCoachTools(ctx, {
    onToolResult: (record) => {
      toolResults.push(record);
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
        }
      },
      abortSignal: modelAbortSignal,
    });

    const [text, steps, finishReason, response] = await Promise.all([
      result.text,
      result.steps,
      result.finishReason,
      result.response,
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

    return {
      kind: "ok",
      assistantText,
      toolsUsed,
      hitToolLimit,
      responseMessages: response.messages,
      toolResults,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown planner error";
    return {
      kind: "error",
      assistantText: "",
      toolsUsed,
      errorMessage: message,
      hitToolLimit: false,
      responseMessages: [],
      toolResults,
    };
  }
}
