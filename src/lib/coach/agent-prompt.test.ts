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
});
