import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { act } from "@testing-library/react";
import { render, screen, waitFor } from "@/test/utils";
import { CoachPrototype } from "./CoachPrototype";
import { useCoachChat } from "@/components/coach/useCoachChat";
import type { UIMessage } from "ai";

const { mockExerciseTicker, mockReportError, mockSearchParamGet } = vi.hoisted(
  () => ({
    mockExerciseTicker: vi.fn(() => (
      <div data-testid="exercise-ticker">Ticker</div>
    )),
    mockReportError: vi.fn(),
    mockSearchParamGet: vi.fn(() => null),
  })
);

vi.mock("@/components/coach/useCoachChat", () => ({
  useCoachChat: vi.fn(),
}));

vi.mock("@/components/coach/ExerciseTicker", () => ({
  ExerciseTicker: () => mockExerciseTicker(),
}));

vi.mock("@/lib/analytics", () => ({
  reportError: mockReportError,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockSearchParamGet,
  }),
}));

function makeUIMessage(
  overrides: Partial<UIMessage> & { role: UIMessage["role"]; text?: string }
): UIMessage {
  const { text, ...rest } = overrides;
  return {
    id: rest.id ?? crypto.randomUUID(),
    role: rest.role,
    parts: text ? [{ type: "text" as const, text }] : [],
    createdAt: new Date(),
    ...rest,
  } as UIMessage;
}

describe("CoachPrototype", () => {
  const mockedUseCoachChat = vi.mocked(useCoachChat);
  const originalVisualViewport = window.visualViewport;
  const originalInnerHeight = window.innerHeight;

  const buildChatState = (overrides?: Record<string, unknown>) =>
    ({
      input: "",
      setInput: vi.fn(),
      isWorking: false,
      messages: [makeUIMessage({ id: "m1", role: "assistant", text: "Hi" })],
      spec: null,
      specsByMessage: new Map(),
      unit: "lbs",
      soundEnabled: false,
      endRef: { current: null },
      sendPrompt: vi.fn(),
      undoAction: vi.fn(),
      runClientAction: vi.fn(),
      ...overrides,
    }) as unknown as ReturnType<typeof useCoachChat>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamGet.mockReturnValue(null);
    mockExerciseTicker.mockImplementation(() => (
      <div data-testid="exercise-ticker">Ticker</div>
    ));
  });

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: originalVisualViewport,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it("renders a scrollable timeline and composer", () => {
    mockedUseCoachChat.mockReturnValue(
      buildChatState({
        input: "Hello coach",
        messages: [
          makeUIMessage({ id: "m1", role: "assistant", text: "Hi" }),
          makeUIMessage({ id: "m2", role: "user", text: "Hello coach" }),
        ],
      })
    );

    render(<CoachPrototype />);

    expect(
      screen.getByText(/Try "12 pushups", "show today's summary"/i)
    ).toBeInTheDocument();

    const timeline = screen.getByTestId("coach-timeline");
    expect(timeline).toHaveClass("overflow-y-auto");
    expect(timeline).toHaveClass("flex-1");
    expect(timeline).toHaveClass("min-h-0");

    expect(screen.getByTestId("coach-composer")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Hello coach");
    expect(screen.getByRole("button", { name: /send/i })).toBeEnabled();
    expect(mockedUseCoachChat).toHaveBeenCalledWith({
      kickoffSource: "page_load",
    });
  });

  it("marks prompt-driven entries as deeplinks", () => {
    mockSearchParamGet.mockImplementation((key: string) =>
      key === "prompt" ? "show history overview" : null
    );
    mockedUseCoachChat.mockReturnValue(buildChatState());

    render(<CoachPrototype />);

    expect(mockedUseCoachChat).toHaveBeenCalledWith({
      kickoffSource: "deeplink",
    });
  });

  it("submits the current input", async () => {
    const sendPrompt = vi.fn();
    mockedUseCoachChat.mockReturnValue(
      buildChatState({
        input: "What should I train today?",
        sendPrompt,
      })
    );

    render(<CoachPrototype />);

    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(sendPrompt).toHaveBeenCalledWith("What should I train today?");
  });

  it("keeps composer above keyboard when visual viewport shrinks", async () => {
    const listeners: Record<string, Array<() => void>> = {};
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const viewport = {
      height: 600,
      offsetTop: 0,
      addEventListener,
      removeEventListener,
    };
    addEventListener.mockImplementation(
      (event: string, callback: () => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event].push(callback);
      }
    );

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    mockedUseCoachChat.mockReturnValue(buildChatState());

    const { unmount } = render(<CoachPrototype />);

    const composer = screen.getByTestId("coach-composer");

    await waitFor(() => {
      expect(composer.style.bottom).toBe("300px");
    });
    expect(addEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
    expect(addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function)
    );

    viewport.height = 900;
    await act(async () => {
      listeners.resize?.[0]?.();
    });
    await waitFor(() => {
      expect(composer.style.bottom).toBe("0px");
    });

    viewport.height = 700;
    await act(async () => {
      listeners.scroll?.[0]?.();
    });
    await waitFor(() => {
      expect(composer.style.bottom).toBe("200px");
    });

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function)
    );
  });

  it("falls back to zero keyboard offset when visualViewport is unavailable", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });

    mockedUseCoachChat.mockReturnValue(buildChatState());
    render(<CoachPrototype />);

    expect(screen.getByTestId("coach-composer").style.bottom).toBe("0px");
  });

  it("scrolls input into view on focus", async () => {
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView");
    mockedUseCoachChat.mockReturnValue(buildChatState());

    render(<CoachPrototype />);

    scrollSpy.mockClear();
    await userEvent.click(screen.getByRole("textbox"));
    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });
    });
  });

  it("keeps the workspace shell available when the ticker crashes", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockExerciseTicker.mockImplementation(() => {
      throw new Error("Ticker query failed");
    });
    mockedUseCoachChat.mockReturnValue(buildChatState());

    render(<CoachPrototype />);

    expect(screen.getByTestId("coach-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("coach-composer")).toBeInTheDocument();
    expect(screen.getByTestId("coach-ticker-fallback")).toBeInTheDocument();
    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Ticker query failed" }),
      expect.objectContaining({
        component: "CoachTickerBoundary",
        operation: "render",
      })
    );

    consoleErrorSpy.mockRestore();
  });
});
