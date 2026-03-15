// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureExercise,
  findCloseMatches,
  findExercise,
  resolveExercise,
} from "./data";
import type { CoachToolContext } from "./types";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    exercises: {
      listExercises: "exercises.listExercises",
      createExercise: "exercises.createExercise",
      getExercise: "exercises.getExercise",
    },
  },
}));

const query = vi.fn();
const action = vi.fn();

function makeCtx(overrides: Partial<CoachToolContext> = {}): CoachToolContext {
  return {
    convex: { query, mutation: vi.fn(), action } as any,
    defaultUnit: "lbs",
    timezoneOffsetMinutes: 0,
    turnId: "turn-test",
    ...overrides,
  } as CoachToolContext;
}

function exercise(overrides: Record<string, unknown> = {}) {
  return {
    _id: "ex_1",
    name: "Push Ups",
    userId: "user_1",
    createdAt: Date.now(),
    ...overrides,
  } as any;
}

describe("findCloseMatches", () => {
  it("finds exercises whose names contain the query", () => {
    const bench = exercise({ _id: "ex_1", name: "Bench Press" });
    const incline = exercise({ _id: "ex_2", name: "Incline Bench" });
    const squat = exercise({ _id: "ex_3", name: "Squat" });

    const result = findCloseMatches("bench", [bench, incline, squat]);

    expect(result).toEqual([bench, incline]);
  });

  it("finds exercises where query contains the exercise name", () => {
    const curl = exercise({ _id: "ex_1", name: "Curl" });
    const squat = exercise({ _id: "ex_2", name: "Squat" });

    const result = findCloseMatches("bicep curl", [curl, squat]);

    expect(result).toEqual([curl]);
  });

  it("excludes exact normalized matches", () => {
    const bench = exercise({ _id: "ex_1", name: "Bench Press" });

    const result = findCloseMatches("bench press", [bench]);

    expect(result).toEqual([]);
  });

  it("respects limit parameter", () => {
    const exercises = Array.from({ length: 10 }, (_, i) =>
      exercise({ _id: `ex_${i}`, name: `Bench Variation ${i}` })
    );

    const result = findCloseMatches("bench", exercises, 3);

    expect(result).toHaveLength(3);
  });

  it("returns empty for empty input", () => {
    expect(findCloseMatches("", [exercise()])).toEqual([]);
    expect(findCloseMatches("bench", [])).toEqual([]);
  });
});

describe("findExercise", () => {
  it("returns exact normalized match", async () => {
    const ex = exercise({ name: "Bench Press" });
    const result = await findExercise(makeCtx(), "bench press", [ex]);
    expect(result).toBe(ex);
  });

  it("matches ignoring special characters and case", async () => {
    const ex = exercise({ name: "Pull Ups" });
    const result = await findExercise(makeCtx(), "pull-ups!", [ex]);
    expect(result).toBe(ex);
  });

  it("falls through to semantic resolver when no normalized match", async () => {
    const ex = exercise({ name: "Barbell Bench Press" });
    const resolveExerciseName = vi.fn().mockResolvedValue(ex);
    const ctx = makeCtx({ resolveExerciseName });

    const result = await findExercise(ctx, "flat bench", [ex]);

    expect(resolveExerciseName).toHaveBeenCalledWith("flat bench", [ex]);
    expect(result).toBe(ex);
  });

  it("returns null when semantic resolver returns null", async () => {
    const ex = exercise();
    const resolveExerciseName = vi.fn().mockResolvedValue(null);
    const ctx = makeCtx({ resolveExerciseName });

    const result = await findExercise(ctx, "nonexistent", [ex]);
    expect(result).toBeNull();
  });

  it("returns null when semantic resolver throws (LLM failure)", async () => {
    const ex = exercise();
    const resolveExerciseName = vi
      .fn()
      .mockRejectedValue(new Error("LLM timeout"));
    const ctx = makeCtx({ resolveExerciseName });

    const result = await findExercise(ctx, "anything", [ex]);
    expect(result).toBeNull();
  });

  it("skips semantic resolver when exercises list is empty", async () => {
    const resolveExerciseName = vi.fn();
    const ctx = makeCtx({ resolveExerciseName });

    const result = await findExercise(ctx, "bench", []);

    expect(resolveExerciseName).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("skips semantic resolver when not provided", async () => {
    const ex = exercise({ name: "Squat" });
    const result = await findExercise(makeCtx(), "deadlift", [ex]);
    expect(result).toBeNull();
  });
});

describe("resolveExercise", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("passes includeDeleted to listExercises query", async () => {
    const ex = exercise();
    query.mockResolvedValue([ex]);

    await resolveExercise(makeCtx(), "push ups", { includeDeleted: true });

    expect(query).toHaveBeenCalledWith("exercises.listExercises", {
      includeDeleted: true,
    });
  });

  it("defaults includeDeleted to false", async () => {
    query.mockResolvedValue([]);

    await resolveExercise(makeCtx(), "push ups");

    expect(query).toHaveBeenCalledWith("exercises.listExercises", {
      includeDeleted: false,
    });
  });

  it("returns matched exercise and full list with empty closeMatches", async () => {
    const ex = exercise({ name: "Squat" });
    query.mockResolvedValue([ex]);

    const result = await resolveExercise(makeCtx(), "squat");

    expect(result.exercise).toBe(ex);
    expect(result.exercises).toEqual([ex]);
    expect(result.closeMatches).toEqual([]);
  });

  it("returns null exercise with closeMatches when no match", async () => {
    const bench = exercise({ _id: "ex_bench", name: "Bench Press" });
    const incline = exercise({ _id: "ex_incline", name: "Incline Bench" });
    query.mockResolvedValue([bench, incline]);

    const result = await resolveExercise(makeCtx(), "bench");

    expect(result.exercise).toBeNull();
    expect(result.closeMatches).toEqual([bench, incline]);
  });

  it("returns empty closeMatches when no match and no partial overlap", async () => {
    query.mockResolvedValue([exercise({ name: "Squat" })]);

    const result = await resolveExercise(makeCtx(), "deadlift");

    expect(result.exercise).toBeNull();
    expect(result.exercises).toHaveLength(1);
    expect(result.closeMatches).toEqual([]);
  });
});

describe("ensureExercise", () => {
  beforeEach(() => {
    query.mockReset();
    action.mockReset();
  });

  it("returns existing exercise without creating", async () => {
    const ex = exercise({ name: "Bench Press" });
    query.mockResolvedValue([ex]);

    const result = await ensureExercise(makeCtx(), "bench press");

    expect(result).toEqual({ exercise: ex, created: false, exercises: [ex] });
    expect(action).not.toHaveBeenCalled();
  });

  it("creates exercise when not found and fetches it back", async () => {
    const created = exercise({ _id: "ex_new", name: "Deadlift" });
    query
      .mockResolvedValueOnce([]) // listExercises
      .mockResolvedValueOnce(created); // getExercise
    action.mockResolvedValue("ex_new");

    const result = await ensureExercise(makeCtx(), "deadlift");

    expect(action).toHaveBeenCalledWith("exercises.createExercise", {
      name: "Deadlift",
    });
    expect(result.exercise).toBe(created);
    expect(result.created).toBe(true);
    expect(result.exercises).toEqual([created]);
  });

  it("falls back to refreshed list when getExercise returns null", async () => {
    const created = exercise({ _id: "ex_new", name: "Deadlift" });
    query
      .mockResolvedValueOnce([]) // listExercises (initial)
      .mockResolvedValueOnce(null) // getExercise returns null
      .mockResolvedValueOnce([created]); // listExercises (refresh)
    action.mockResolvedValue("ex_new");

    const result = await ensureExercise(makeCtx(), "deadlift");

    expect(result.exercise).toBe(created);
    expect(result.created).toBe(true);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("throws when create action fails", async () => {
    query.mockResolvedValue([]);
    action.mockRejectedValue(new Error("Convex 500"));

    await expect(ensureExercise(makeCtx(), "deadlift")).rejects.toThrow(
      'Failed to create exercise "Deadlift": Convex 500'
    );
  });

  it("throws when created exercise cannot be loaded at all", async () => {
    query
      .mockResolvedValueOnce([]) // listExercises (initial)
      .mockResolvedValueOnce(null) // getExercise
      .mockResolvedValueOnce([]); // listExercises (refresh, empty)
    action.mockResolvedValue("ex_ghost");

    await expect(ensureExercise(makeCtx(), "deadlift")).rejects.toThrow(
      'Created exercise "Deadlift" but could not load it afterwards.'
    );
  });

  it("title-cases the exercise name when creating", async () => {
    const created = exercise({ _id: "ex_new", name: "Barbell Row" });
    query.mockResolvedValueOnce([]).mockResolvedValueOnce(created);
    action.mockResolvedValue("ex_new");

    await ensureExercise(makeCtx(), "  barbell   ROW  ");

    expect(action).toHaveBeenCalledWith("exercises.createExercise", {
      name: "Barbell Row",
    });
  });
});
