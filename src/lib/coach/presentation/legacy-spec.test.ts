// @vitest-environment node

import { describe, expect, it } from "vitest";
import { buildLegacyBlocksSpec } from "./legacy-spec";
import type { ToolExecutionRecord } from "./types";

describe("buildLegacyBlocksSpec", () => {
  it("turns legacy tool blocks into a flat json-render spec", () => {
    const records: ToolExecutionRecord[] = [
      {
        toolName: "query_workouts",
        input: { action: "today_summary" },
        summary: "Prepared today's summary.",
        outputForModel: { status: "ok" },
        legacyBlocks: [
          {
            type: "metrics",
            title: "Today's totals",
            metrics: [{ label: "Sets", value: "1" }],
          },
        ],
      },
    ];

    const spec = buildLegacyBlocksSpec(records, ["show history overview"]);

    expect(spec).toEqual({
      root: "root",
      elements: {
        root: {
          type: "Card",
          props: {},
          children: ["block_0", "block_1"],
        },
        block_0: {
          type: "Metrics",
          props: {
            title: "Today's totals",
            metrics: [{ label: "Sets", value: "1" }],
          },
          children: [],
        },
        block_1: {
          type: "Suggestions",
          props: {
            prompts: ["show history overview"],
          },
          children: [],
        },
      },
    });
  });

  it("returns null when no blocks or follow-up prompts exist", () => {
    expect(buildLegacyBlocksSpec([])).toBeNull();
  });
});
