import { after, NextResponse } from "next/server";
import { pipeJsonRender } from "@json-render/core";
import { reportError } from "@/lib/analytics";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/../convex/_generated/api";
import { CoachPreferencesSchema, MAX_COACH_MESSAGES } from "@/lib/coach/schema";
import { streamCoachPresentation } from "@/lib/coach/presentation/compose";
import {
  sliceRecentWholeTurns,
  type StoredCoachMessage,
} from "@/lib/coach/server/history";
import { getCoachRuntime } from "@/lib/coach/server/runtime";
import {
  buildEndOfTurnSuggestions,
  runPlannerTurn,
} from "@/lib/coach/server/planner";
import {
  extractMemoryOperations,
  selectObservationIdsToKeep,
  summarizeObservation,
  type MemoryTranscriptMessage,
} from "@/lib/coach/server/memory-pipeline";
import { buildRuntimeUnavailableResponse } from "@/lib/coach/server/blocks";
import { sanitizeError } from "@/lib/coach/sanitize-error";
import {
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  type UIMessage,
} from "ai";
import type { Exercise } from "@/types/domain";
import { hasValidE2ETestSession } from "@/lib/e2e/test-session";
import { z } from "zod";
import {
  isObservationMemory,
  type ActiveCoachMemory,
  type PromptCoachMemory,
} from "@/lib/coach/memory";

const CONTEXT_SUMMARY_TRIGGER_MESSAGES = 40;
const CONTEXT_RECENT_MESSAGE_WINDOW = 20;
const MAX_UI_MESSAGE_PAYLOAD_BYTES = 200_000;
const MODEL_CALL_TIMEOUT_MS = 30_000;

type CoachContextState = {
  session: { _id: string; summary?: string };
  summary: string | null;
  messages: StoredCoachMessage[];
};

function deserializeStoredMessage(content: string): ModelMessage | null {
  try {
    return JSON.parse(content) as ModelMessage;
  } catch {
    return null;
  }
}

function serializeUserMessage(text: string): string {
  return JSON.stringify({ role: "user", content: text });
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
    controller.abort(source.reason ?? new Error("Coach request aborted"));
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

function createStatusAssistantResponse(message: string, status: number) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: message });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ status, stream });
}

function buildSummaryPrompt({
  existingSummary,
  messagesToSummarize,
}: {
  existingSummary?: string | null;
  messagesToSummarize: ModelMessage[];
}) {
  const transcript = messagesToSummarize
    .map((message) => JSON.stringify(message))
    .join("\n");
  const priorSummary = existingSummary?.trim()
    ? `Existing summary:\n${existingSummary.trim()}\n\n`
    : "";

  return `${priorSummary}Summarize this workout coach conversation in exactly two sentences. Preserve completed tool outcomes, exercise names, user preferences, and unresolved follow-ups.\n\nTranscript:\n${transcript}`;
}

async function buildCoachHistory({
  convex,
  runtime,
  sessionId,
  fallbackHistory,
  latestUserMessage,
}: {
  convex: ConvexHttpClient;
  runtime: ReturnType<typeof getCoachRuntime>;
  sessionId?: string;
  fallbackHistory: ModelMessage[];
  latestUserMessage: ModelMessage;
}) {
  if (!sessionId) {
    return {
      history: fallbackHistory,
      conversationSummary: undefined as string | undefined,
    };
  }

  let contextState: CoachContextState;
  let allMessages: StoredCoachMessage[];
  try {
    [contextState, allMessages] = (await Promise.all([
      convex.query(api.coachSessions.getSessionMessagesForContext, {
        sessionId: sessionId as never,
      }) as Promise<CoachContextState>,
      convex.query(api.coachSessions.getSessionMessages, {
        sessionId: sessionId as never,
      }) as Promise<StoredCoachMessage[]>,
    ])) as [CoachContextState, StoredCoachMessage[]];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    reportError(err, { route: "coach", operation: "fetch_session_history" });
    // Session read failed — reject rather than falling back to untrusted
    // client-supplied history which could let a crafted transcript influence
    // the model. The only safe fallback is an empty history.
    return {
      history: [latestUserMessage],
      conversationSummary: undefined as string | undefined,
    };
  }

  const unsummarizedMessages = allMessages.filter(
    (message) => message.summarizedAt === undefined
  );
  let conversationSummary = contextState.summary ?? undefined;
  const recentMessages = sliceRecentWholeTurns(
    unsummarizedMessages,
    CONTEXT_RECENT_MESSAGE_WINDOW
  );

  if (
    runtime &&
    unsummarizedMessages.length + 1 > CONTEXT_SUMMARY_TRIGGER_MESSAGES
  ) {
    const messagesToSummarize = unsummarizedMessages.slice(
      0,
      Math.max(0, unsummarizedMessages.length - recentMessages.length)
    );

    if (messagesToSummarize.length > 0) {
      try {
        const { text } = await generateText({
          model: runtime.model,
          messages: [
            {
              role: "user",
              content: buildSummaryPrompt({
                existingSummary: conversationSummary,
                messagesToSummarize: messagesToSummarize
                  .map((message) => deserializeStoredMessage(message.content))
                  .filter(
                    (message): message is ModelMessage => message !== null
                  ),
              }),
            },
          ],
        });

        conversationSummary = text.trim();

        await convex.mutation(api.coachSessions.applySummary, {
          sessionId: sessionId as never,
          summary: conversationSummary,
          summarizeThroughCreatedAt:
            messagesToSummarize[messagesToSummarize.length - 1]!.createdAt,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        reportError(err, { route: "coach", operation: "context_summary" });
      }
    }
  }

  return {
    history: [
      ...recentMessages
        .map((message) => deserializeStoredMessage(message.content))
        .filter((message): message is ModelMessage => message !== null),
      latestUserMessage,
    ],
    conversationSummary,
  };
}

async function persistCoachTurn({
  convex,
  sessionId,
  latestUserText,
  turnId,
  responseMessages,
}: {
  convex: ConvexHttpClient;
  sessionId?: string;
  latestUserText: string;
  turnId: string;
  responseMessages: ModelMessage[];
}) {
  if (!sessionId) {
    return;
  }

  await convex.mutation(api.coachSessions.addMessage, {
    sessionId: sessionId as never,
    role: "user",
    content: serializeUserMessage(latestUserText),
    turnId,
  });

  for (const message of responseMessages) {
    await convex.mutation(api.coachSessions.addMessage, {
      sessionId: sessionId as never,
      role: message.role === "tool" ? "tool" : "assistant",
      content: JSON.stringify(message),
      turnId,
    });
  }
}

function modelMessageToTranscriptMessage(
  message: ModelMessage
): MemoryTranscriptMessage {
  const role =
    message.role === "system"
      ? "assistant"
      : message.role === "tool"
        ? "tool"
        : message.role;

  if (typeof message.content === "string") {
    return {
      role,
      content: message.content,
    };
  }

  if (Array.isArray(message.content)) {
    return {
      role,
      content: message.content
        .map((part) => {
          if ("text" in part && typeof part.text === "string") {
            return part.text;
          }
          return JSON.stringify(part);
        })
        .join("\n"),
    };
  }

  return {
    role,
    content: JSON.stringify(message.content),
  };
}

function hasExplicitManageMemoriesForget(
  responseMessages: ModelMessage[]
): boolean {
  return responseMessages.some((message) => {
    if (!Array.isArray(message.content)) {
      return false;
    }

    return message.content.some((part) => {
      if (
        typeof part !== "object" ||
        part === null ||
        !("type" in part) ||
        !("toolName" in part)
      ) {
        return false;
      }

      if (
        part.type !== "tool-result" ||
        part.toolName !== "manage_memories" ||
        !("output" in part) ||
        typeof part.output !== "object" ||
        part.output === null
      ) {
        return false;
      }

      return "action" in part.output && part.output.action === "forget";
    });
  });
}

async function loadPromptMemory(convex: ConvexHttpClient) {
  try {
    return (await convex.query(api.userMemories.listForPrompt, {})) as {
      memories: PromptCoachMemory[];
      observations: string[];
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    reportError(err, { route: "coach", operation: "load_prompt_memory" });
    return {
      memories: [] as PromptCoachMemory[],
      observations: [] as string[],
    };
  }
}

async function processCoachMemory({
  convex,
  runtime,
  history,
  responseMessages,
}: {
  convex: ConvexHttpClient;
  runtime: ReturnType<typeof getCoachRuntime>;
  history: ModelMessage[];
  responseMessages: ModelMessage[];
}) {
  if (!runtime) {
    return;
  }

  try {
    const activeMemories = (await convex.query(
      api.userMemories.listActive,
      {}
    )) as ActiveCoachMemory[];
    const transcript = [...history, ...responseMessages].map(
      modelMessageToTranscriptMessage
    );
    const explicitForgetRan = hasExplicitManageMemoriesForget(responseMessages);
    const operations = explicitForgetRan
      ? []
      : await extractMemoryOperations({
          model: runtime.classificationModel,
          transcript,
          existingMemories: activeMemories.filter(
            (memory) => !isObservationMemory(memory)
          ),
        });
    const observation = explicitForgetRan
      ? null
      : await summarizeObservation({
          model: runtime.classificationModel,
          transcript,
        });
    const keepObservationIds =
      observation ||
      activeMemories.filter((memory) => isObservationMemory(memory)).length > 30
        ? await selectObservationIdsToKeep({
            model: runtime.classificationModel,
            observations: activeMemories.filter((memory) =>
              isObservationMemory(memory)
            ),
          })
        : null;

    if (
      operations.length === 0 &&
      !observation &&
      (!keepObservationIds || keepObservationIds.length === 0)
    ) {
      return;
    }

    const mutationOperations = operations.map((operation) => {
      if (operation.kind === "forget") {
        return {
          kind: "forget" as const,
          memoryId: operation.memoryId as never,
        };
      }

      return {
        kind: "remember" as const,
        category: operation.category,
        content: operation.content,
        source: operation.source,
        existingMemoryId: operation.existingMemoryId as never,
      };
    });

    await convex.mutation(api.userMemories.applyMemoryPipelineResult, {
      operations: mutationOperations,
      ...(observation ? { observation } : {}),
      ...(keepObservationIds
        ? {
            keepObservationIds: keepObservationIds.map((id) => id as never),
          }
        : {}),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    reportError(err, { route: "coach", operation: "process_memory" });
  }
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

  // The AI SDK DefaultChatTransport sends UIMessages ({ id, role, parts })
  // with extra body fields. Parse loosely, then convert to ModelMessages.
  const TransportBodySchema = z.object({
    messages: z.array(z.object({ role: z.string() }).passthrough()).min(1),
    sessionId: z.string().min(1).max(256).nullish(),
    preferences: CoachPreferencesSchema.optional(),
  });

  const parsed = TransportBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (parsed.data.messages.length > MAX_COACH_MESSAGES) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }

  const payloadBytes = new TextEncoder().encode(
    JSON.stringify(parsed.data.messages)
  ).length;
  if (payloadBytes > MAX_UI_MESSAGE_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Request payload too large" },
      { status: 413 }
    );
  }

  const preferences = parsed.data.preferences ?? {
    unit: "lbs" as const,
    soundEnabled: true,
  };
  const sessionId = parsed.data.sessionId ?? undefined;

  // Convert UIMessages to ModelMessages for history building.
  const uiMessages = parsed.data.messages as unknown as UIMessage[];
  let fallbackHistory: ModelMessage[];
  try {
    fallbackHistory = (await convertToModelMessages(uiMessages)).filter(
      (m) => m.role !== "system"
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid message format" },
      { status: 400 }
    );
  }

  const latestUserMsg = [...fallbackHistory]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMsg) {
    return NextResponse.json(
      { error: "Missing user message" },
      { status: 400 }
    );
  }

  const latestUserText =
    typeof latestUserMsg.content === "string"
      ? latestUserMsg.content
      : Array.isArray(latestUserMsg.content)
        ? latestUserMsg.content
            .filter(
              (p): p is { type: "text"; text: string } => p.type === "text"
            )
            .map((p) => p.text)
            .join("\n")
        : "";

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

  const turnId = crypto.randomUUID();

  const runtime = getCoachRuntime();
  if (!runtime) {
    return createStatusAssistantResponse(
      buildRuntimeUnavailableResponse().assistantText,
      503
    );
  }

  const resolveExerciseName = async (
    name: string,
    candidates: Exercise[]
  ): Promise<Exercise | null> => {
    const safeName = name.replace(/[\r\n\t]/g, " ").slice(0, 200);
    const list = candidates
      .map((e) => `"${e.name.replace(/[\r\n\t]/g, " ")}"`)
      .join(", ");
    const { text } = await generateText({
      model: runtime.classificationModel,
      messages: [
        {
          role: "user",
          content: `User wants: "${safeName}"\nExisting exercises: ${list}\nReply with ONLY the exact exercise name if ONE clearly matches (same movement, different spelling/abbreviation is fine). Reply "none" if no match or if multiple exercises match equally well (ambiguous).`,
        },
      ],
      abortSignal: createModelAbortSignal(request.signal),
    });
    const picked = text.trim().replace(/^["']|["']$/g, "");
    if (picked.toLowerCase() === "none") return null;
    return candidates.find((e) => e.name === picked) ?? null;
  };

  const context = {
    convex,
    defaultUnit: preferences.unit,
    timezoneOffsetMinutes: preferences.timezoneOffsetMinutes ?? 0,
    turnId,
    userInput: latestUserText,
    resolveExerciseName,
  };

  const latestUserMessage: ModelMessage = {
    role: "user",
    content: latestUserText,
  };

  // Parallelize rate limit check with history + memory loading.
  // Tag rate limit errors distinctly so on-call can distinguish infrastructure
  // failures from history/memory failures.
  const rateLimitPromise = hasValidE2ETestSession(request)
    ? Promise.resolve({ ok: true as const, limit: 0, remaining: 0, resetAt: 0 })
    : (
        convex.mutation(api.coach.checkCoachTurnRateLimit, {}) as Promise<
          | { ok: true; limit: number; remaining: number; resetAt: number }
          | {
              ok: false;
              limit: number;
              remaining: number;
              resetAt: number;
              retryAfterMs: number;
            }
        >
      ).catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        reportError(err, { route: "coach", operation: "rate_limit_check" });
        return NextResponse.json(
          { error: "Failed to check rate limit" },
          { status: 500 }
        );
      });

  try {
    const [rateLimitResult, { history, conversationSummary }, promptMemory] =
      await Promise.all([
        rateLimitPromise,
        buildCoachHistory({
          convex,
          runtime,
          sessionId,
          fallbackHistory,
          latestUserMessage,
        }),
        loadPromptMemory(convex),
      ]);

    // Rate limit .catch() returns a NextResponse on infrastructure failure.
    if (rateLimitResult instanceof NextResponse) return rateLimitResult;

    if (!rateLimitResult.ok) {
      const retryAfterSeconds = Math.max(
        Math.ceil(rateLimitResult.retryAfterMs / 1000),
        1
      );
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Try again soon.",
          retryAfterSeconds,
          resetAt: rateLimitResult.resetAt,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    // Run planner with fallback chain: try primary, then each fallback on failure.
    let plannerResult = await runPlannerTurn({
      runtime,
      history,
      conversationSummary,
      preferences,
      memories: promptMemory.memories,
      observations: promptMemory.observations,
      ctx: context,
      signal: createModelAbortSignal(request.signal),
    });

    if (
      plannerResult.kind === "error" &&
      plannerResult.toolsUsed.length === 0 &&
      runtime.fallbacks.length > 0
    ) {
      let lastFailedModelId = runtime.modelId;
      for (const fallback of runtime.fallbacks) {
        console.warn(
          `[Coach] Planner failed with ${lastFailedModelId}, retrying with ${fallback.modelId}`
        );
        reportError(
          plannerResult.cause ?? new Error(plannerResult.errorMessage),
          {
            route: "coach",
            operation: "planner_fallback",
            failedModel: lastFailedModelId,
            nextModel: fallback.modelId,
            sessionId: sessionId ?? "none",
            errorMessage: plannerResult.errorMessage,
          }
        );

        plannerResult = await runPlannerTurn({
          runtime: {
            ...runtime,
            model: fallback.model,
            modelId: fallback.modelId,
          },
          history,
          conversationSummary,
          preferences,
          memories: promptMemory.memories,
          observations: promptMemory.observations,
          ctx: context,
          signal: createModelAbortSignal(request.signal),
        });

        if (plannerResult.kind === "ok" || plannerResult.toolsUsed.length > 0) {
          console.warn(`[Coach] Fallback to ${fallback.modelId} succeeded`);
          break;
        }
        lastFailedModelId = fallback.modelId;
      }
    }

    if (
      plannerResult.kind === "error" &&
      plannerResult.toolsUsed.length === 0
    ) {
      reportError(
        plannerResult.cause ?? new Error(plannerResult.errorMessage),
        {
          route: "coach",
          operation: "planner",
          phase: "handled_failure",
          sessionId: sessionId ?? "none",
          historyLength: history.length,
          conversationSummaryPresent: Boolean(conversationSummary),
          errorMessage: plannerResult.errorMessage,
        }
      );
      return createStatusAssistantResponse(
        `I hit an error while planning this turn. ${sanitizeError(plannerResult.errorMessage)}`,
        500
      );
    }

    const presentationContext = {
      latestUserText,
      conversationSummary,
      preferences,
      planner: {
        kind: plannerResult.kind,
        assistantText: plannerResult.assistantText,
        toolsUsed: plannerResult.toolsUsed,
        errorMessage:
          plannerResult.kind === "error"
            ? sanitizeError(plannerResult.errorMessage)
            : undefined,
        hitToolLimit: plannerResult.hitToolLimit,
        toolResults: plannerResult.toolResults,
      },
      followUpPrompts: buildEndOfTurnSuggestions(plannerResult.toolsUsed) ?? [],
    };

    const presentation = streamCoachPresentation({
      runtime,
      signal: createModelAbortSignal(request.signal),
      context: presentationContext,
    });

    after(async () => {
      try {
        await presentation.finishReason;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        reportError(err, {
          route: "coach",
          operation: "presentation_finish",
        });
        return;
      }

      try {
        await persistCoachTurn({
          convex,
          sessionId,
          latestUserText,
          turnId,
          responseMessages: plannerResult.responseMessages as ModelMessage[],
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        reportError(err, { route: "coach", operation: "persist_turn" });
      }

      await processCoachMemory({
        convex,
        runtime,
        history,
        responseMessages: plannerResult.responseMessages as ModelMessage[],
      });
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          writer.merge(
            pipeJsonRender(
              presentation.toUIMessageStream({ sendFinish: false })
            )
          );
          const finishReason = await presentation.finishReason;
          writer.write({ type: "finish", finishReason });
        } catch (error) {
          // Presentation failed — retry with first fallback if available.
          // This only helps when the failure occurs before chunks are sent;
          // if partial output was already written, the client sees garbled
          // output, but that's no worse than the current hard-fail behavior.
          const fb = runtime.fallbacks[0];
          if (!fb) throw error;

          console.warn(
            `[Coach] Presentation failed with ${runtime.modelId}, retrying with ${fb.modelId}`
          );
          reportError(
            error instanceof Error ? error : new Error(String(error)),
            {
              route: "coach",
              operation: "presentation_fallback",
              failedModel: runtime.modelId,
              nextModel: fb.modelId,
            }
          );

          const retry = streamCoachPresentation({
            runtime: { ...runtime, model: fb.model, modelId: fb.modelId },
            signal: createModelAbortSignal(request.signal),
            context: presentationContext,
          });
          writer.merge(
            pipeJsonRender(retry.toUIMessageStream({ sendFinish: false }))
          );
          const finishReason = await retry.finishReason;
          writer.write({ type: "finish", finishReason });
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    reportError(err, { route: "coach", operation: "coach_turn" });
    return NextResponse.json(
      { error: "Failed to process coach turn" },
      { status: 500 }
    );
  }
}
