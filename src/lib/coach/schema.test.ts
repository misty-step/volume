import { describe, expect, it } from "vitest";
import {
  CoachBlockSchema,
  CoachTurnRequestSchema,
  CoachTurnResponseSchema,
} from "./schema";

describe("coach schema", () => {
  it("parses a turn request", () => {
    expect(
      CoachTurnRequestSchema.parse({
        sessionId: "session_123",
        messages: [{ role: "user", content: "10 pushups" }],
        preferences: {
          unit: "lbs",
          soundEnabled: true,
          timezoneOffsetMinutes: 360,
        },
      })
    ).toEqual({
      sessionId: "session_123",
      messages: [{ role: "user", content: "10 pushups" }],
      preferences: {
        unit: "lbs",
        soundEnabled: true,
        timezoneOffsetMinutes: 360,
      },
    });
  });

  it("rejects oversized conversations", () => {
    // 10 messages × ~20,050 chars each ≈ 200,500+ bytes in JSON
    const messages = Array.from({ length: 10 }, () => ({
      role: "user" as const,
      content: "x".repeat(20_000),
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
      trace: {
        toolsUsed: ["log_set"],
        model: "test-model",
        fallbackUsed: false,
      },
    });

    expect(parsed.trace.toolsUsed).toEqual(["log_set"]);
  });

  it("parses a turn response with responseMessages", () => {
    const parsed = CoachTurnResponseSchema.parse({
      assistantText: "Done.",
      responseMessages: [
        { role: "assistant", content: [{ type: "text", text: "Done." }] },
      ],
      trace: {
        toolsUsed: [],
        model: "test-model",
        fallbackUsed: false,
      },
    });

    expect(parsed.responseMessages).toHaveLength(1);
  });

  it("enforces client_action payload shape via CoachBlockSchema", () => {
    expect(() =>
      CoachBlockSchema.parse({
        type: "client_action",
        action: "set_sound",
        payload: { unit: "kg" },
      })
    ).toThrow(/set_sound payload/);

    expect(() =>
      CoachBlockSchema.parse({
        type: "client_action",
        action: "set_weight_unit",
        payload: { enabled: true },
      })
    ).toThrow(/set_weight_unit payload/);

    expect(() =>
      CoachBlockSchema.parse({
        type: "client_action",
        action: "set_weight_unit",
        payload: { unit: "kg", extra: "nope" },
      })
    ).toThrow();
  });

  it("parses undo blocks via CoachBlockSchema", () => {
    const parsed = CoachBlockSchema.parse({
      type: "undo",
      actionId: "action_123",
      turnId: "turn_123",
      title: "Undo this log",
      description: "Reverts the set.",
    });

    expect(parsed.type).toBe("undo");
  });

  it("parses expanded generative-ui block catalog via CoachBlockSchema", () => {
    const quickLog = CoachBlockSchema.parse({
      type: "quick_log_form",
      title: "Quick log",
      defaultUnit: "kg",
    });
    expect(quickLog.type).toBe("quick_log_form");

    const entityList = CoachBlockSchema.parse({
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
    });
    expect(entityList.type).toBe("entity_list");

    const detailPanel = CoachBlockSchema.parse({
      type: "detail_panel",
      title: "Preferences",
      fields: [{ label: "Goals", value: "Build muscle", emphasis: true }],
      prompts: ["show settings overview"],
    });
    expect(detailPanel.type).toBe("detail_panel");

    const billingPanel = CoachBlockSchema.parse({
      type: "billing_panel",
      status: "trial",
      title: "Subscription",
      ctaLabel: "Upgrade",
      ctaAction: "open_checkout",
    });
    expect(billingPanel.type).toBe("billing_panel");
  });

  it("enforces open_checkout/open_billing_portal payload shape", () => {
    expect(() =>
      CoachBlockSchema.parse({
        type: "client_action",
        action: "open_checkout",
        payload: { mode: "portal" },
      })
    ).toThrow(/open_checkout payload/);

    expect(() =>
      CoachBlockSchema.parse({
        type: "client_action",
        action: "open_billing_portal",
        payload: { mode: "checkout" },
      })
    ).toThrow(/open_billing_portal payload/);
  });
});
