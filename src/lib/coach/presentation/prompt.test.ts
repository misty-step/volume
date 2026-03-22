// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  buildCoachPresentationSystemPrompt,
  buildCoachPresentationUserPrompt,
} from "./prompt";

describe("coach presentation prompt", () => {
  it("includes user preferences and catalog guidance", () => {
    const prompt = buildCoachPresentationSystemPrompt({
      preferences: { unit: "kg", soundEnabled: false },
      conversationSummary: "User has been focusing on push-ups.",
    });

    expect(prompt).toContain("default weight unit: kg");
    expect(prompt).toContain("tactile sounds: disabled");
    expect(prompt).toContain("Conversation summary:");
    expect(prompt).toContain("ActionTray");
  });

  it("serializes planner output for the presentation composer", () => {
    const prompt = buildCoachPresentationUserPrompt({
      latestUserText: "show today's summary",
      preferences: { unit: "lbs", soundEnabled: true },
      planner: {
        kind: "ok",
        assistantText: "Here is today's summary.",
        toolsUsed: ["get_today_summary"],
        hitToolLimit: false,
        toolResults: [
          {
            toolName: "get_today_summary",
            input: {},
            summary: "Prepared today's summary.",
            outputForModel: { total_sets: 5, total_reps: 40 },
            legacyBlocks: [],
          },
        ],
      },
      followUpPrompts: ["show trend for pushups"],
    });

    expect(prompt).toContain('"user_request": "show today\'s summary"');
    expect(prompt).toContain('"tool_name": "get_today_summary"');
    expect(prompt).toContain('"follow_up_prompts": [');
  });
});
