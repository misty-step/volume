import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../../test/utils";
import { CoachPrototype } from "./CoachPrototype";
import { useCoachChat } from "@/components/coach/useCoachChat";

vi.mock("@/components/coach/useCoachChat", () => ({
  useCoachChat: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe("CoachPrototype", () => {
  const mockedUseCoachChat = vi.mocked(useCoachChat);
  const originalVisualViewport = window.visualViewport;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    vi.clearAllMocks();
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
    const setInput = vi.fn();
    const sendPrompt = vi.fn();
    const undoAction = vi.fn();
    const runClientAction = vi.fn();

    mockedUseCoachChat.mockReturnValue({
      input: "Hello coach",
      setInput,
      isWorking: false,
      lastTrace: null,
      timeline: [
        { id: "m1", role: "assistant", text: "Hi" },
        { id: "m2", role: "user", text: "Hello coach" },
      ],
      unit: "lbs",
      soundEnabled: false,
      endRef: { current: null },
      sendPrompt,
      undoAction,
      runClientAction,
    } as any);

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
  });

  it("submits the current input", async () => {
    const setInput = vi.fn();
    const sendPrompt = vi.fn();
    const undoAction = vi.fn();
    const runClientAction = vi.fn();

    mockedUseCoachChat.mockReturnValue({
      input: "What should I train today?",
      setInput,
      isWorking: false,
      lastTrace: null,
      timeline: [{ id: "m1", role: "assistant", text: "Hi" }],
      unit: "lbs",
      soundEnabled: false,
      endRef: { current: null },
      sendPrompt,
      undoAction,
      runClientAction,
    } as any);

    render(<CoachPrototype />);

    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(sendPrompt).toHaveBeenCalledWith("What should I train today?");
  });

  it("keeps composer above keyboard when visual viewport shrinks", async () => {
    const setInput = vi.fn();
    const sendPrompt = vi.fn();
    const undoAction = vi.fn();
    const runClientAction = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: 600,
        offsetTop: 0,
        addEventListener,
        removeEventListener,
      },
    });

    mockedUseCoachChat.mockReturnValue({
      input: "",
      setInput,
      isWorking: false,
      lastTrace: null,
      timeline: [{ id: "m1", role: "assistant", text: "Hi" }],
      unit: "lbs",
      soundEnabled: false,
      endRef: { current: null },
      sendPrompt,
      undoAction,
      runClientAction,
    } as any);

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
});
