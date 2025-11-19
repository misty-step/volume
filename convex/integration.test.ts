import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

// Type declaration for Vite's import.meta.glob
declare global {
  interface ImportMeta {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");

describe("backend integration", () => {
  it("lists exercises for authenticated user", async () => {
    const t = convexTest(schema, modules);
    const userId = "user_123";

    // Seed data using internal mutation
    await t.mutation(internal.exercises.createExerciseInternal, {
      userId: userId, // Internal mutation takes userId manually
      name: "Test Press",
      muscleGroups: ["Chest"],
    });

    // Test public query with identity
    const exercises = await t
      .withIdentity({ subject: userId })
      .query(api.exercises.listExercises, {});

    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe("Test Press");
  });

  it("returns empty list for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const exercises = await t.query(api.exercises.listExercises, {});
    expect(exercises).toEqual([]);
  });
});
