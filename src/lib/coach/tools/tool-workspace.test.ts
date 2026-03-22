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
      surface: "workspace",
      title: "Core workflows",
      workflows: [
        {
          id: "today_summary",
          title: "Today summary",
          subtitle: "Live totals and top exercises",
          prompt: "show today's summary",
        },
        {
          id: "analytics_overview",
          title: "Analytics overview",
          subtitle: "Streaks, PRs, overload, focus suggestions",
          prompt: "show analytics overview",
        },
        {
          id: "history_overview",
          title: "History",
          subtitle: "Recent sets and delete operations",
          prompt: "show history overview",
        },
        {
          id: "exercise_library",
          title: "Exercise library",
          subtitle: "Rename, archive, restore, muscle groups",
          prompt: "show exercise library",
        },
        {
          id: "settings_overview",
          title: "Settings and billing",
          subtitle: "Goals, coach notes, subscription state",
          prompt: "show settings overview",
        },
      ],
    });
  });
});
