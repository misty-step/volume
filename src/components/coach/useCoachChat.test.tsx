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
const mockMessages: Array<{
  id: string;
  role: string;
  parts: Array<{ type: string; text?: string }>;
}> = [];

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(() => ({
    messages: [...mockMessages],
    status: "ready",
    error: undefined,
    sendMessage: mockSendMessage,
  })),
}));

describe("useCoachChat", () => {
  const getOrCreateTodaySessionMock = vi.fn();
  const undoAgentActionMock = vi.fn();
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages.length = 0;
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
