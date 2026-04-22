import { beforeEach, describe, expect, it, vi } from "vitest";

const analyticsMocks = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

import {
  trackCoachFirstTurn,
  trackCoachKickoff,
} from "@/lib/coach/session-funnel";

describe("session-funnel", () => {
  const now = 1_700_000_000_000;
  const eightDays = 8 * 24 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.spyOn(Date, "now").mockReturnValue(now);
  });

  it("tracks kickoff once per session", () => {
    trackCoachKickoff("session_123", "page_load");
    trackCoachKickoff("session_123", "page_load");

    expect(analyticsMocks.trackEvent).toHaveBeenCalledTimes(1);
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith("Kickoff Reached", {
      session_id: "session_123",
      source: "page_load",
    });
  });

  it("tracks first message and first log once per session", () => {
    trackCoachKickoff("session_123", "page_load");
    analyticsMocks.trackEvent.mockClear();

    trackCoachFirstTurn({
      session_id: "session_123",
      tool_calls_count: 2,
      turn_index: 0,
      first_logged_exercise: "Push-ups",
    });
    trackCoachFirstTurn({
      session_id: "session_123",
      tool_calls_count: 2,
      turn_index: 0,
      first_logged_exercise: "Push-ups",
    });

    expect(analyticsMocks.trackEvent.mock.calls).toEqual([
      [
        "First Message",
        {
          session_id: "session_123",
          turn_index: 0,
          tool_calls_count: 2,
        },
      ],
      [
        "First Log",
        {
          session_id: "session_123",
          exercise: "Push-ups",
          time_to_first_log_ms: 0,
        },
      ],
    ]);
  });

  it("prunes stale session tracking keys before writing new data", () => {
    window.localStorage.setItem(
      "volume:coach-session:old-session:kickoff_at",
      String(now - eightDays)
    );
    window.localStorage.setItem(
      "volume:coach-session:old-session:first_message",
      String(now - eightDays)
    );
    window.localStorage.setItem("volume:keep", "unchanged");

    trackCoachKickoff("session_123", "page_load");

    expect(
      window.localStorage.getItem("volume:coach-session:old-session:kickoff_at")
    ).toBeNull();
    expect(
      window.localStorage.getItem(
        "volume:coach-session:old-session:first_message"
      )
    ).toBeNull();
    expect(window.localStorage.getItem("volume:keep")).toBe("unchanged");
  });

  it("prunes stale session tracking keys during first-turn tracking", () => {
    window.localStorage.setItem(
      "volume:coach-session:old-session:first_log",
      String(now - eightDays)
    );

    trackCoachFirstTurn({
      session_id: "session_456",
      tool_calls_count: 1,
      turn_index: 0,
      first_logged_exercise: "Bench Press",
    });

    expect(
      window.localStorage.getItem("volume:coach-session:old-session:first_log")
    ).toBeNull();
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith("First Message", {
      session_id: "session_456",
      turn_index: 0,
      tool_calls_count: 1,
    });
  });
});
