import { NextResponse } from "next/server";
import type OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/../convex/_generated/api";
import {
  CoachTurnRequestSchema,
  CoachTurnResponseSchema,
  type CoachStreamEvent,
  type CoachTurnResponse,
} from "@/lib/coach/schema";
import {
  buildCoachTurnResponse,
  toolErrorBlocks,
} from "@/lib/coach/server/blocks";
import { runDeterministicFallback } from "@/lib/coach/server/fallback";
import { runPlannerTurn } from "@/lib/coach/server/planner";
import { getCoachRuntime } from "@/lib/coach/server/runtime";
import {
  encodeSse,
  encodeSseComment,
  SSE_HEADERS,
  SSE_PADDING_BYTES,
  wantsEventStream,
} from "@/lib/coach/server/sse";

const COACH_TURN_TIMEOUT_MS = 60_000;

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

  const latestUserMessage = [...parsed.data.messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) {
    return NextResponse.json(
      { error: "Missing user message" },
      { status: 400 }
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

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
    const message =
      error instanceof Error ? error.message : "Unknown rate limit error";
    return NextResponse.json(
      { error: "Failed to check rate limit", detail: message },
      { status: 500 }
    );
  }

  const context = {
    convex,
    defaultUnit: parsed.data.preferences.unit,
    timezoneOffsetMinutes:
      // If the client didn't provide a timezone offset, default to UTC instead of
      // the server's timezone (which would be wrong for most users).
      parsed.data.preferences.timezoneOffsetMinutes ?? 0,
    userInput: latestUserMessage.content,
  };

  const streamRequested = wantsEventStream(request);
  const runtime = getCoachRuntime();

  if (streamRequested) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const turnController = new AbortController();
        const timeoutId = setTimeout(() => {
          try {
            turnController.abort(new Error("Turn timed out"));
          } catch {
            turnController.abort();
          }
        }, COACH_TURN_TIMEOUT_MS);

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

        const abortHandler = () => {
          try {
            turnController.abort("client_aborted");
          } catch {
            turnController.abort();
          }
          close();
        };
        request.signal.addEventListener("abort", abortHandler);

        try {
          if (!runtime) {
            send({ type: "start", model: "fallback-deterministic" });
            sendComment(" ".repeat(SSE_PADDING_BYTES));
            if (turnController.signal.aborted) {
              send({ type: "error", message: "Turn aborted." });
              return;
            }
            const fallbackResponse = await runDeterministicFallback(
              latestUserMessage.content,
              context,
              send
            );
            send({ type: "final", response: fallbackResponse });
            return;
          }

          send({ type: "start", model: runtime.model });
          sendComment(" ".repeat(SSE_PADDING_BYTES));

          const history = parsed.data.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

          const plannerResult = await runPlannerTurn({
            runtime,
            history,
            preferences: parsed.data.preferences,
            ctx: context,
            emitEvent: send,
            signal: turnController.signal,
          });

          if (plannerResult.kind === "error") {
            send({ type: "error", message: plannerResult.errorMessage });
          }

          const aborted = turnController.signal.aborted;

          let response: CoachTurnResponse;
          if (
            plannerResult.kind === "error" &&
            plannerResult.toolsUsed.length === 0 &&
            !aborted
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
          clearTimeout(timeoutId);
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

  const history = parsed.data.messages.map((message) => ({
    role: message.role,
    content: message.content,
  })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

  const turnController = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      turnController.abort(new Error("Turn timed out"));
    } catch {
      turnController.abort();
    }
  }, COACH_TURN_TIMEOUT_MS);
  const abortHandler = () => {
    try {
      turnController.abort("client_aborted");
    } catch {
      turnController.abort();
    }
  };
  request.signal.addEventListener("abort", abortHandler);

  let plannerResult: Awaited<ReturnType<typeof runPlannerTurn>>;
  try {
    plannerResult = await runPlannerTurn({
      runtime,
      history,
      preferences: parsed.data.preferences,
      ctx: context,
      signal: turnController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    request.signal.removeEventListener("abort", abortHandler);
  }

  const aborted = turnController.signal.aborted;

  if (
    plannerResult.kind === "error" &&
    plannerResult.toolsUsed.length === 0 &&
    !aborted
  ) {
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
