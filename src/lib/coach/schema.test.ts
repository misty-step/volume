import { describe, expect, it } from "vitest";
import {
  CoachStreamEventSchema,
  CoachTurnRequestSchema,
  CoachTurnResponseSchema,
} from "./schema";

describe("coach schema", () => {
  it("parses a turn request", () => {
    expect(
      CoachTurnRequestSchema.parse({
        messages: [{ role: "user", content: "10 pushups" }],
        preferences: { unit: "lbs", soundEnabled: true },
      })
    ).toEqual({
      messages: [{ role: "user", content: "10 pushups" }],
      preferences: { unit: "lbs", soundEnabled: true },
    });
  });

  it("parses a turn response", () => {
    const parsed = CoachTurnResponseSchema.parse({
      assistantText: "Logged.",
      blocks: [
        {
          type: "status",
          tone: "success",
          title: "Logged set",
          description: "ok",
        },
        { type: "suggestions", prompts: ["show today's summary"] },
      ],
      trace: {
        toolsUsed: ["log_set"],
        model: "test-model",
        fallbackUsed: false,
      },
    });

    expect(parsed.trace.toolsUsed).toEqual(["log_set"]);
  });

  it("parses a stream tool_result event", () => {
    const parsed = CoachStreamEventSchema.parse({
      type: "tool_result",
      toolName: "log_set",
      blocks: [
        {
          type: "status",
          tone: "success",
          title: "Logged",
          description: "done",
        },
      ],
    });

    expect(parsed.type).toBe("tool_result");
    expect(parsed.blocks).toHaveLength(1);
  });
});
