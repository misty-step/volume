// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { readCoachStreamEvents } from "@/lib/coach/sse-client";

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

const getCoachRuntimeMock = vi.fn();
vi.mock("@/lib/coach/server/runtime", () => ({
  getCoachRuntime: () => getCoachRuntimeMock(),
}));

const runPlannerTurnMock = vi.fn();
vi.mock("@/lib/coach/server/planner", () => ({
  runPlannerTurn: (args: unknown) => runPlannerTurnMock(args),
}));

function createConvexStub(options?: { rateLimitOk?: boolean }) {
  const now = Date.UTC(2026, 1, 16, 12, 0, 0);
  const exercises = [{ _id: "ex_push", name: "Push-ups" }];
  const todaySets = [{ exerciseId: "ex_push", performedAt: now, reps: 10 }];

  return {
    setAuth: vi.fn(),
    query: vi.fn(async (_fn: unknown, args: unknown) => {
      if (args && typeof args === "object" && "includeDeleted" in args) {
        return exercises;
      }
      if (
        args &&
        typeof args === "object" &&
        "startDate" in args &&
        "endDate" in args
      ) {
        return todaySets;
      }
      if (args && typeof args === "object" && Object.keys(args).length === 0) {
        return [];
      }
      throw new Error(`Unexpected query args: ${JSON.stringify(args)}`);
    }),
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

describe("POST /api/coach", () => {
  it("streams deterministic fallback events over SSE", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);

    getCoachRuntimeMock.mockReturnValue(null);
    runPlannerTurnMock.mockReset();

    const { POST } = await import("./route");

    const request = new Request("https://volume.fitness/api/coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "show today's summary" }],
        preferences: {
          unit: "lbs",
          soundEnabled: true,
          timezoneOffsetMinutes: 0,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const events: string[] = [];
    for await (const event of readCoachStreamEvents(response.body!)) {
      events.push(event.type);
      if (event.type === "final") break;
    }

    expect(events).toEqual(["start", "tool_start", "tool_result", "final"]);
  });

  it("streams agent events when runtime is available", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);

    getCoachRuntimeMock.mockReturnValue({
      model: {},
      modelId: "mock-model-id",
    });
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "ok",
      assistantText: "Logged that set.",
      blocks: [
        {
          type: "status",
          tone: "success",
          title: "Set logged",
          description: "Bench press x10",
        },
      ],
      toolsUsed: ["log_set"],
      hitToolLimit: false,
    });

    const { POST } = await import("./route");

    const request = new Request("https://volume.fitness/api/coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "log bench press 10 reps" }],
        preferences: {
          unit: "lbs",
          soundEnabled: true,
          timezoneOffsetMinutes: 0,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const events: Array<{ type: string; model?: string }> = [];
    for await (const event of readCoachStreamEvents(response.body!)) {
      events.push(event);
      if (event.type === "final") break;
    }

    expect(events[0]).toEqual({ type: "start", model: "mock-model-id" });
    expect(events.at(-1)?.type).toBe("final");
    expect(runPlannerTurnMock).toHaveBeenCalledTimes(1);
    expect(runPlannerTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({ modelId: "mock-model-id" }),
        history: [{ role: "user", content: "log bench press 10 reps" }],
      })
    );
  });

  it("enforces per-user rate limits", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub({ rateLimitOk: false });
    ConvexHttpClientMock.mockReturnValue(convex);

    getCoachRuntimeMock.mockReturnValue(null);
    runPlannerTurnMock.mockReset();

    const { POST } = await import("./route");

    const request = new Request("https://volume.fitness/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "show today's summary" }],
        preferences: {
          unit: "lbs",
          soundEnabled: true,
          timezoneOffsetMinutes: 0,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("returns JSON when streaming is not requested", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);

    getCoachRuntimeMock.mockReturnValue(null);
    runPlannerTurnMock.mockReset();

    const { POST } = await import("./route");

    const request = new Request("https://volume.fitness/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "show today's summary" }],
        preferences: {
          unit: "lbs",
          soundEnabled: true,
          timezoneOffsetMinutes: 0,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.assistantText).toBeTruthy();
    expect(Array.isArray(json.blocks)).toBe(true);
  });

  it("returns JSON from planner when runtime is available", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.invalid";
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("token"),
    });

    const convex = createConvexStub();
    ConvexHttpClientMock.mockReturnValue(convex);

    getCoachRuntimeMock.mockReturnValue({
      model: {},
      modelId: "mock-model-id",
    });
    runPlannerTurnMock.mockReset();
    runPlannerTurnMock.mockResolvedValue({
      kind: "ok",
      assistantText: "Summary ready.",
      blocks: [
        {
          type: "metrics",
          title: "Today",
          metrics: [{ label: "Sets", value: "5" }],
        },
      ],
      toolsUsed: ["get_today_summary"],
      hitToolLimit: false,
    });

    const { POST } = await import("./route");

    const request = new Request("https://volume.fitness/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "show today's summary" }],
        preferences: {
          unit: "lbs",
          soundEnabled: true,
          timezoneOffsetMinutes: 0,
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.assistantText).toBe("Summary ready.");
    expect(json.trace.model).toBe("mock-model-id");
    expect(json.trace.fallbackUsed).toBe(false);
    expect(json.trace.toolsUsed).toEqual(["get_today_summary"]);
    expect(runPlannerTurnMock).toHaveBeenCalledTimes(1);
  });
});
