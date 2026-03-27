import { describe, expect, it } from "vitest";
import { COACH_AGENT_SYSTEM_PROMPT } from "./agent-prompt";

describe("coach agent prompt", () => {
  it("includes the core contract", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain("Model decides WHAT to do.");
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain("Tools decide HOW it is done.");
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      "UI schema decides HOW it is rendered."
    );
  });

  it("instructs brief confirmation after log_set", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      "After log_sets: respond with one brief confirmation"
    );
  });

  it("routes model choices through canonical tool families", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain("query_workouts");
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain("query_exercise");
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain("manage_exercise");
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain("log_sets");
  });

  it("requires 2-3 contextual follow-up suggestions after tool calls", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      "include 2-3 contextual follow-up suggestions"
    );
  });

  it("forbids repeating block data in text", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      "Don't repeat raw numbers shown in blocks"
    );
  });

  it("requires minimal follow-up text instead of empty responses", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).not.toContain(
      "respond with an empty string"
    );
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      "still include the Suggestions block after tool calls"
    );
  });

  it("routes billing questions through the overview tool", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      "Profile / subscription / billing overview → get_settings_overview."
    );
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      'Preference changes only → update_settings with action "weight_unit", "sound", or "preferences".'
    );
  });
});
