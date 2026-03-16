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

const mockSendMessage = vi.fn();
const mockMessages: Array<{
  id: string;
  role: string;
  parts: Array<{ type: string; text?: string }>;
}> = [];

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(() => ({
    messages: mockMessages,
    status: "ready",
    error: undefined,
    sendMessage: mockSendMessage,
  })),
}));

/** Build JSONL patches for a single json-render element. */
function makeJsonl(
  rootKey: string,
  type: string,
  props: Record<string, unknown>
): string {
  return [
    `{"op":"add","path":"/root","value":"${rootKey}"}`,
    `{"op":"add","path":"/elements/${rootKey}","value":{"type":"${type}","props":${JSON.stringify(props)},"children":[]}}`,
  ].join("\n");
}

describe("useCoachChat", () => {
  const getOrCreateTodaySessionMock = vi.fn();
  const undoAgentActionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages.length = 0;

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

    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
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
          preferences: expect.objectContaining({
            unit: "lbs",
            soundEnabled: true,
          }),
        }),
      })
    );
  });

  it("applies set_weight_unit ClientAction from spec in text parts", async () => {
    const jsonl = makeJsonl("ca1", "ClientAction", {
      action: "set_weight_unit",
      payload: { unit: "kg" },
    });
    mockMessages.push({
      id: "msg1",
      role: "assistant",
      parts: [{ type: "text", text: jsonl }],
    });

    renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(mockSetUnit).toHaveBeenCalledWith("kg");
    });
  });

  it("applies set_sound ClientAction from spec in text parts", async () => {
    const jsonl = makeJsonl("ca1", "ClientAction", {
      action: "set_sound",
      payload: { enabled: false },
    });
    mockMessages.push({
      id: "msg1",
      role: "assistant",
      parts: [{ type: "text", text: jsonl }],
    });

    renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(mockSetSoundEnabled).toHaveBeenCalledWith(false);
    });
  });

  it("navigates to pricing for open_checkout ClientAction", async () => {
    const jsonl = makeJsonl("ca1", "ClientAction", {
      action: "open_checkout",
      payload: { mode: "checkout" },
    });
    mockMessages.push({
      id: "msg1",
      role: "assistant",
      parts: [{ type: "text", text: jsonl }],
    });

    renderHook(() => useCoachChat());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/pricing");
    });
  });
});
