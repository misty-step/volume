// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runReportHistoryTool } from "./tool-report-history";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    ai: {
      reports: {
        getReportHistory: "ai.reports.getReportHistory",
      },
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

describe("runReportHistoryTool", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("loads reports and applies default type/version fallbacks", async () => {
    const generatedAt = Date.now();
    query.mockResolvedValue([
      {
        _id: "r1",
        generatedAt,
        model: "gpt-5",
      },
      {
        _id: "r2",
        reportType: "monthly",
        generatedAt: generatedAt - 1_000,
        reportVersion: "2.1",
        model: "gpt-5-mini",
      },
    ]);

    const result = await runReportHistoryTool({}, TEST_CTX as any);

    expect(query).toHaveBeenCalledWith("ai.reports.getReportHistory", {
      limit: 8,
    });

    const listBlock = result.blocks[0] as any;
    expect(listBlock.items[0]).toEqual(
      expect.objectContaining({
        title: "WEEKLY report",
        tags: ["1.0"],
        meta: "model=gpt-5",
      })
    );
    expect(listBlock.items[1]).toEqual(
      expect.objectContaining({
        title: "MONTHLY report",
        tags: ["2.1"],
      })
    );
    expect(result.outputForModel).toEqual({
      status: "ok",
      reports: [
        {
          id: "r1",
          type: "weekly",
          generated_at: generatedAt,
          model: "gpt-5",
          version: "1.0",
        },
        {
          id: "r2",
          type: "monthly",
          generated_at: generatedAt - 1_000,
          model: "gpt-5-mini",
          version: "2.1",
        },
      ],
    });
  });

  it("passes through explicit limit and handles empty history", async () => {
    query.mockResolvedValue([]);

    const result = await runReportHistoryTool({ limit: 3 }, TEST_CTX as any);

    expect(query).toHaveBeenCalledWith("ai.reports.getReportHistory", {
      limit: 3,
    });
    expect((result.blocks[0] as any).items).toEqual([]);
    expect(result.outputForModel).toEqual({ status: "ok", reports: [] });
  });
});
