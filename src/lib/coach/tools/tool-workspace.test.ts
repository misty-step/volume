// @vitest-environment node

import { describe, expect, it } from "vitest";
import { runWorkspaceTool } from "./tool-workspace";

const TEST_CTX = {
  convex: {} as any,
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

describe("runWorkspaceTool", () => {
  it("returns entity_list as first block (no status header)", async () => {
    const result = await runWorkspaceTool(TEST_CTX as any);

    expect(result.summary).toBe("Rendered workspace actions.");
    expect((result.blocks[0] as any).type).toBe("entity_list");
    expect((result.blocks[0] as any).items).toHaveLength(5);
    expect(result.outputForModel).toEqual({
      status: "ok",
      workflows: [
        "today_summary",
        "analytics_overview",
        "history_overview",
        "exercise_library",
        "settings_overview",
      ],
    });
  });
});
