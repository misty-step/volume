// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const streamTextMock = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    streamText: (...args: unknown[]) => streamTextMock(...args),
  };
});

const context = {
  latestUserText: "show today's summary",
  conversationSummary: "User has been training push-ups.",
  preferences: { unit: "lbs", soundEnabled: true },
  planner: {
    kind: "ok" as const,
    assistantText: "Here is your summary.",
    toolsUsed: ["get_today_summary"],
    hitToolLimit: false,
    toolResults: [
      {
        toolName: "get_today_summary",
        input: {},
        summary: "Prepared today's summary.",
        outputForModel: { status: "ok", total_sets: 6 },
        legacyBlocks: [],
      },
    ],
  },
  followUpPrompts: ["show trend for push-ups"],
};

describe("streamCoachPresentation", () => {
  beforeEach(() => {
    streamTextMock.mockReset();
    streamTextMock.mockReturnValue({ ok: true });
  });

  it("builds the presentation model call with prompt context", async () => {
    const { streamCoachPresentation } = await import("./compose");

    const runtime = { model: { id: "mock-model" } } as any;
    const result = streamCoachPresentation({ runtime, context });

    expect(result).toEqual({ ok: true });
    expect(streamTextMock).toHaveBeenCalledTimes(1);

    const call = streamTextMock.mock.calls[0][0] as {
      model: unknown;
      system: string;
      messages: Array<{ role: string; content: string }>;
      abortSignal: AbortSignal;
    };

    expect(call.model).toBe(runtime.model);
    expect(call.system).toContain("Volume Coach's presentation composer");
    expect(call.messages[0]?.role).toBe("user");
    expect(call.messages[0]?.content).toContain(
      '"user_request": "show today\'s summary"'
    );
    expect(call.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("passes through an aborted signal into the presentation request", async () => {
    const { streamCoachPresentation } = await import("./compose");

    const controller = new AbortController();
    controller.abort(new Error("stop"));

    streamCoachPresentation({
      runtime: { model: { id: "mock-model" } } as any,
      context,
      signal: controller.signal,
    });

    const call = streamTextMock.mock.calls[0][0] as {
      abortSignal: AbortSignal;
    };
    expect(call.abortSignal.aborted).toBe(true);
  });

  it("falls back when AbortSignal.any is unavailable and mirrors later aborts", async () => {
    const { streamCoachPresentation } = await import("./compose");
    const anyDescriptor = Object.getOwnPropertyDescriptor(AbortSignal, "any");

    Object.defineProperty(AbortSignal, "any", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      const controller = new AbortController();

      streamCoachPresentation({
        runtime: { model: { id: "mock-model" } } as any,
        context,
        signal: controller.signal,
      });

      const call = streamTextMock.mock.calls[0][0] as {
        abortSignal: AbortSignal;
      };

      expect(call.abortSignal.aborted).toBe(false);

      controller.abort(new Error("stop later"));

      expect(call.abortSignal.aborted).toBe(true);
    } finally {
      if (anyDescriptor) {
        Object.defineProperty(AbortSignal, "any", anyDescriptor);
      } else {
        delete (AbortSignal as typeof AbortSignal & { any?: unknown }).any;
      }
    }
  });
});
