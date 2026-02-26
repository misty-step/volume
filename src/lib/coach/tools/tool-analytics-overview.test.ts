// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAnalyticsOverviewTool } from "./tool-analytics-overview";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    analytics: {
      getDashboardAnalytics: "analytics.getDashboardAnalytics",
    },
  },
}));

const query = vi.fn();

const TEST_CTX = {
  convex: { query },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

function createFrequency(days: number) {
  return Array.from({ length: days }, (_, index) => ({
    date: `2025-01-${String(index + 1).padStart(2, "0")}`,
    setCount: index % 3 === 0 ? 0 : 1,
    totalVolume: index + 1,
  }));
}

describe("runAnalyticsOverviewTool", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns metrics, lists, table, and suggestions in normal case", async () => {
    query.mockResolvedValue({
      frequency: createFrequency(20),
      streakStats: {
        currentStreak: 4,
        longestStreak: 11,
        totalWorkouts: 33,
      },
      recentPRs: [
        {
          exerciseName: "Bench Press",
          prType: "weight",
          improvement: 5.4,
          performedAt: Date.now(),
        },
      ],
      focusSuggestions: [
        { title: "More squats", priority: "high", reason: "Leg volume low" },
      ],
      progressiveOverload: [
        { exerciseName: "Bench Press", trend: "improving" },
        { exerciseName: "Squat", trend: "declining" },
        { exerciseName: "Deadlift", trend: "plateau" },
      ],
    });

    const result = await runAnalyticsOverviewTool(TEST_CTX as any);

    expect(query).toHaveBeenCalledWith("analytics.getDashboardAnalytics", {});
    expect(result.blocks.map((block) => block.type)).toEqual([
      "metrics",
      "entity_list",
      "entity_list",
      "table",
      "suggestions",
    ]);

    const metricsBlock = result.blocks[0] as any;
    expect(metricsBlock.metrics).toEqual(
      expect.arrayContaining([
        { label: "Current streak", value: "4" },
        { label: "Longest streak", value: "11" },
      ])
    );

    const recentPrBlock = result.blocks[1] as any;
    expect(recentPrBlock.items).toHaveLength(1);
    expect(recentPrBlock.items[0]).toEqual(
      expect.objectContaining({
        title: "Bench Press",
        subtitle: "weight (+5)",
      })
    );

    const overloadBlock = result.blocks[2] as any;
    expect(overloadBlock.items[0].tags).toEqual(["improving"]);
    expect(overloadBlock.items[1].tags).toEqual(["watch"]);
    expect(overloadBlock.items[2].tags).toEqual(["plateau"]);
  });

  it("keeps recent PR list empty when dashboard has none", async () => {
    query.mockResolvedValue({
      frequency: [],
      streakStats: {
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
      },
      recentPRs: [],
      focusSuggestions: [],
      progressiveOverload: [],
    });

    const result = await runAnalyticsOverviewTool(TEST_CTX as any);
    const recentPrBlock = result.blocks[1] as any;

    expect(recentPrBlock.items).toEqual([]);
    expect(result.outputForModel.recent_pr_count).toBe(0);
  });

  it("calculates 14d volume from only the last 14 days", async () => {
    const frequency = createFrequency(20);
    query.mockResolvedValue({
      frequency,
      streakStats: {
        currentStreak: 1,
        longestStreak: 1,
        totalWorkouts: 1,
      },
      recentPRs: [],
      focusSuggestions: [],
      progressiveOverload: [],
    });

    const result = await runAnalyticsOverviewTool(TEST_CTX as any);
    const metricsBlock = result.blocks[0] as any;
    const volumeMetric = metricsBlock.metrics.find(
      (metric: any) => metric.label === "14d volume"
    );
    const expected = frequency
      .slice(-14)
      .reduce((sum, day) => sum + day.totalVolume, 0);

    expect(volumeMetric.value).toBe(String(Math.round(expected)));
  });
});
