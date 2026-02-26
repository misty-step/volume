// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runExerciseLibraryTool } from "./tool-exercise-library";
import { listExercises } from "./data";

vi.mock("./data", () => ({
  listExercises: vi.fn(),
}));

const mockListExercises = vi.mocked(listExercises);

const TEST_CTX = {
  convex: {} as any,
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

describe("runExerciseLibraryTool", () => {
  beforeEach(() => {
    mockListExercises.mockReset();
  });

  it("returns active and archived counts with exercise rows", async () => {
    mockListExercises.mockResolvedValue([
      {
        _id: "ex1",
        name: "Push Ups",
        userId: "u",
        createdAt: Date.now(),
        muscleGroups: ["Chest", "Triceps"],
      },
      {
        _id: "ex2",
        name: "Old Curl",
        userId: "u",
        createdAt: Date.now(),
        deletedAt: Date.now(),
      },
    ] as any);

    const result = await runExerciseLibraryTool(TEST_CTX as any);

    const detailPanel = result.blocks[0] as any;
    const entityList = result.blocks[1] as any;

    expect(detailPanel.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Active", value: "1" }),
        expect.objectContaining({ label: "Archived", value: "1" }),
        expect.objectContaining({ label: "Total", value: "2" }),
      ])
    );
    expect(entityList.items[0]).toEqual(
      expect.objectContaining({
        title: "Push Ups",
        subtitle: "Chest, Triceps",
        tags: ["active"],
        prompt: "show trend for push ups",
      })
    );
    expect(entityList.items[1]).toEqual(
      expect.objectContaining({
        title: "Old Curl",
        subtitle: "Unclassified",
        tags: ["archived"],
        prompt: "restore exercise Old Curl",
      })
    );
    expect(result.outputForModel).toEqual({
      status: "ok",
      active_count: 1,
      archived_count: 1,
      exercises: [
        { id: "ex1", name: "Push Ups", archived: false },
        { id: "ex2", name: "Old Curl", archived: true },
      ],
    });
  });

  it("handles an empty library", async () => {
    mockListExercises.mockResolvedValue([]);

    const result = await runExerciseLibraryTool(TEST_CTX as any);
    const entityList = result.blocks[1] as any;

    expect(entityList.items).toEqual([]);
    expect((result.blocks[0] as any).fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Total", value: "0" }),
      ])
    );
  });
});
