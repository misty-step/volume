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
      "After log_set: respond with one brief confirmation"
    );
  });

  it("forbids repeating block data in text", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain(
      "Don't repeat raw numbers shown in blocks"
    );
  });

  it("allows empty string responses", () => {
    expect(COACH_AGENT_SYSTEM_PROMPT).toContain("respond with an empty string");
  });
});
