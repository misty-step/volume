import { NextResponse } from "next/server";
import { pipeJsonRender } from "@json-render/core";
import { reportError } from "@/lib/analytics";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/../convex/_generated/api";
import { CoachPreferencesSchema, MAX_COACH_MESSAGES } from "@/lib/coach/schema";
import { getCoachRuntime } from "@/lib/coach/server/runtime";
import { buildPlannerSystemPrompt } from "@/lib/coach/server/planner";
import { createCoachTools } from "@/lib/coach/server/coach-tools";
import {
  buildRuntimeUnavailableResponse,
  normalizeAssistantText,
} from "@/lib/coach/server/blocks";
import {
  streamText,
  generateText,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  type UIMessage,
} from "ai";
import type { Exercise } from "@/types/domain";
import { hasValidE2ETestSession } from "@/lib/e2e/test-session";
import { z } from "zod";

const CONTEXT_SUMMARY_TRIGGER_MESSAGES = 40;
const CONTEXT_RECENT_MESSAGE_WINDOW = 20;
const MAX_TOOL_ROUNDS = 5;
const MAX_UI_MESSAGE_PAYLOAD_BYTES = 200_000;
const MODEL_CALL_TIMEOUT_MS = 30_000;
const TOOL_LIMIT_FALLBACK_MESSAGE =
  "I reached the step limit. Ask a follow-up and I'll continue.";

type StoredCoachMessage = {
  _id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  blocks?: string;
  turnId?: string;
  createdAt: number;
  summarizedAt?: number;
};

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

function shouldAppendToolLimitFallback({
  text,
  stepCount,
  finishReason,
}: {
  text: string;
  stepCount: number;
  finishReason?: string;
}) {
  const normalizedText = normalizeAssistantText(text);
  return (
    !normalizedText &&
    (finishReason === "tool-calls" || stepCount >= MAX_TOOL_ROUNDS)
  );
}

function appendToolLimitFallback({
  responseMessages,
  text,
  stepCount,
  finishReason,
}: {
  responseMessages: ModelMessage[];
  text: string;
  stepCount: number;
  finishReason?: string;
}) {
  if (
    !shouldAppendToolLimitFallback({
      text,
      stepCount,
      finishReason,
    })
  ) {
    return responseMessages;
  }

  return [
    ...responseMessages,
    {
      role: "assistant",
      content: TOOL_LIMIT_FALLBACK_MESSAGE,
    },
  ];
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

  let recentMessages = unsummarizedMessages.slice(
    -CONTEXT_RECENT_MESSAGE_WINDOW
  );

  if (
    runtime &&
    unsummarizedMessages.length + 1 > CONTEXT_SUMMARY_TRIGGER_MESSAGES
  ) {
    const messagesToSummarize = unsummarizedMessages.slice(
      0,
      -CONTEXT_RECENT_MESSAGE_WINDOW
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
        recentMessages = unsummarizedMessages.slice(
          -CONTEXT_RECENT_MESSAGE_WINDOW
        );
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

  if (!hasValidE2ETestSession(request)) {
    try {
      const rateLimit = (await convex.mutation(
        api.coach.checkCoachTurnRateLimit,
        {}
      )) as
        | { ok: true; limit: number; remaining: number; resetAt: number }
        | {
            ok: false;
            limit: number;
            remaining: number;
            resetAt: number;
            retryAfterMs: number;
          };

      if (!rateLimit.ok) {
        const retryAfterSeconds = Math.max(
          Math.ceil(rateLimit.retryAfterMs / 1000),
          1
        );
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Try again soon.",
            retryAfterSeconds,
            resetAt: rateLimit.resetAt,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
            },
          }
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      reportError(err, { route: "coach", operation: "rate_limit_check" });
      return NextResponse.json(
        { error: "Failed to check rate limit" },
        { status: 500 }
      );
    }
  }

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
  const { history, conversationSummary } = await buildCoachHistory({
    convex,
    runtime,
    sessionId,
    fallbackHistory,
    latestUserMessage,
  });

  const systemPrompt = buildPlannerSystemPrompt({
    preferences,
    conversationSummary,
  });

  const tools = createCoachTools(context);

  const result = streamText({
    model: runtime.model,
    system: systemPrompt,
    messages: history,
    tools,
    stopWhen: stepCountIs(MAX_TOOL_ROUNDS),
    abortSignal: createModelAbortSignal(request.signal),
  });

  void result.response.then(async (response) => {
    try {
      const [text, steps, finishReason] = await Promise.all([
        result.text,
        result.steps,
        result.finishReason,
      ]);
      await persistCoachTurn({
        convex,
        sessionId,
        latestUserText,
        turnId,
        responseMessages: appendToolLimitFallback({
          responseMessages: response.messages as ModelMessage[],
          text,
          stepCount: steps.length,
          finishReason,
        }),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      reportError(err, { route: "coach", operation: "persist_turn" });
    }
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(
        pipeJsonRender(result.toUIMessageStream({ sendFinish: false }))
      );
      await result.response;

      const [text, steps, finishReason] = await Promise.all([
        result.text,
        result.steps,
        result.finishReason,
      ]);

      if (
        shouldAppendToolLimitFallback({
          text,
          stepCount: steps.length,
          finishReason,
        })
      ) {
        const textId = crypto.randomUUID();
        writer.write({ type: "text-start", id: textId });
        writer.write({
          type: "text-delta",
          id: textId,
          delta: TOOL_LIMIT_FALLBACK_MESSAGE,
        });
        writer.write({ type: "text-end", id: textId });
      }

      writer.write({ type: "finish", finishReason });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
