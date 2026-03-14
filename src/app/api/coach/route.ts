import { NextResponse } from "next/server";
import { reportError } from "@/lib/analytics";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/../convex/_generated/api";
import {
  CoachTurnRequestSchema,
  type CoachTurnResponse,
  type CoachStreamEvent,
} from "@/lib/coach/schema";
import { getCoachRuntime } from "@/lib/coach/server/runtime";
import {
  encodeSse,
  encodeSseComment,
  SSE_HEADERS,
  SSE_PADDING_BYTES,
  wantsEventStream,
} from "@/lib/coach/server/sse";
import { runCoachTurn } from "@/lib/coach/server/turn-runner";
import { generateText, type ModelMessage } from "ai";
import type { Exercise } from "@/types/domain";
import { hasValidE2ETestSession } from "@/lib/e2e/test-session";

const CONTEXT_SUMMARY_TRIGGER_MESSAGES = 40;
const CONTEXT_RECENT_MESSAGE_WINDOW = 20;

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

function deserializeStoredMessage(content: string): ModelMessage {
  return JSON.parse(content) as ModelMessage;
}

function serializeUserMessage(text: string): string {
  return JSON.stringify({ role: "user", content: text });
}

function buildSyntheticAssistantMessage(
  response: CoachTurnResponse
): ModelMessage | null {
  if (!response.assistantText.trim() && response.blocks.length === 0) {
    return null;
  }

  return {
    role: "assistant",
    content: response.assistantText.trim()
      ? [{ type: "text", text: response.assistantText }]
      : [],
  };
}

function getPersistedResponseMessages(
  response: CoachTurnResponse
): ModelMessage[] {
  const messages =
    (response.responseMessages as ModelMessage[] | undefined) ?? [];
  if (messages.length > 0) {
    return messages;
  }

  const syntheticAssistant = buildSyntheticAssistantMessage(response);
  return syntheticAssistant ? [syntheticAssistant] : [];
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

  const [contextState, allMessages] = (await Promise.all([
    convex.query(api.coachSessions.getSessionMessagesForContext, {
      sessionId: sessionId as never,
    }) as Promise<CoachContextState>,
    convex.query(api.coachSessions.getSessionMessages, {
      sessionId: sessionId as never,
    }) as Promise<StoredCoachMessage[]>,
  ])) as [CoachContextState, StoredCoachMessage[]];

  const unsummarizedMessages = allMessages.filter(
    (message) => message.summarizedAt === undefined
  );
  let conversationSummary = contextState.summary ?? undefined;
  let recentMessages = unsummarizedMessages;

  if (
    runtime &&
    unsummarizedMessages.length + 1 > CONTEXT_SUMMARY_TRIGGER_MESSAGES
  ) {
    const messagesToSummarize = unsummarizedMessages.slice(
      0,
      -CONTEXT_RECENT_MESSAGE_WINDOW
    );
    const recentWindow = unsummarizedMessages.slice(
      -CONTEXT_RECENT_MESSAGE_WINDOW
    );

    if (messagesToSummarize.length > 0) {
      const { text } = await generateText({
        model: runtime.model,
        messages: [
          {
            role: "user",
            content: buildSummaryPrompt({
              existingSummary: conversationSummary,
              messagesToSummarize: messagesToSummarize.map((message) =>
                deserializeStoredMessage(message.content)
              ),
            }),
          },
        ],
      });

      conversationSummary = text.trim();
      recentMessages = recentWindow;

      await convex.mutation(api.coachSessions.applySummary, {
        sessionId: sessionId as never,
        summary: conversationSummary,
        summarizeThroughCreatedAt:
          messagesToSummarize[messagesToSummarize.length - 1]!.createdAt,
      });
    }
  } else if (conversationSummary) {
    recentMessages = unsummarizedMessages.slice(-CONTEXT_RECENT_MESSAGE_WINDOW);
  }

  return {
    history: [
      ...recentMessages.map((message) =>
        deserializeStoredMessage(message.content)
      ),
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
  response,
}: {
  convex: ConvexHttpClient;
  sessionId?: string;
  latestUserText: string;
  turnId: string;
  response: CoachTurnResponse;
}) {
  if (!sessionId) {
    return;
  }

  const createdAtBase = Date.now();
  await convex.mutation(api.coachSessions.addMessage, {
    sessionId: sessionId as never,
    role: "user",
    content: serializeUserMessage(latestUserText),
    turnId,
    createdAt: createdAtBase,
  });

  const persistedResponseMessages = getPersistedResponseMessages(response);
  let attachedBlocks = false;

  await Promise.all(
    persistedResponseMessages.map((message, index) => {
      const blocks =
        !attachedBlocks &&
        message.role === "assistant" &&
        response.blocks.length > 0
          ? JSON.stringify(response.blocks)
          : undefined;

      if (blocks) {
        attachedBlocks = true;
      }

      return convex.mutation(api.coachSessions.addMessage, {
        sessionId: sessionId as never,
        role: message.role === "tool" ? "tool" : "assistant",
        content: JSON.stringify(message),
        blocks,
        turnId,
        createdAt: createdAtBase + index + 1,
      });
    })
  );
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

  const fallbackHistory = parsed.data.messages.filter(
    (message) => message.role !== "system"
  );

  const latestUserMsg = [...fallbackHistory]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMsg) {
    return NextResponse.json(
      { error: "Missing user message" },
      { status: 400 }
    );
  }

  // User messages always have string content from our client.
  const latestUserText =
    typeof latestUserMsg.content === "string" ? latestUserMsg.content : "";

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

  const resolveExerciseName = runtime
    ? async (
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
              content: `User wants to log: "${safeName}"\nExisting exercises: ${list}\nReply with ONLY the exact exercise name if it clearly matches (same movement, different spelling is fine). Reply "none" if no good match.`,
            },
          ],
        });
        const picked = text.trim().replace(/^["']|["']$/g, "");
        if (picked.toLowerCase() === "none") return null;
        return candidates.find((e) => e.name === picked) ?? null;
      }
    : undefined;

  const context = {
    convex,
    defaultUnit: parsed.data.preferences.unit,
    timezoneOffsetMinutes:
      // If the client didn't provide a timezone offset, default to UTC instead of
      // the server's timezone (which would be wrong for most users).
      parsed.data.preferences.timezoneOffsetMinutes ?? 0,
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
    sessionId: parsed.data.sessionId,
    fallbackHistory,
    latestUserMessage,
  });

  const streamRequested = wantsEventStream(request);

  if (streamRequested) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const send = (event: CoachStreamEvent) => {
          if (closed) return false;
          try {
            controller.enqueue(encoder.encode(encodeSse(event)));
            if (event.type === "start") {
              controller.enqueue(
                encoder.encode(encodeSseComment(" ".repeat(SSE_PADDING_BYTES)))
              );
            }
            return true;
          } catch {
            closed = true;
            return false;
          }
        };

        const close = () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {
            // ignore close races
          }
        };

        try {
          const response = await runCoachTurn({
            runtime,
            history,
            conversationSummary,
            preferences: parsed.data.preferences,
            ctx: context,
            requestSignal: request.signal,
            emitEvent: (event) => {
              if (!send(event) || request.signal.aborted) {
                close();
              }
            },
          });

          await persistCoachTurn({
            convex,
            sessionId: parsed.data.sessionId,
            latestUserText,
            turnId,
            response,
          });
          send({ type: "final", response });
        } finally {
          close();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  }

  const response = await runCoachTurn({
    runtime,
    history,
    conversationSummary,
    preferences: parsed.data.preferences,
    ctx: context,
    requestSignal: request.signal,
  });

  await persistCoachTurn({
    convex,
    sessionId: parsed.data.sessionId,
    latestUserText,
    turnId,
    response,
  });

  return NextResponse.json(response);
}
