import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import { COACH_AGENT_SYSTEM_PROMPT } from "@/lib/coach/agent-prompt";
import {
  COACH_TOOL_DEFINITIONS,
  executeCoachTool,
  type CoachToolContext,
} from "@/lib/coach/agent-tools";
import {
  CoachTurnRequestSchema,
  CoachTurnResponseSchema,
  DEFAULT_COACH_SUGGESTIONS,
  type CoachBlock,
  type CoachStreamEvent,
  type CoachTurnResponse,
} from "@/lib/coach/schema";
import { parseCoachIntent } from "@/lib/coach/prototype-intent";

const DEFAULT_COACH_MODEL =
  process.env.COACH_AGENT_MODEL ?? "minimax/minimax-m2.5";
const MAX_TOOL_ROUNDS = 6;
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function getCoachClient(): { client: OpenAI; model: string } | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return {
      client: new OpenAI({
        apiKey: openRouterKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://volume.fitness",
          "X-Title": "Volume Coach",
        },
      }),
      model: DEFAULT_COACH_MODEL,
    };
  }

  return null;
}

function parseToolArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeAssistantText(
  content: OpenAI.Chat.Completions.ChatCompletionMessage["content"]
): string {
  if (typeof content === "string") {
    return content.trim();
  }
  return "";
}

function toolErrorBlocks(message: string): CoachBlock[] {
  return [
    {
      type: "status",
      tone: "error",
      title: "Tool execution failed",
      description: message,
    },
    {
      type: "suggestions",
      prompts: DEFAULT_COACH_SUGGESTIONS,
    },
  ];
}

function wantsEventStream(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
}

function encodeSse(event: CoachStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function encodeSseComment(content: string): string {
  return `:${content}\n\n`;
}

function buildCoachTurnResponse({
  assistantText,
  blocks,
  toolsUsed,
  model,
  fallbackUsed,
}: {
  assistantText: string;
  blocks: CoachBlock[];
  toolsUsed: string[];
  model: string;
  fallbackUsed: boolean;
}): CoachTurnResponse {
  const finalAssistantText = assistantText.trim()
    ? assistantText.trim()
    : "Done. I used your workout data and generated updates below.";
  const finalBlocks =
    blocks.length > 0
      ? blocks
      : [{ type: "suggestions", prompts: DEFAULT_COACH_SUGGESTIONS }];

  return CoachTurnResponseSchema.parse({
    assistantText: finalAssistantText,
    blocks: finalBlocks,
    trace: {
      toolsUsed,
      model,
      fallbackUsed,
    },
  });
}

async function runDeterministicFallback(
  userInput: string,
  ctx: CoachToolContext,
  emitEvent?: (event: CoachStreamEvent) => void
): Promise<CoachTurnResponse> {
  const intent = parseCoachIntent(userInput);
  const toolsUsed: string[] = [];
  let blocks: CoachBlock[] = [];
  let assistantText =
    "I can help with logging, summaries, reports, and focus suggestions.";

  try {
    const callFromIntent: null | { toolName: string; args: unknown } = (() => {
      switch (intent.type) {
        case "log_set":
          return {
            toolName: "log_set",
            args: {
              exercise_name: intent.exerciseName,
              reps: intent.reps,
              duration_seconds: intent.durationSeconds,
              weight: intent.weight,
              unit: intent.unit,
            },
          };
        case "today_summary":
          return { toolName: "get_today_summary", args: {} };
        case "exercise_report":
          return {
            toolName: "get_exercise_report",
            args: { exercise_name: intent.exerciseName },
          };
        case "set_weight_unit":
          return { toolName: "set_weight_unit", args: { unit: intent.unit } };
        case "set_sound":
          return { toolName: "set_sound", args: { enabled: intent.enabled } };
        default:
          return null;
      }
    })();

    if (callFromIntent) {
      toolsUsed.push(callFromIntent.toolName);
      emitEvent?.({ type: "tool_start", toolName: callFromIntent.toolName });
      let streamed = false;
      const onBlocks = emitEvent
        ? (nextBlocks: CoachBlock[]) => {
            streamed = true;
            emitEvent({
              type: "tool_result",
              toolName: callFromIntent.toolName,
              blocks: nextBlocks,
            });
          }
        : undefined;
      const result = await executeCoachTool(
        callFromIntent.toolName,
        callFromIntent.args,
        ctx,
        { onBlocks }
      );
      if (emitEvent && !streamed) {
        emitEvent({
          type: "tool_result",
          toolName: callFromIntent.toolName,
          blocks: result.blocks,
        });
      }
      blocks = result.blocks;
      assistantText = result.summary;
    } else if (
      /\b(work on|focus|improve|today plan|what should i do)\b/i.test(userInput)
    ) {
      toolsUsed.push("get_focus_suggestions");
      emitEvent?.({ type: "tool_start", toolName: "get_focus_suggestions" });
      let streamed = false;
      const onBlocks = emitEvent
        ? (nextBlocks: CoachBlock[]) => {
            streamed = true;
            emitEvent({
              type: "tool_result",
              toolName: "get_focus_suggestions",
              blocks: nextBlocks,
            });
          }
        : undefined;
      const result = await executeCoachTool("get_focus_suggestions", {}, ctx, {
        onBlocks,
      });
      if (emitEvent && !streamed) {
        emitEvent({
          type: "tool_result",
          toolName: "get_focus_suggestions",
          blocks: result.blocks,
        });
      }
      blocks = result.blocks;
      assistantText = result.summary;
    } else {
      blocks = [
        {
          type: "status",
          tone: "info",
          title: "Try a workout command",
          description: "This fallback mode only handles core flows.",
        },
        {
          type: "suggestions",
          prompts: DEFAULT_COACH_SUGGESTIONS,
        },
      ];
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown fallback error";
    blocks = toolErrorBlocks(message);
    assistantText = "Fallback execution failed.";
  }

  return CoachTurnResponseSchema.parse({
    assistantText,
    blocks,
    trace: {
      toolsUsed,
      model: "fallback-deterministic",
      fallbackUsed: true,
    },
  });
}

type PlannerRuntime = { client: OpenAI; model: string };

type PlannerRunResult =
  | {
      kind: "ok";
      assistantText: string;
      blocks: CoachBlock[];
      toolsUsed: string[];
    }
  | {
      kind: "error";
      assistantText: string;
      blocks: CoachBlock[];
      toolsUsed: string[];
      errorMessage: string;
    };

async function runPlannerTurn({
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
        const toolArgs = parseToolArgs(call.function.arguments);
        toolsUsed.push(toolName);
        emitEvent?.({ type: "tool_start", toolName });

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
          const result = await executeCoachTool(toolName, toolArgs, ctx, {
            onBlocks,
          });
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
    };
  }

  return { kind: "ok", assistantText, blocks, toolsUsed };
}

export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_CONVEX_URL" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CoachTurnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

  const context: CoachToolContext = {
    convex,
    defaultUnit: parsed.data.preferences.unit,
    timezoneOffsetMinutes:
      parsed.data.preferences.timezoneOffsetMinutes ??
      new Date().getTimezoneOffset(),
  };

  const latestUserMessage = [...parsed.data.messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) {
    return NextResponse.json(
      { error: "Missing user message" },
      { status: 400 }
    );
  }

  const streamRequested = wantsEventStream(request);
  const runtime = getCoachClient();
  if (streamRequested) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: CoachStreamEvent) => {
          controller.enqueue(encoder.encode(encodeSse(event)));
        };
        const sendComment = (content: string) => {
          controller.enqueue(encoder.encode(encodeSseComment(content)));
        };

        let closed = false;
        const close = () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {
            // ignore close races
          }
        };

        const abortHandler = () => close();
        request.signal.addEventListener("abort", abortHandler);

        try {
          if (!runtime) {
            send({ type: "start", model: "fallback-deterministic" });
            sendComment(" ".repeat(2048));
            const fallbackResponse = await runDeterministicFallback(
              latestUserMessage.content,
              context,
              send
            );
            send({ type: "final", response: fallbackResponse });
            return;
          }

          send({ type: "start", model: runtime.model });
          sendComment(" ".repeat(2048));

          const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            parsed.data.messages.map((message) => ({
              role: message.role,
              content: message.content,
            }));

          const plannerResult = await runPlannerTurn({
            runtime,
            history,
            preferences: parsed.data.preferences,
            ctx: context,
            emitEvent: send,
          });

          if (plannerResult.kind === "error") {
            send({ type: "error", message: plannerResult.errorMessage });
          }

          let response: CoachTurnResponse;
          if (
            plannerResult.kind === "error" &&
            plannerResult.toolsUsed.length === 0
          ) {
            const fallbackResponse = await runDeterministicFallback(
              latestUserMessage.content,
              context
            );
            response = CoachTurnResponseSchema.parse({
              ...fallbackResponse,
              blocks: [
                ...toolErrorBlocks(plannerResult.errorMessage),
                ...fallbackResponse.blocks,
              ],
              trace: {
                ...fallbackResponse.trace,
                model: `${fallbackResponse.trace.model} (planner_failed)`,
              },
            });
          } else {
            const model =
              plannerResult.kind === "error"
                ? `${runtime.model} (planner_failed_partial)`
                : runtime.model;

            const assistantText =
              plannerResult.kind === "error"
                ? "I hit an error while finishing that. Here's what I have so far."
                : plannerResult.assistantText;

            response = buildCoachTurnResponse({
              assistantText,
              blocks:
                plannerResult.kind === "error"
                  ? [
                      ...toolErrorBlocks(plannerResult.errorMessage),
                      ...plannerResult.blocks,
                    ]
                  : plannerResult.blocks,
              toolsUsed: plannerResult.toolsUsed,
              model,
              fallbackUsed: false,
            });
          }

          send({ type: "final", response });
        } finally {
          request.signal.removeEventListener("abort", abortHandler);
          close();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  }

  if (!runtime) {
    const fallbackResponse = await runDeterministicFallback(
      latestUserMessage.content,
      context
    );
    return NextResponse.json(fallbackResponse);
  }

  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    parsed.data.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

  const plannerResult = await runPlannerTurn({
    runtime,
    history,
    preferences: parsed.data.preferences,
    ctx: context,
  });

  if (plannerResult.kind === "error" && plannerResult.toolsUsed.length === 0) {
    const fallbackResponse = await runDeterministicFallback(
      latestUserMessage.content,
      context
    );
    return NextResponse.json(
      CoachTurnResponseSchema.parse({
        ...fallbackResponse,
        blocks: [
          ...toolErrorBlocks(plannerResult.errorMessage),
          ...fallbackResponse.blocks,
        ],
        trace: {
          ...fallbackResponse.trace,
          model: `${fallbackResponse.trace.model} (planner_failed)`,
        },
      } satisfies CoachTurnResponse)
    );
  }

  const response = buildCoachTurnResponse({
    assistantText:
      plannerResult.kind === "error"
        ? "I hit an error while finishing that. Here's what I have so far."
        : plannerResult.assistantText,
    blocks:
      plannerResult.kind === "error"
        ? [
            ...toolErrorBlocks(plannerResult.errorMessage),
            ...plannerResult.blocks,
          ]
        : plannerResult.blocks,
    toolsUsed: plannerResult.toolsUsed,
    model:
      plannerResult.kind === "error"
        ? `${runtime.model} (planner_failed_partial)`
        : runtime.model,
    fallbackUsed: false,
  });

  return NextResponse.json(response);
}
