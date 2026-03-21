// @vitest-environment node

import { describe, expect, it } from "vitest";
import { catalog, COACH_BLOCK_TYPES } from "./catalog";

describe("coach catalog", () => {
  const ALL_BLOCK_TYPES = [
    "Status",
    "Metrics",
    "Trend",
    "Table",
    "EntityList",
    "DetailPanel",
    "Suggestions",
    "BillingPanel",
    "QuickLogForm",
    "Confirmation",
    "ClientAction",
    "Undo",
  ] as const;

  it("exports all 12 block types", () => {
    expect(COACH_BLOCK_TYPES).toHaveLength(12);
    for (const type of ALL_BLOCK_TYPES) {
      expect(COACH_BLOCK_TYPES).toContain(type);
    }
  });

  it("generates a prompt containing all component definitions", () => {
    const prompt = catalog.prompt({ mode: "inline" });
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);

    for (const type of ALL_BLOCK_TYPES) {
      expect(prompt).toContain(type);
    }
  });

  /** Helper: json-render's React schema requires `children: []` on leaf elements. */
  function leaf(type: string, props: Record<string, unknown>) {
    return { type, props, children: [] };
  }

  it("rejects a spec with an unknown component type", () => {
    const result = catalog.validate({
      root: "s1",
      elements: {
        s1: leaf("FakeComponent", { title: "nope" }),
      },
    });
    expect(result.success).toBe(false);
  });

  it.each([
    [
      "Status",
      {
        tone: "success",
        title: "Logged set",
        description: null,
      },
    ],
    [
      "Metrics",
      {
        title: "Today's workout",
        metrics: [{ label: "Sets", value: "5" }],
      },
    ],
    [
      "Trend",
      {
        title: "Pushup trend",
        subtitle: "Last 4 weeks",
        points: [
          { label: "Week 1", value: 10 },
          { label: "Week 2", value: 12 },
        ],
        metric: "reps",
        total: "22",
      },
    ],
    [
      "Table",
      {
        title: "Recent sets",
        rows: [{ label: "Pushups", value: "10 reps", meta: null }],
      },
    ],
    [
      "EntityList",
      {
        title: "Exercises",
        items: [{ title: "Pushups", prompt: "show pushups" }],
      },
    ],
    [
      "DetailPanel",
      {
        title: "Pushups",
        fields: [{ label: "Volume", value: "30 reps" }],
        prompts: ["show trend for pushups"],
      },
    ],
    [
      "Suggestions",
      {
        prompts: ["show today's summary", "what should I work on today?"],
      },
    ],
    [
      "BillingPanel",
      {
        status: "trialing",
        title: "Trial active",
        subtitle: "7 days left",
        ctaLabel: "Upgrade",
        ctaAction: "open_checkout",
      },
    ],
    [
      "QuickLogForm",
      {
        title: "Log a set",
        exerciseName: "Pushups",
        defaultUnit: "lbs",
      },
    ],
    [
      "Confirmation",
      {
        title: "Delete set?",
        description: "This action cannot be undone.",
        confirmPrompt: "delete that set",
      },
    ],
    [
      "ClientAction",
      {
        action: "set_weight_unit",
        payload: { unit: "kg" },
      },
    ],
    [
      "Undo",
      {
        actionId: "action_123",
        turnId: "turn_456",
        title: "Undo this log",
        description: null,
      },
    ],
  ] as const)("validates a spec with %s component", (type, props) => {
    const result = catalog.validate({
      root: "root",
      elements: {
        root: leaf(type, props),
      },
    });
    expect(result.success).toBe(true);
  });
});
