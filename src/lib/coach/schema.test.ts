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
        preferences: {
          unit: "lbs",
          soundEnabled: true,
          timezoneOffsetMinutes: 360,
        },
      })
    ).toEqual({
      messages: [{ role: "user", content: "10 pushups" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 360,
      },
    });
  });

  it("rejects oversized conversations", () => {
    const messages = Array.from({ length: 20 }, () => ({
      role: "user",
      content: "x".repeat(3000),
    }));

    expect(() =>
      CoachTurnRequestSchema.parse({
        messages,
        preferences: { unit: "lbs", soundEnabled: true },
      })
    ).toThrow(/Conversation too large/);
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

  it("enforces client_action payload shape", () => {
    expect(() =>
      CoachTurnResponseSchema.parse({
        assistantText: "ok",
        blocks: [
          {
            type: "client_action",
            action: "set_sound",
            payload: { unit: "kg" },
          },
        ],
        trace: { toolsUsed: [], model: "test", fallbackUsed: false },
      })
    ).toThrow(/set_sound payload/);

    expect(() =>
      CoachTurnResponseSchema.parse({
        assistantText: "ok",
        blocks: [
          {
            type: "client_action",
            action: "set_weight_unit",
            payload: { enabled: true },
          },
        ],
        trace: { toolsUsed: [], model: "test", fallbackUsed: false },
      })
    ).toThrow(/set_weight_unit payload/);

    expect(() =>
      CoachTurnResponseSchema.parse({
        assistantText: "ok",
        blocks: [
          {
            type: "client_action",
            action: "set_weight_unit",
            payload: { unit: "kg", extra: "nope" },
          },
        ],
        trace: { toolsUsed: [], model: "test", fallbackUsed: false },
      })
    ).toThrow();
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
