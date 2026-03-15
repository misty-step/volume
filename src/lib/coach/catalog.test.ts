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

  it("validates a spec with a Status component", () => {
    const result = catalog.validate({
      root: "s1",
      elements: {
        s1: leaf("Status", { tone: "success", title: "Logged set" }),
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a spec with an unknown component type", () => {
    const result = catalog.validate({
      root: "s1",
      elements: {
        s1: leaf("FakeComponent", { title: "nope" }),
      },
    });
    expect(result.success).toBe(false);
  });

  it("validates a spec with Metrics component", () => {
    const result = catalog.validate({
      root: "m1",
      elements: {
        m1: leaf("Metrics", {
          title: "Today's workout",
          metrics: [{ label: "Sets", value: "5" }],
        }),
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates a spec with Undo component", () => {
    const result = catalog.validate({
      root: "u1",
      elements: {
        u1: leaf("Undo", {
          actionId: "action_123",
          turnId: "turn_456",
          title: "Undo this log",
        }),
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates a spec with ClientAction component", () => {
    const result = catalog.validate({
      root: "ca1",
      elements: {
        ca1: leaf("ClientAction", {
          action: "set_weight_unit",
          payload: { unit: "kg" },
        }),
      },
    });
    expect(result.success).toBe(true);
  });
});
