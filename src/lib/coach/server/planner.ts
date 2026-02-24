import { streamText, stepCountIs } from "ai";
import { z } from "zod";
import { COACH_AGENT_SYSTEM_PROMPT } from "@/lib/coach/agent-prompt";
import { CoachBlockSchema } from "@/lib/coach/schema";
import type { CoachBlock, CoachStreamEvent } from "@/lib/coach/schema";
import { normalizeAssistantText } from "./blocks";
import { BLOCKS_HANDLED_FLAG, createCoachTools } from "./coach-tools";
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
const ToolResultOutputSchema = z.object({ blocks: z.array(CoachBlockSchema) });

function isBlocksHandledOutput(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  return (value as Record<string, unknown>)[BLOCKS_HANDLED_FLAG] === true;
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
    const timeoutSignal = AbortSignal.timeout(MODEL_CALL_TIMEOUT_MS);
    const modelAbortSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    const result = streamText({
      model: runtime.model,
      system: systemPrompt,
      messages: history,
      tools,
      stopWhen: stepCountIs(MAX_TOOL_ROUNDS),
      onChunk: ({ chunk }) => {
        if (chunk.type === "tool-call") {
          toolsUsed.push(chunk.toolName);
          emitEvent?.({ type: "tool_start", toolName: chunk.toolName });
        }
        if (chunk.type === "tool-result") {
          if (isBlocksHandledOutput(chunk.output)) return;

          const outputResult = ToolResultOutputSchema.safeParse(chunk.output);
          if (outputResult.success) {
            blocks.push(...outputResult.data.blocks);
            emitEvent?.({
              type: "tool_result",
              toolName: chunk.toolName,
              blocks: outputResult.data.blocks,
            });
          } else {
            const toolBlocks: CoachBlock[] = [
              {
                type: "status",
                tone: "error",
                title: `Tool ${chunk.toolName} returned unexpected output`,
                description: "The tool result was not in the expected format.",
              },
            ];
            blocks.push(...toolBlocks);
            emitEvent?.({
              type: "tool_result",
              toolName: chunk.toolName,
              blocks: toolBlocks,
            });
          }
        }
      },
      abortSignal: modelAbortSignal,
    });

    const [text, steps] = await Promise.all([result.text, result.steps]);
    const normalizedText = normalizeAssistantText(text);
    const hitToolLimit = steps.length >= MAX_TOOL_ROUNDS && !normalizedText;
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
