import { streamText, stepCountIs } from "ai";
import { z } from "zod";
import { COACH_AGENT_SYSTEM_PROMPT } from "@/lib/coach/agent-prompt";
import { CoachBlockSchema } from "@/lib/coach/schema";
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

  const systemPrompt = `${COACH_AGENT_SYSTEM_PROMPT}

User local prefs:
- default weight unit: ${preferences.unit}
- tactile sounds: ${preferences.soundEnabled ? "enabled" : "disabled"}`;

  const tools = createCoachTools(ctx);

  try {
    const result = streamText({
      model: runtime.model,
      system: systemPrompt,
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools,
      stopWhen: stepCountIs(MAX_TOOL_ROUNDS),
      onChunk: ({ chunk }) => {
        if (chunk.type === "tool-call") {
          toolsUsed.push(chunk.toolName);
          emitEvent?.({ type: "tool_start", toolName: chunk.toolName });
        }
        if (chunk.type === "tool-result") {
          const outputResult = z
            .object({ blocks: z.array(CoachBlockSchema) })
            .safeParse(chunk.output);
          let toolBlocks: CoachBlock[];
          if (outputResult.success) {
            toolBlocks = outputResult.data.blocks;
          } else {
            console.error("[planner] Failed to parse tool output", {
              toolName: chunk.toolName,
            });
            toolBlocks = [
              {
                type: "status",
                tone: "error",
                title: `Tool ${chunk.toolName} returned unexpected output`,
                description: "The tool result was not in the expected format.",
              },
            ];
          }
          blocks.push(...toolBlocks);
          emitEvent?.({
            type: "tool_result",
            toolName: chunk.toolName,
            blocks: toolBlocks,
          });
        }
      },
      abortSignal: signal,
    });

    const [text, steps] = await Promise.all([result.text, result.steps]);
    const hitToolLimit = steps.length >= MAX_TOOL_ROUNDS;
    const assistantText =
      normalizeAssistantText(text) ||
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
