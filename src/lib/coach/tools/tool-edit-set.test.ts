// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runEditSetTool } from "./tool-edit-set";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    sets: {
      getSet: "sets.getSet",
      editSet: "sets.editSet",
    },
  },
}));

const query = vi.fn();
const mutation = vi.fn();

const TEST_CTX = {
  convex: { query, mutation },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

function makeSet(overrides: Record<string, unknown> = {}) {
  return {
    _id: "set_1",
    userId: "user_1",
    exerciseId: "exercise_1",
    reps: 10,
    performedAt: Date.now(),
    ...overrides,
  };
}

describe("runEditSetTool", () => {
  beforeEach(() => {
    query.mockReset();
    mutation.mockReset();
  });

  it("updates reps on an existing set", async () => {
    query.mockResolvedValue(makeSet({ reps: 10 }));
    mutation.mockResolvedValue(undefined);

    const result = await runEditSetTool(
      { set_id: "set_1", reps: 12 },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("sets.editSet", {
      id: "set_1",
      reps: 12,
      weight: undefined,
      unit: undefined,
      duration: undefined,
    });
    expect(result.outputForModel.status).toBe("ok");
    expect(result.outputForModel.set_id).toBe("set_1");
    expect((result.blocks[0] as any).tone).toBe("success");
  });

  it("returns error when set not found", async () => {
    query.mockResolvedValue(null);

    const result = await runEditSetTool(
      { set_id: "set_missing", reps: 5 },
      TEST_CTX as any
    );

    expect(mutation).not.toHaveBeenCalled();
    expect(result.outputForModel).toEqual({
      status: "error",
      error: "set_not_found",
    });
    expect((result.blocks[0] as any).title).toBe("Set not found");
  });

  it("returns error when no fields provided", async () => {
    query.mockResolvedValue(makeSet());

    const result = await runEditSetTool({ set_id: "set_1" }, TEST_CTX as any);

    expect(mutation).not.toHaveBeenCalled();
    expect(result.outputForModel).toEqual({
      status: "error",
      error: "no_fields_provided",
    });
  });

  it("returns edit_failed on mutation error", async () => {
    query.mockResolvedValue(makeSet());
    mutation.mockRejectedValue(new Error("db write failed"));

    const result = await runEditSetTool(
      { set_id: "set_1", reps: 5 },
      TEST_CTX as any
    );

    expect(result.outputForModel).toEqual({
      status: "error",
      error: "edit_failed",
      message: "db write failed",
    });
    expect((result.blocks[0] as any).title).toBe("Edit failed");
  });

  it("updates weight and unit together", async () => {
    query.mockResolvedValue(makeSet());
    mutation.mockResolvedValue(undefined);

    const result = await runEditSetTool(
      { set_id: "set_1", weight: 135, unit: "lbs" },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith("sets.editSet", {
      id: "set_1",
      reps: undefined,
      weight: 135,
      unit: "lbs",
      duration: undefined,
    });
    expect(result.outputForModel.status).toBe("ok");
  });
});
