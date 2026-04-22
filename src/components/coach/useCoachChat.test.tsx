import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as convexReact from "convex/react";
import { useCoachChat } from "./useCoachChat";

const analyticsMocks = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockReportError: vi.fn(),
}));
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
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: analyticsMocks.mockTrackEvent,
  reportError: analyticsMocks.mockReportError,
}));

const mockSendMessage = vi.fn();
const chatCallbacks: {
  onData?: ((dataPart: unknown) => void) | undefined;
  onFinish?: ((event: Record<string, unknown>) => void) | undefined;
} = {};
const mockMessages: Array<{
  id: string;
  role: string;
  parts: Array<{ type: string; text?: string }>;
}> = [];

const mockUseChat = vi.fn(
  (options?: {
    onData?: (dataPart: unknown) => void;
    onFinish?: (event: Record<string, unknown>) => void;
  }) => {
    chatCallbacks.onData = options?.onData;
    chatCallbacks.onFinish = options?.onFinish;
    return {
      messages: [...mockMessages],
      status: "ready",
      error: undefined,
      sendMessage: mockSendMessage,
    };
  }
);

vi.mock("@ai-sdk/react", () => ({
  useChat: (options?: unknown) => mockUseChat(options),
}));

describe("useCoachChat", () => {
  const getOrCreateTodaySessionMock = vi.fn();
  const undoAgentActionMock = vi.fn();
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages.length = 0;
    chatCallbacks.onData = undefined;
    chatCallbacks.onFinish = undefined;
    window.localStorage.clear();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

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
  });

  it("bootstraps today's session on mount", async () => {
    renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(getOrCreateTodaySessionMock).toHaveBeenCalledWith({
        timezoneOffsetMinutes: expect.any(Number),
      });
    });
  });

  it("tracks kickoff reached once per session when the workspace boots", async () => {
    renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(analyticsMocks.mockTrackEvent).toHaveBeenCalledWith(
        "Kickoff Reached",
        {
          session_id: "session_123",
          source: "page_load",
        }
      );
    });
  });

  it("sends a prompt via useChat sendMessage", async () => {
    const { result } = renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(getOrCreateTodaySessionMock).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.sendPrompt("log 10 pushups");
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      { text: "log 10 pushups" },
      expect.objectContaining({
        body: expect.objectContaining({
          sessionId: "session_123",
          preferences: expect.objectContaining({
            unit: "lbs",
            soundEnabled: true,
            timezoneOffsetMinutes: expect.any(Number),
          }),
        }),
      })
    );
  });

  it("tracks first message and first log from streamed coach trace data", async () => {
    const { result } = renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(getOrCreateTodaySessionMock).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.sendPrompt("log 10 pushups");
    });

    act(() => {
      chatCallbacks.onData?.({
        type: "data-coach_trace",
        data: {
          session_id: "session_123",
          tool_calls_count: 1,
          turn_index: 0,
          first_logged_exercise: "Push-ups",
        },
      });
      chatCallbacks.onFinish?.({
        isAbort: false,
        isDisconnect: false,
        isError: false,
      });
    });

    expect(analyticsMocks.mockTrackEvent).toHaveBeenCalledWith(
      "First Message",
      {
        session_id: "session_123",
        turn_index: 0,
        tool_calls_count: 1,
      }
    );
    expect(analyticsMocks.mockTrackEvent).toHaveBeenCalledWith("First Log", {
      session_id: "session_123",
      exercise: "Push-ups",
      time_to_first_log_ms: expect.any(Number),
    });
  });

  it.each([
    { isAbort: true, isDisconnect: false, isError: false },
    { isAbort: false, isDisconnect: true, isError: false },
    { isAbort: false, isDisconnect: false, isError: true },
    { isAbort: false, isDisconnect: false, isError: false },
  ])(
    "does not track first-turn events when finish is not eligible: %j",
    async (finishEvent) => {
      renderHook(() => useCoachChat());

      await waitFor(() => {
        expect(getOrCreateTodaySessionMock).toHaveBeenCalled();
      });

      analyticsMocks.mockTrackEvent.mockClear();

      act(() => {
        if (
          !finishEvent.isError &&
          !finishEvent.isAbort &&
          !finishEvent.isDisconnect
        ) {
          chatCallbacks.onData?.({
            type: "data-unknown",
            data: {},
          });
        }

        chatCallbacks.onFinish?.(finishEvent);
      });

      expect(analyticsMocks.mockTrackEvent).not.toHaveBeenCalled();
    }
  );

  it("submits follow-up prompts through the typed submit_prompt action", async () => {
    const { result } = renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(getOrCreateTodaySessionMock).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.jsonRenderHandlers.submit_prompt?.({
        prompt: "show today's summary",
      });
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      { text: "show today's summary" },
      expect.any(Object)
    );
  });

  it("prefills the composer without sending when prefill_prompt runs", async () => {
    const { result } = renderHook(() => useCoachChat());

    await act(async () => {
      await result.current.jsonRenderHandlers.prefill_prompt?.({
        prompt: "show analytics overview",
      });
    });

    expect(result.current.input).toBe("show analytics overview");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("applies typed preference actions for unit and sound", async () => {
    const { result } = renderHook(() => useCoachChat());

    await act(async () => {
      await result.current.jsonRenderHandlers.set_preference?.({
        key: "unit",
        value: "kg",
      });
      await result.current.jsonRenderHandlers.set_preference?.({
        key: "sound_enabled",
        value: false,
      });
    });

    expect(mockSetUnit).toHaveBeenCalledWith("kg");
    expect(mockSetSoundEnabled).toHaveBeenCalledWith(false);
  });

  it("builds a structured quick log prompt from quick_log_submit", async () => {
    const { result } = renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(getOrCreateTodaySessionMock).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.jsonRenderHandlers.quick_log_submit?.({
        exerciseName: "Push-ups",
        reps: "12",
        durationSeconds: null,
        weight: "45",
        unit: "kg",
      });
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      { text: "12 Push-ups @ 45 kg" },
      expect.any(Object)
    );
  });

  it("routes undo_agent_action through the undo mutation", async () => {
    const { result } = renderHook(() => useCoachChat());

    await act(async () => {
      await result.current.jsonRenderHandlers.undo_agent_action?.({
        actionId: "action_123",
        turnId: "turn_456",
      });
    });

    expect(undoAgentActionMock).toHaveBeenCalledWith({
      actionId: "action_123",
    });
  });

  it("navigates to pricing for open_checkout", async () => {
    const { result } = renderHook(() => useCoachChat());

    await act(async () => {
      await result.current.jsonRenderHandlers.open_checkout?.({});
    });

    expect(mockPush).toHaveBeenCalledWith("/pricing");
  });

  it("reports billing portal failures for open_billing_portal", async () => {
    const { result } = renderHook(() => useCoachChat());

    await act(async () => {
      await result.current.jsonRenderHandlers.open_billing_portal?.({});
    });

    expect(analyticsMocks.mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: "useCoachChat",
        operation: "openBillingPortal",
      })
    );
  });
});
