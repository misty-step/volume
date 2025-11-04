import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";

describe("listSets - Security Tests", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_1_test_subject";
  const user2Subject = "user_2_test_subject";
  let user1ExerciseId: Id<"exercises">;
  let user2ExerciseId: Id<"exercises">;

  beforeEach(async () => {
    // Create fresh test environment for each test
    // Provide modules glob for convex-test
    // @ts-expect-error - import.meta.glob is a Vite feature, types not available in test env
    t = convexTest(schema, import.meta.glob("./**/*.ts"));

    // Seed database: User 1 creates an exercise and logs sets
    user1ExerciseId = await t
      .withIdentity({ subject: user1Subject, name: "User 1" })
      .action(api.exercises.createExercise, { name: "BENCH PRESS" });

    await t
      .withIdentity({ subject: user1Subject, name: "User 1" })
      .mutation(api.sets.logSet, {
        exerciseId: user1ExerciseId,
        reps: 10,
        weight: 135,
        unit: "lbs",
      });

    await t
      .withIdentity({ subject: user1Subject, name: "User 1" })
      .mutation(api.sets.logSet, {
        exerciseId: user1ExerciseId,
        reps: 8,
        weight: 145,
        unit: "lbs",
      });

    // Seed database: User 2 creates a different exercise and logs sets
    user2ExerciseId = await t
      .withIdentity({ subject: user2Subject, name: "User 2" })
      .action(api.exercises.createExercise, { name: "SQUATS" });

    await t
      .withIdentity({ subject: user2Subject, name: "User 2" })
      .mutation(api.sets.logSet, {
        exerciseId: user2ExerciseId,
        reps: 5,
        weight: 225,
        unit: "lbs",
      });
  });

  describe("Authorization Tests", () => {
    test("should allow user to list sets for their own exercise", async () => {
      // User 1 queries their own exercise
      const sets = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.sets.listSets, { exerciseId: user1ExerciseId });

      expect(sets).toBeDefined();
      expect(sets.length).toBe(2);
      expect(sets[0].reps).toBe(8); // Most recent first (desc order)
      expect(sets[0].weight).toBe(145);
      expect(sets[1].reps).toBe(10);
      expect(sets[1].weight).toBe(135);
    });

    test("should prevent user from listing sets for another user's exercise (IDOR vulnerability check)", async () => {
      // User 2 attempts to access User 1's exercise - CRITICAL SECURITY TEST
      await expect(
        t
          .withIdentity({ subject: user2Subject, name: "User 2" })
          .query(api.sets.listSets, { exerciseId: user1ExerciseId })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("should return empty array for soft-deleted exercises with no sets", async () => {
      // Create and immediately soft-delete an exercise (no sets logged)
      const deletedExerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "TEMPORARY" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: deletedExerciseId });

      // Soft-deleted exercise with no sets returns empty array (defensive behavior)
      const result = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.sets.listSets, { exerciseId: deletedExerciseId });

      expect(result).toEqual([]);
    });
  });

  describe("Unauthenticated Access", () => {
    test("should return empty array when user is not authenticated", async () => {
      // No identity provided
      const sets = await t.query(api.sets.listSets, {
        exerciseId: user1ExerciseId,
      });

      expect(sets).toEqual([]);
    });

    test("should return empty array when querying without filter and not authenticated", async () => {
      const sets = await t.query(api.sets.listSets, {});

      expect(sets).toEqual([]);
    });
  });

  describe("Baseline Functionality", () => {
    test("should return all user sets when no exerciseId filter provided", async () => {
      // User 1 queries all their sets
      const allSets = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.sets.listSets, {});

      expect(allSets).toBeDefined();
      expect(allSets.length).toBe(2);
      expect(
        allSets.every((set: any) => set.exerciseId === user1ExerciseId)
      ).toBe(true);
    });

    test("should isolate users - each user only sees their own sets", async () => {
      // User 1 sees only their sets
      const user1Sets = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.sets.listSets, {});

      expect(user1Sets.length).toBe(2);
      expect(
        user1Sets.every((set: any) => set.exerciseId === user1ExerciseId)
      ).toBe(true);

      // User 2 sees only their sets
      const user2Sets = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .query(api.sets.listSets, {});

      expect(user2Sets.length).toBe(1);
      expect(
        user2Sets.every((set: any) => set.exerciseId === user2ExerciseId)
      ).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("should return empty array when user has exercise but no sets logged yet", async () => {
      // Create a new user and exercise without logging sets
      const user3Subject = "user_3_test_subject";
      const user3ExerciseId = await t
        .withIdentity({ subject: user3Subject, name: "User 3" })
        .action(api.exercises.createExercise, { name: "DEADLIFTS" });

      const sets = await t
        .withIdentity({ subject: user3Subject, name: "User 3" })
        .query(api.sets.listSets, { exerciseId: user3ExerciseId });

      expect(sets).toEqual([]);
    });

    test("should maintain descending order by performedAt", async () => {
      // Add one more set for User 1
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.sets.logSet, {
          exerciseId: user1ExerciseId,
          reps: 12,
          weight: 125,
          unit: "lbs",
        });

      const sets = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.sets.listSets, { exerciseId: user1ExerciseId });

      expect(sets.length).toBe(3);
      // Most recent should be first
      expect(sets[0].reps).toBe(12);
      expect(sets[0].weight).toBe(125);
      // Verify descending order
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i - 1].performedAt).toBeGreaterThanOrEqual(
          sets[i].performedAt
        );
      }
    });
  });
});

describe("logSet - Soft Delete Protection", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_1_test_subject";

  beforeEach(async () => {
    // @ts-expect-error - import.meta.glob is a Vite feature, types not available in test env
    t = convexTest(schema, import.meta.glob("./**/*.ts"));
  });

  test("should prevent logging sets to soft-deleted exercises", async () => {
    // Create exercise
    const exerciseId = await t
      .withIdentity({ subject: user1Subject, name: "User 1" })
      .action(api.exercises.createExercise, { name: "BENCH PRESS" });

    // Soft delete exercise
    await t
      .withIdentity({ subject: user1Subject, name: "User 1" })
      .mutation(api.exercises.deleteExercise, { id: exerciseId });

    // Try to log set to deleted exercise → should throw error
    await expect(
      t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.sets.logSet, {
          exerciseId,
          reps: 10,
          weight: 135,
          unit: "lbs",
        })
    ).rejects.toThrow("Cannot log sets for a deleted exercise");
  });
});
