import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as convexReact from "convex/react";
import { useCoachChat } from "./useCoachChat";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSetUnit = vi.fn();
vi.mock("@/contexts/WeightUnitContext", () => ({
  useWeightUnit: () => ({ unit: "lbs", setUnit: mockSetUnit }),
}));

const mockSetSoundEnabled = vi.fn();
vi.mock("@/hooks/useTactileSoundPreference", () => ({
  useTactileSoundPreference: () => ({
    soundEnabled: true,
    setSoundEnabled: mockSetSoundEnabled,
  }),
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  reportError: vi.fn(),
}));

const readCoachStreamEventsMock = vi.fn();
vi.mock("@/lib/coach/sse-client", () => ({
  readCoachStreamEvents: (...args: unknown[]) =>
    readCoachStreamEventsMock(...args),
}));

describe("useCoachChat", () => {
  const getOrCreateTodaySessionMock = vi.fn();
  const undoAgentActionMock = vi.fn();
  const useQueryState = {
    sessionMessages: [] as Array<Record<string, unknown>>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useQueryState.sessionMessages = [];

    getOrCreateTodaySessionMock.mockResolvedValue({
      session: { _id: "session_123", status: "active" },
      messages: [],
    });

    let mutationCall = 0;
    vi.mocked(convexReact.useMutation).mockImplementation(() => {
      mutationCall += 1;
      if (mutationCall === 1) {
        return getOrCreateTodaySessionMock;
      }
      return undoAgentActionMock;
    });

    vi.mocked(convexReact.useQuery).mockImplementation((_fn, args) => {
      if (args === "skip") return undefined;
      if (args && typeof args === "object" && "sessionId" in args) {
        return useQueryState.sessionMessages;
      }
      return undefined;
    });

    readCoachStreamEventsMock.mockImplementation(async function* () {
      yield {
        type: "final",
        response: {
          assistantText: "Fresh answer.",
          blocks: [],
          responseMessages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "Fresh answer." }],
            },
          ],
          trace: {
            toolsUsed: [],
            model: "mock-model",
            fallbackUsed: false,
          },
        },
      };
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/event-stream" }),
      body: {},
    }) as unknown as typeof fetch;
  });

  it("bootstraps today's session and hydrates the timeline from stored messages", async () => {
    useQueryState.sessionMessages = [
      {
        _id: "msg_1",
        role: "user",
        content: JSON.stringify({ role: "user", content: "previous question" }),
        createdAt: 1,
      },
      {
        _id: "msg_2",
        role: "assistant",
        content: JSON.stringify({
          role: "assistant",
          content: [{ type: "text", text: "previous answer" }],
        }),
        blocks: JSON.stringify([
          { type: "status", tone: "success", title: "Loaded" },
        ]),
        createdAt: 2,
      },
      {
        _id: "msg_3",
        role: "tool",
        content: JSON.stringify({
          role: "tool",
          content: [{ type: "tool-result", toolName: "log_set", output: {} }],
        }),
        createdAt: 3,
      },
    ];

    const { result } = renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(getOrCreateTodaySessionMock).toHaveBeenCalledWith({
        timezoneOffsetMinutes: expect.any(Number),
      });
      expect(result.current.timeline).toHaveLength(2);
    });

    expect(result.current.timeline[0]).toMatchObject({
      role: "user",
      text: "previous question",
    });
    expect(result.current.timeline[1]).toMatchObject({
      role: "assistant",
      text: "previous answer",
    });
    expect(result.current.timeline[1]?.blocks).toHaveLength(1);
  });

  it("includes the persisted sessionId when sending a prompt", async () => {
    const { result } = renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(getOrCreateTodaySessionMock).toHaveBeenCalled();
      expect(vi.mocked(convexReact.useQuery)).toHaveBeenCalledWith(
        expect.anything(),
        { sessionId: "session_123" }
      );
    });

    await act(async () => {
      await result.current.sendPrompt("log 10 pushups");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/coach",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      })
    );

    const [, requestInit] = vi.mocked(global.fetch).mock.calls[0]!;
    const body = JSON.parse(String(requestInit?.body));

    expect(body.sessionId).toBe("session_123");
    expect(body.messages.at(-1)).toEqual({
      role: "user",
      content: "log 10 pushups",
    });
  });
});
