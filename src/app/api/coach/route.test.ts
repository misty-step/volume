// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/../convex/_generated/api";
import { E2E_SESSION_COOKIE_NAME } from "@/lib/e2e/test-session";

const afterMock = vi.fn((callback: () => void | Promise<void>) => {
  void callback();
});
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (callback: () => void | Promise<void>) => afterMock(callback),
  };
});

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

const analyticsMocks = vi.hoisted(() => ({
  reportErrorMock: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({
  reportError: (...args: unknown[]) => analyticsMocks.reportErrorMock(...args),
}));

const getCoachRuntimeMock = vi.fn();
vi.mock("@/lib/coach/server/runtime", () => ({
  getCoachRuntime: () => getCoachRuntimeMock(),
}));

const plannerMocks = vi.hoisted(() => ({
  runPlannerTurnMock: vi.fn(),
  buildEndOfTurnSuggestionsMock: vi.fn(),
}));

vi.mock("@/lib/coach/server/planner", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    runPlannerTurn: (...args: unknown[]) =>
      plannerMocks.runPlannerTurnMock(...args),
    buildEndOfTurnSuggestions: (...args: unknown[]) =>
      plannerMocks.buildEndOfTurnSuggestionsMock(...args),
  };
});

const extractMemoryOperationsMock = vi.fn();
const summarizeObservationMock = vi.fn();
const selectObservationIdsToKeepMock = vi.fn();
vi.mock("@/lib/coach/server/memory-pipeline", () => ({
  extractMemoryOperations: (...args: unknown[]) =>
    extractMemoryOperationsMock(...args),
  summarizeObservation: (...args: unknown[]) =>
    summarizeObservationMock(...args),
  selectObservationIdsToKeep: (...args: unknown[]) =>
    selectObservationIdsToKeepMock(...args),
}));

const generateTextMock = vi.fn();
const streamTextMock = vi.fn();
const pipeJsonRenderMock = vi.fn((stream: ReadableStream) => stream);
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
    streamText: (...args: unknown[]) => streamTextMock(...args),
  };
});

vi.mock("@json-render/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    pipeJsonRender: (stream: ReadableStream) => pipeJsonRenderMock(stream),
  };
});

function createConvexStub(options?: { rateLimitOk?: boolean }) {
  return {
    setAuth: vi.fn(),
    query: vi.fn(async () => []),
    mutation: vi.fn(async (_fn: unknown, args: unknown) => {
      if (args && typeof args === "object" && Object.keys(args).length === 0) {
        if (options?.rateLimitOk === false) {
          return {
            ok: false,
            limit: 10,
            remaining: 0,
            resetAt: Date.now() + 60_000,
            retryAfterMs: 1000,
          };
        }
        return {
          ok: true,
          limit: 10,
          remaining: 9,
          resetAt: Date.now() + 60_000,
        };
      }
      return null;
    }),
    action: vi.fn(async () => null),
  };
}

const ConvexHttpClientMock = vi.fn();
vi.mock("convex/browser", () => ({
  ConvexHttpClient: function (...args: any[]) {
    return ConvexHttpClientMock(...args);
  },
}));

function validBody() {
  return JSON.stringify({
    messages: [
      {
        id: "msg_1",
        role: "user",
        parts: [{ type: "text", text: "show today's summary" }],
      },
    ],
    sessionId: undefined,
    preferences: {
      unit: "lbs",
      soundEnabled: true,
      timezoneOffsetMinutes: 0,
    },
  });
}

function validBodyWithSession(sessionId: string) {
  return JSON.stringify({
    messages: [
      {
        id: "msg_1",
        role: "user",
        parts: [{ type: "text", text: "show today's summary" }],
      },
    ],
    sessionId,
    preferences: {
      unit: "lbs",
      soundEnabled: true,
      timezoneOffsetMinutes: 0,
    },
  });
}

const ORIGINAL_ENV = { ...process.env };

async function waitForAssertion(assertion: () => void, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

function createStreamTextResult(options?: {
  text?: string;
  finishReason?: "stop" | "tool-calls";
  responseMessages?: Array<Record<string, unknown>>;
}) {
  return {
    text: Promise.resolve(options?.text ?? "hello"),
    steps: Promise.resolve([]),
    finishReason: Promise.resolve(options?.finishReason ?? "stop"),
    response: Promise.resolve({
      messages: options?.responseMessages ?? [
        { role: "assistant", content: options?.text ?? "hello" },
      ],
    }),
    consumeStream: vi.fn(async () => undefined),
    toUIMessageStream: vi.fn(
      ({ sendFinish = true }: { sendFinish?: boolean } = {}) =>
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "start" });
            controller.enqueue({ type: "text-start", id: "text_1" });
            controller.enqueue({
              type: "text-delta",
              id: "text_1",
              delta: options?.text ?? "hello",
            });
            controller.enqueue({ type: "text-end", id: "text_1" });
            if (sendFinish) {
              controller.enqueue({ type: "finish", finishReason: "stop" });
            }
            controller.close();
          },
        })
    ),
  };
}

function createFailingStreamTextResult(
  error = new Error("Presentation failed")
) {
  const finishReason = {
    then: (_resolve: unknown, reject?: (reason: unknown) => void) =>
      reject?.(error),
  } as Promise<never>;

  return {
    text: Promise.resolve("partial"),
    steps: Promise.resolve([]),
    finishReason,
    response: Promise.resolve({
      messages: [{ role: "assistant", content: "partial" }],
    }),
    consumeStream: vi.fn(async () => undefined),
    toUIMessageStream: vi.fn(
      ({ sendFinish = true }: { sendFinish?: boolean } = {}) =>
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "start" });
            controller.enqueue({ type: "text-start", id: "text_1" });
            controller.enqueue({
              type: "text-delta",
              id: "text_1",
              delta: "partial",
            });
            controller.enqueue({ type: "text-end", id: "text_1" });
            if (sendFinish) {
              controller.enqueue({ type: "finish", finishReason: "stop" });
            }
            controller.close();
          },
        })
    ),
  };
}

function createPlannerResult(
  overrides: Partial<{
    kind: "ok" | "error";
    assistantText: string;
    toolsUsed: string[];
    errorMessage?: string;
    hitToolLimit: boolean;
    toolResults: Array<Record<string, unknown>>;
    responseMessages: Array<Record<string, unknown>>;
  }> = {}
) {
  return {
    kind: "ok" as const,
    assistantText: "Here is today's summary.",
    toolsUsed: ["get_today_summary"],
    errorMessage: undefined,
    hitToolLimit: false,
    toolResults: [],
    responseMessages: [
      { role: "assistant", content: "Here is today's summary." },
    ],
    ...overrides,
  };
}

describe("POST /api/coach", () => {
  beforeEach(() => {
    plannerMocks.runPlannerTurnMock.mockReset();
    plannerMocks.buildEndOfTurnSuggestionsMock.mockReset();
    plannerMocks.runPlannerTurnMock.mockResolvedValue(createPlannerResult());
    plannerMocks.buildEndOfTurnSuggestionsMock.mockReturnValue([
      "show today's summary",
    ]);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
    authMock.mockReset();
    getCoachRuntimeMock.mockReset();
    plannerMocks.runPlannerTurnMock.mockReset();
    plannerMocks.buildEndOfTurnSuggestionsMock.mockReset();
    generateTextMock.mockReset();
    streamTextMock.mockReset();
    pipeJsonRenderMock.mockClear();
    extractMemoryOperationsMock.mockReset();
    summarizeObservationMock.mockReset();
    selectObservationIdsToKeepMock.mockReset();
    afterMock.mockClear();
    ConvexHttpClientMock.mockReset();
    analyticsMocks.reportErrorMock.mockReset();
  });

  it("returns 401 when userId is missing", async () => {
    authMock.mockResolvedValue({ userId: null, getToken: vi.fn() });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when token is null", async () => {
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue(null),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid request schema", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wrong: "shape" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("enforces per-user rate limits", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub({ rateLimitOk: false });
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("bypasses rate limits for authenticated E2E sessions", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    process.env.TEST_RESET_SECRET = "test-secret";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub({ rateLimitOk: false });
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${E2E_SESSION_COOKIE_NAME}=test-secret`,
        },
        body: validBody(),
      })
    );

    expect(response.status).toBe(503);
    expect(convex.mutation).not.toHaveBeenCalled();
  });

  it("returns a streamed assistant response when runtime is unavailable", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain("I can't process that request right now.");
  });

  it("rejects requests with too many messages", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: Array.from({ length: 31 }, (_, index) => ({
            id: `msg_${index}`,
            role: "user",
            parts: [{ type: "text", text: "show today's summary" }],
          })),
          preferences: {
            unit: "lbs",
            soundEnabled: true,
            timezoneOffsetMinutes: 0,
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Too many messages",
    });
  });

  it("reports handled planner failures before returning a 500 stream", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    plannerMocks.runPlannerTurnMock.mockResolvedValue(
      createPlannerResult({
        kind: "error",
        assistantText: "",
        errorMessage:
          "Each tool_result block must have a corresponding tool_use block",
        toolsUsed: [],
        responseMessages: [],
      })
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain("I hit an error while planning this turn.");
    expect(analyticsMocks.reportErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Each tool_result block must have a corresponding tool_use block",
      }),
      expect.objectContaining({
        route: "coach",
        operation: "planner",
        phase: "handled_failure",
        historyLength: 1,
        conversationSummaryPresent: false,
      })
    );
  });

  it("pipes the successful UI stream through json-render", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    plannerMocks.runPlannerTurnMock.mockResolvedValue(
      createPlannerResult({
        assistantText: "planner hello",
        responseMessages: [{ role: "assistant", content: "planner hello" }],
      })
    );
    streamTextMock.mockReturnValueOnce(
      createStreamTextResult({ text: "hello" })
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(200);
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    expect(pipeJsonRenderMock).toHaveBeenCalled();
    const body = await response.text();
    expect(body).toContain("hello");
  });

  it("passes partial planner results to presentation when planner returns an error after tools", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    plannerMocks.runPlannerTurnMock.mockResolvedValue(
      createPlannerResult({
        kind: "error",
        assistantText:
          "I found your recent history, but one follow-up step failed.",
        errorMessage: "secondary lookup failed",
        toolsUsed: ["get_history_overview"],
        toolResults: [
          {
            toolName: "get_history_overview",
            input: {},
            summary: "Loaded 3 recent sets.",
            outputForModel: {
              status: "ok",
              surface: "history_overview",
              shown_sets: 3,
              recent_sets: [
                {
                  set_id: "set_1",
                  exercise_name: "Push-ups",
                  summary: "12 reps",
                },
              ],
            },
            legacyBlocks: [
              { type: "detail_panel", title: "History snapshot", fields: [] },
              { type: "entity_list", title: "Recent sets", items: [] },
            ],
          },
        ],
        responseMessages: [
          {
            role: "assistant",
            content:
              "I found your recent history, but one follow-up step failed.",
          },
        ],
      })
    );
    streamTextMock.mockReturnValueOnce(
      createStreamTextResult({ text: "Here is what I could recover." })
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(200);
    await response.text();

    const presentationRequest = streamTextMock.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };

    expect(presentationRequest.messages[0]?.content).toContain(
      '"planner_kind": "error"'
    );
    expect(presentationRequest.messages[0]?.content).toContain(
      '"tool_name": "get_history_overview"'
    );
    expect(presentationRequest.messages[0]?.content).toContain(
      '"shown_sets": 3'
    );
    expect(presentationRequest.messages[0]?.content).toContain(
      '"History snapshot"'
    );
  });

  it("does not persist planner messages when presentation fails", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    plannerMocks.runPlannerTurnMock.mockResolvedValue(
      createPlannerResult({
        assistantText: "planner hello",
        responseMessages: [{ role: "assistant", content: "planner hello" }],
      })
    );
    streamTextMock.mockReturnValueOnce(createFailingStreamTextResult());

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBodyWithSession("session_123"),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('"type":"error"');
    expect(body).toContain("Presentation failed");

    const persistedCalls = convex.mutation.mock.calls.filter(([, args]) =>
      Boolean(
        args &&
        typeof args === "object" &&
        "turnId" in (args as Record<string, unknown>)
      )
    );

    expect(persistedCalls).toEqual([]);
  });

  it("passes stored memories into planner turn execution", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    convex.query.mockResolvedValueOnce({
      memories: [
        {
          category: "injury",
          content: "Left shoulder impingement. Avoid heavy overhead pressing.",
          source: "fact_extractor",
          createdAt: 1,
        },
        {
          category: "goal",
          content: "Training for a half marathon in June.",
          source: "explicit_user",
          createdAt: 2,
        },
      ],
      observations: [
        "The user is prioritizing consistency while protecting the shoulder.",
      ],
    });
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    streamTextMock.mockReturnValue(createStreamTextResult({ text: "hello" }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(200);
    expect(plannerMocks.runPlannerTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memories: [
          {
            category: "injury",
            content:
              "Left shoulder impingement. Avoid heavy overhead pressing.",
            source: "fact_extractor",
            createdAt: 1,
          },
          {
            category: "goal",
            content: "Training for a half marathon in June.",
            source: "explicit_user",
            createdAt: 2,
          },
        ],
        observations: [
          "The user is prioritizing consistency while protecting the shoulder.",
        ],
      })
    );
    await response.text();
  });

  it("processes post-turn memory operations after the streamed response completes", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    convex.query
      .mockResolvedValueOnce({ memories: [], observations: [] })
      .mockResolvedValueOnce([
        {
          _id: "memory_1",
          category: "injury",
          content: "Old shoulder note",
          source: "fact_extractor",
          createdAt: 1,
        },
        {
          _id: "observation_1",
          category: "other",
          content: "Recent observation",
          source: "observer",
          createdAt: 2,
        },
      ]);
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    plannerMocks.runPlannerTurnMock.mockResolvedValue(
      createPlannerResult({
        responseMessages: [
          { role: "assistant", content: "I'll keep that in mind." },
        ],
      })
    );
    streamTextMock.mockReturnValue(
      createStreamTextResult({
        text: "I'll keep that in mind.",
      })
    );
    extractMemoryOperationsMock.mockResolvedValue([
      {
        kind: "remember",
        category: "injury",
        content: "Avoid heavy overhead pressing.",
        source: "fact_extractor",
        existingMemoryId: "memory_1",
      },
      {
        kind: "forget",
        memoryId: "memory_1",
      },
    ]);
    summarizeObservationMock.mockResolvedValue(
      "User wants safer upper-body alternatives."
    );
    selectObservationIdsToKeepMock.mockResolvedValue(["observation_1"]);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(200);
    await response.text();

    await waitForAssertion(() => {
      expect(extractMemoryOperationsMock).toHaveBeenCalledWith({
        model: "test-classifier",
        transcript: [
          {
            role: "user",
            content: "show today's summary",
          },
          {
            role: "assistant",
            content: "I'll keep that in mind.",
          },
        ],
        existingMemories: [
          {
            _id: "memory_1",
            category: "injury",
            content: "Old shoulder note",
            source: "fact_extractor",
            createdAt: 1,
          },
        ],
      });
      expect(summarizeObservationMock).toHaveBeenCalledWith({
        model: "test-classifier",
        transcript: [
          {
            role: "user",
            content: "show today's summary",
          },
          {
            role: "assistant",
            content: "I'll keep that in mind.",
          },
        ],
      });
      expect(selectObservationIdsToKeepMock).toHaveBeenCalledWith({
        model: "test-classifier",
        observations: [
          {
            _id: "observation_1",
            category: "other",
            content: "Recent observation",
            source: "observer",
            createdAt: 2,
          },
        ],
      });
      expect(convex.mutation).toHaveBeenCalledWith(
        api.userMemories.applyMemoryPipelineResult,
        {
          operations: [
            {
              kind: "remember",
              category: "injury",
              content: "Avoid heavy overhead pressing.",
              source: "fact_extractor",
              existingMemoryId: "memory_1",
            },
            {
              kind: "forget",
              memoryId: "memory_1",
            },
          ],
          observation: "User wants safer upper-body alternatives.",
          keepObservationIds: ["observation_1"],
        }
      );
    });
  });

  it("skips implicit extraction when an explicit forget tool already ran", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    convex.query
      .mockResolvedValueOnce({ memories: [], observations: [] })
      .mockResolvedValueOnce([]);
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    plannerMocks.runPlannerTurnMock.mockResolvedValue(
      createPlannerResult({
        responseMessages: [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "tool_1",
                toolName: "manage_memories",
                input: {
                  action: "forget",
                  content: "Old shoulder note",
                },
              },
            ],
          },
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: "tool_1",
                toolName: "manage_memories",
                output: {
                  status: "ok",
                  action: "forget",
                  deleted_count: 1,
                  content: "Old shoulder note",
                },
              },
            ],
          },
          {
            role: "assistant",
            content: "I won't use that going forward.",
          },
        ],
      })
    );
    streamTextMock.mockReturnValue(
      createStreamTextResult({
        text: "I won't use that going forward.",
      })
    );
    summarizeObservationMock.mockResolvedValue(null);
    selectObservationIdsToKeepMock.mockResolvedValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBody(),
      })
    );

    expect(response.status).toBe(200);
    await response.text();

    await waitForAssertion(() => {
      expect(extractMemoryOperationsMock).not.toHaveBeenCalled();
      expect(summarizeObservationMock).not.toHaveBeenCalled();
      expect(
        convex.mutation.mock.calls.some(
          ([fn]) => fn === api.userMemories.applyMemoryPipelineResult
        )
      ).toBe(false);
    });
  });

  it("continues memory processing when session persistence fails", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    convex.query
      .mockResolvedValueOnce({ memories: [], observations: [] })
      .mockResolvedValueOnce([]);
    convex.mutation.mockImplementation(async (fn, args) => {
      if (args && typeof args === "object" && Object.keys(args).length === 0) {
        return {
          ok: true,
          limit: 10,
          remaining: 9,
          resetAt: Date.now() + 60_000,
        };
      }

      if (fn === api.coachSessions.addMessage) {
        throw new Error("session write failed");
      }

      return null;
    });
    ConvexHttpClientMock.mockReturnValue(convex);
    getCoachRuntimeMock.mockReturnValue({
      model: "test-model",
      classificationModel: "test-classifier",
    });
    plannerMocks.runPlannerTurnMock.mockResolvedValue(
      createPlannerResult({
        responseMessages: [
          { role: "assistant", content: "I'll keep that in mind." },
        ],
      })
    );
    streamTextMock.mockReturnValue(
      createStreamTextResult({ text: "I'll keep that in mind." })
    );
    extractMemoryOperationsMock.mockResolvedValue([
      {
        kind: "remember",
        category: "injury",
        content: "Avoid heavy overhead pressing.",
        source: "fact_extractor",
      },
    ]);
    summarizeObservationMock.mockResolvedValue(null);
    selectObservationIdsToKeepMock.mockResolvedValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://volume.fitness/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: validBodyWithSession("session_123"),
      })
    );

    expect(response.status).toBe(200);
    await response.text();

    await waitForAssertion(() => {
      expect(convex.mutation).toHaveBeenCalledWith(
        api.userMemories.applyMemoryPipelineResult,
        {
          operations: [
            {
              kind: "remember",
              category: "injury",
              content: "Avoid heavy overhead pressing.",
              source: "fact_extractor",
              existingMemoryId: undefined,
            },
          ],
        }
      );
    });
  });
});
