import OpenAI from "openai";
import { COACH_AGENT_SYSTEM_PROMPT } from "@/lib/coach/agent-prompt";
import {
  COACH_TOOL_DEFINITIONS,
  executeCoachTool,
  type CoachToolContext,
} from "@/lib/coach/agent-tools";
import type { CoachBlock, CoachStreamEvent } from "@/lib/coach/schema";
import { normalizeAssistantText, toolErrorBlocks } from "./blocks";
import type { PlannerRuntime } from "./runtime";

// Limit to prevent infinite loops while allowing multi-step plans.
const MAX_TOOL_ROUNDS = 6;

type PlannerRunResult =
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

function safeParseToolArgs(
  raw: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, error: "Tool arguments were not valid JSON." };
  }
}

export async function runPlannerTurn({
  runtime,
  history,
  preferences,
  ctx,
  emitEvent,
}: {
  runtime: PlannerRuntime;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  preferences: {
    unit: string;
    soundEnabled: boolean;
    timezoneOffsetMinutes?: number;
  };
  ctx: CoachToolContext;
  emitEvent?: (event: CoachStreamEvent) => void;
}): Promise<PlannerRunResult> {
  const toolsUsed: string[] = [];
  const blocks: CoachBlock[] = [];
  let assistantText = "";
  let hitToolLimit = false;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const completion = await runtime.client.chat.completions.create({
        model: runtime.model,
        messages: [
          {
            role: "system",
            content: `${COACH_AGENT_SYSTEM_PROMPT}

User local prefs:
- default weight unit: ${preferences.unit}
- tactile sounds: ${preferences.soundEnabled ? "enabled" : "disabled"}
`,
          },
          ...history,
        ],
        tools:
          COACH_TOOL_DEFINITIONS as unknown as OpenAI.Chat.Completions.ChatCompletionTool[],
        tool_choice: "auto",
      });

      const assistantMessage = completion.choices[0]?.message;
      if (!assistantMessage) {
        throw new Error("Model returned no message");
      }

      const toolCalls = (assistantMessage.tool_calls ?? []).filter(
        (call) => call.type === "function"
      );

      if (toolCalls.length === 0) {
        assistantText = normalizeAssistantText(assistantMessage.content);
        break;
      }

      history.push({
        role: "assistant",
        content: assistantMessage.content ?? "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        const toolName = call.function.name;
        toolsUsed.push(toolName);
        emitEvent?.({ type: "tool_start", toolName });

        const parsedArgs = safeParseToolArgs(call.function.arguments);
        if (!parsedArgs.ok) {
          const errorBlocks = toolErrorBlocks(
            `${parsedArgs.error} (tool: ${toolName})`
          );
          blocks.push(...errorBlocks);
          emitEvent?.({ type: "tool_result", toolName, blocks: errorBlocks });
          history.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({
              status: "error",
              tool: toolName,
              error: parsedArgs.error,
            }),
          });
          continue;
        }

        try {
          let streamed = false;
          const onBlocks = emitEvent
            ? (nextBlocks: CoachBlock[]) => {
                streamed = true;
                emitEvent({
                  type: "tool_result",
                  toolName,
                  blocks: nextBlocks,
                });
              }
            : undefined;
          const result = await executeCoachTool(
            toolName,
            parsedArgs.value,
            ctx,
            {
              onBlocks,
            }
          );
          blocks.push(...result.blocks);
          if (emitEvent && !streamed) {
            emitEvent({ type: "tool_result", toolName, blocks: result.blocks });
          }
          history.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result.outputForModel),
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : `Tool ${toolName} failed`;
          const errorBlocks = toolErrorBlocks(message);
          blocks.push(...errorBlocks);
          emitEvent?.({ type: "tool_result", toolName, blocks: errorBlocks });
          history.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({
              status: "error",
              tool: toolName,
              error: message,
            }),
          });
        }
      }

      if (round === MAX_TOOL_ROUNDS - 1) {
        hitToolLimit = true;
        assistantText =
          assistantText ||
          "I hit a step limit while finishing that. Here is what I have so far.";
        blocks.push({
          type: "status",
          tone: "info",
          title: "Step limit reached",
          description:
            "I stopped early to avoid an infinite tool loop. Ask a follow-up and I will continue.",
        });
        break;
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown planner error";
    return {
      kind: "error",
      assistantText,
      blocks,
      toolsUsed,
      errorMessage: message,
      hitToolLimit,
    };
  }

  return { kind: "ok", assistantText, blocks, toolsUsed, hitToolLimit };
}
