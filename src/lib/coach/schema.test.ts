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

  it("parses undo blocks", () => {
    const parsed = CoachTurnResponseSchema.parse({
      assistantText: "Logged.",
      blocks: [
        {
          type: "undo",
          actionId: "action_123",
          turnId: "turn_123",
          title: "Undo this log",
          description: "Reverts the set.",
        },
      ],
      trace: { toolsUsed: ["log_set"], model: "test", fallbackUsed: false },
    });

    expect(parsed.blocks[0]?.type).toBe("undo");
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

  it("parses expanded generative-ui block catalog", () => {
    const parsed = CoachTurnResponseSchema.parse({
      assistantText: "Workspace ready.",
      blocks: [
        {
          type: "quick_log_form",
          title: "Quick log",
          defaultUnit: "kg",
        },
        {
          type: "entity_list",
          title: "Exercises",
          items: [
            {
              id: "ex_1",
              title: "Push-ups",
              subtitle: "Chest, Triceps",
              tags: ["active"],
              prompt: "show trend for pushups",
            },
          ],
        },
        {
          type: "detail_panel",
          title: "Preferences",
          fields: [{ label: "Goals", value: "Build muscle", emphasis: true }],
          prompts: ["show settings overview"],
        },
        {
          type: "billing_panel",
          status: "trial",
          title: "Subscription",
          ctaLabel: "Upgrade",
          ctaAction: "open_checkout",
        },
      ],
      trace: {
        toolsUsed: ["show_workspace"],
        model: "test",
        fallbackUsed: false,
      },
    });

    expect(parsed.blocks).toHaveLength(4);
  });

  it("enforces open_checkout/open_billing_portal payload shape", () => {
    expect(() =>
      CoachTurnResponseSchema.parse({
        assistantText: "ok",
        blocks: [
          {
            type: "client_action",
            action: "open_checkout",
            payload: { mode: "portal" },
          },
        ],
        trace: { toolsUsed: [], model: "test", fallbackUsed: false },
      })
    ).toThrow(/open_checkout payload/);

    expect(() =>
      CoachTurnResponseSchema.parse({
        assistantText: "ok",
        blocks: [
          {
            type: "client_action",
            action: "open_billing_portal",
            payload: { mode: "checkout" },
          },
        ],
        trace: { toolsUsed: [], model: "test", fallbackUsed: false },
      })
    ).toThrow(/open_billing_portal payload/);
  });
});
