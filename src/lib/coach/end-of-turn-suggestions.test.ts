import { describe, expect, it } from "vitest";
import { buildEndOfTurnSuggestions } from "./end-of-turn-suggestions";

describe("buildEndOfTurnSuggestions", () => {
  it.each([
    [
      ["log_set"],
      [
        "show today's summary",
        "what should I work on today?",
        "show trend for pushups",
      ],
    ],
    [
      ["get_exercise_snapshot"],
      ["10 pushups", "show today's summary", "show analytics overview"],
    ],
    [
      ["get_exercise_trend"],
      ["10 pushups", "show today's summary", "show analytics overview"],
    ],
    [
      ["get_today_summary"],
      [
        "what should I work on today?",
        "show trend for pushups",
        "show analytics overview",
      ],
    ],
    [
      ["get_focus_suggestions"],
      ["show today's summary", "show trend for pushups", "10 pushups"],
    ],
    [["delete_set"], ["show history overview", "show today's summary"]],
    [
      ["rename_exercise"],
      [
        "show exercise library",
        "show today's summary",
        "show history overview",
      ],
    ],
    [
      ["get_analytics_overview"],
      [
        "show today's summary",
        "show history overview",
        "show exercise library",
      ],
    ],
    [
      ["get_report_history"],
      [
        "show today's summary",
        "show history overview",
        "show exercise library",
      ],
    ],
    [
      ["get_history_overview"],
      [
        "show today's summary",
        "show analytics overview",
        "show settings overview",
      ],
    ],
    [
      ["get_settings_overview"],
      [
        "show today's summary",
        "what should I work on today?",
        "show analytics overview",
      ],
    ],
    [
      ["set_weight_unit"],
      [
        "show today's summary",
        "what should I work on today?",
        "show analytics overview",
      ],
    ],
    [
      ["show_workspace"],
      ["show today's summary", "10 pushups", "what should I work on today?"],
    ],
    [
      ["some_future_tool"],
      ["show today's summary", "what should I work on today?"],
    ],
  ])("returns %j for %j", (toolsUsed, expected) => {
    expect(buildEndOfTurnSuggestions(toolsUsed)).toEqual(expected);
  });

  it("returns null when no tools ran", () => {
    expect(buildEndOfTurnSuggestions([])).toBeNull();
  });
});
