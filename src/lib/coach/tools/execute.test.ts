// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./tool-set-sound", () => ({
  runSetSoundTool: vi.fn().mockReturnValue({
    summary: "Set sound on.",
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Tactile sounds enabled",
        description: "",
      },
    ],
    outputForModel: { status: "ok", enabled: true },
  }),
}));

vi.mock("./tool-set-weight-unit", () => ({
  runSetWeightUnitTool: vi.fn().mockReturnValue({
    summary: "Set unit to lbs.",
    blocks: [
      {
        type: "status",
        tone: "success",
        title: "Weight unit set to LBS",
        description: "",
      },
    ],
    outputForModel: { status: "ok", unit: "lbs" },
  }),
}));

vi.mock("./tool-today-summary", () => ({
  runTodaySummaryTool: vi.fn().mockResolvedValue({
    summary: "Today summary.",
    blocks: [],
    outputForModel: { status: "ok" },
  }),
}));

vi.mock("./tool-focus-suggestions", () => ({
  runFocusSuggestionsTool: vi.fn().mockResolvedValue({
    summary: "Focus suggestions.",
    blocks: [],
    outputForModel: { status: "ok" },
  }),
}));

vi.mock("./tool-log-set", () => ({
  runLogSetTool: vi.fn().mockResolvedValue({
    summary: "Set logged.",
    blocks: [],
    outputForModel: { status: "ok" },
  }),
}));

vi.mock("./tool-exercise-report", () => ({
  runExerciseSnapshotTool: vi.fn().mockResolvedValue({
    summary: "Exercise snapshot.",
    blocks: [],
    outputForModel: { status: "ok" },
  }),
  runExerciseTrendTool: vi.fn().mockResolvedValue({
    summary: "Exercise trend.",
    blocks: [],
    outputForModel: { status: "ok" },
  }),
}));

vi.mock("./tool-edit-set", () => ({
  runEditSetTool: vi.fn().mockResolvedValue({
    summary: "Set edited.",
    blocks: [],
    outputForModel: { status: "ok", set_id: "set_123" },
  }),
}));

import { executeCoachTool } from "./execute";
import { runEditSetTool } from "./tool-edit-set";
import { runSetSoundTool } from "./tool-set-sound";
import type { CoachToolContext } from "./types";

const mockCtx: CoachToolContext = {
  convex: { query: vi.fn() } as unknown as CoachToolContext["convex"],
  defaultUnit: "lbs",
  timezoneOffsetMinutes: 0,
  turnId: "test-turn",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("executeCoachTool", () => {
  it("unknown tool -> outputForModel.error==='unsupported_tool'", async () => {
    const result = await executeCoachTool("unknown_tool", {}, mockCtx);
    expect(result.outputForModel.error).toBe("unsupported_tool");
  });

  it("unknown tool -> first block is status with tone 'error'", async () => {
    const result = await executeCoachTool("unknown_tool", {}, mockCtx);
    const status = result.blocks[0];
    expect(status?.type).toBe("status");
    expect((status as { tone: string }).tone).toBe("error");
  });

  it("unknown tool -> outputForModel.tool contains the tool name", async () => {
    const result = await executeCoachTool("does_not_exist", {}, mockCtx);
    expect(result.outputForModel.tool).toBe("does_not_exist");
  });

  it("set_sound dispatches to runSetSoundTool", async () => {
    await executeCoachTool("set_sound", { enabled: true }, mockCtx);
    expect(runSetSoundTool).toHaveBeenCalledWith({ enabled: true });
  });

  it("set_sound result is returned verbatim", async () => {
    const result = await executeCoachTool(
      "set_sound",
      { enabled: true },
      mockCtx
    );
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.enabled).toBe(true);
  });

  it("supports newer tool registrations through the shared registry", async () => {
    const result = await executeCoachTool(
      "edit_set",
      { set_id: "set_123", reps: 12 },
      mockCtx
    );

    expect(runEditSetTool).toHaveBeenCalledWith(
      { set_id: "set_123", reps: 12 },
      mockCtx
    );
    expect(result.outputForModel.set_id).toBe("set_123");
  });

  it("returns an error result for invalid tool arguments", async () => {
    const result = await executeCoachTool("edit_set", {}, mockCtx);

    expect(runEditSetTool).not.toHaveBeenCalled();
    expect(result.outputForModel.error).toBe("invalid_tool_args");
    expect(result.blocks[0]).toMatchObject({
      type: "status",
      tone: "error",
      title: "Invalid tool arguments",
    });
  });

  it("returns an error result when a runner throws", async () => {
    vi.mocked(runEditSetTool).mockRejectedValueOnce(new Error("boom"));

    const result = await executeCoachTool(
      "edit_set",
      { set_id: "set_123", reps: 12 },
      mockCtx
    );

    expect(result.outputForModel.error).toBe("tool_failed");
    expect(result.blocks[0]).toMatchObject({
      type: "status",
      tone: "error",
      title: "Tool failed",
      description: "boom",
    });
  });
});
