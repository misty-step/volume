import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";

describe("Exercises - Soft Delete Tests", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_1_test_subject";
  const user2Subject = "user_2_test_subject";

  beforeEach(async () => {
    // Create fresh test environment for each test
    t = convexTest(schema, import.meta.glob("./**/*.ts"));
  });

  describe("Soft Delete Functionality", () => {
    test("deleteExercise should set deletedAt timestamp instead of removing record", async () => {
      // Create exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Bench Press" });

      // Delete exercise (soft delete)
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Verify exercise still exists in DB but has deletedAt set
      const allExercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: true });

      expect(allExercises.length).toBe(1);
      expect(allExercises[0]._id).toBe(exerciseId);
      expect(allExercises[0].deletedAt).toBeDefined();
      expect(allExercises[0].deletedAt).toBeTypeOf("number");
      expect(allExercises[0].deletedAt! > 0).toBe(true);
    });

    test("deleteExercise should preserve exercise for history display", async () => {
      // Create exercise and log sets
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Squats" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.sets.logSet, {
          exerciseId,
          reps: 10,
          weight: 225,
          unit: "lbs",
        });

      // Delete exercise
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Verify sets still reference the exercise (no orphaning)
      const sets = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.sets.listSets, {});

      expect(sets.length).toBe(1);
      expect(sets[0].exerciseId).toBe(exerciseId);
    });
  });

  describe("Auto-Restore Logic", () => {
    test("createExercise should restore soft-deleted duplicate by name", async () => {
      // Create and delete exercise
      const originalId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Deadlifts" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: originalId });

      // Recreate exercise with same name (should restore)
      const restoredId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Deadlifts" });

      // Verify same ID returned (restored, not new)
      expect(restoredId).toBe(originalId);

      // Verify deletedAt cleared
      const exercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: false });

      expect(exercises.length).toBe(1);
      expect(exercises[0]._id).toBe(originalId);
      expect(exercises[0].deletedAt).toBeUndefined();
    });

    test("createExercise should preserve set history when restoring", async () => {
      // Create exercise and log sets
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Pull Ups" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.sets.logSet, {
          exerciseId,
          reps: 12,
        });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.sets.logSet, {
          exerciseId,
          reps: 10,
        });

      // Delete exercise
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Recreate (restore)
      const restoredId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Pull Ups" });

      expect(restoredId).toBe(exerciseId);

      // Verify all sets still accessible
      const sets = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.sets.listSets, {});

      expect(sets.length).toBe(2);
      expect(sets.every((s: any) => s.exerciseId === exerciseId)).toBe(true);
    });

    test("createExercise defensive check: prevents restoring when active duplicate exists", async () => {
      // Create and soft-delete exercise
      const deletedId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Rows" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: deletedId });

      // Manually create active exercise with same name (simulates DB corruption)
      // This bypasses normal mutation logic to create the edge case
      await t.run(async (ctx) => {
        await ctx.db.insert("exercises", {
          userId: user1Subject,
          name: "Rows",
          muscleGroups: ["Back", "Biceps"], // Required by schema
          createdAt: Date.now(),
        });
      });

      // Try to restore the deleted exercise by recreating
      // Defensive check should detect active duplicate and fail
      await expect(
        t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .action(api.exercises.createExercise, { name: "Rows" })
      ).rejects.toThrow("Exercise with this name already exists");
    });

    test("createExercise should throw error for active duplicate (not soft-deleted)", async () => {
      // Create exercise
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Overhead Press" });

      // Attempt to create duplicate (should fail)
      await expect(
        t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .action(api.exercises.createExercise, { name: "Overhead Press" })
      ).rejects.toThrow("Exercise with this name already exists");
    });
  });

  describe("listExercises includeDeleted Parameter", () => {
    test("listExercises with includeDeleted=false should filter out deleted exercises", async () => {
      // Create two exercises, delete one
      const exercise1 = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Active Exercise" });

      const exercise2 = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Deleted Exercise" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exercise2 });

      // Query with includeDeleted=false
      const activeOnly = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: false });

      expect(activeOnly.length).toBe(1);
      expect(activeOnly[0]._id).toBe(exercise1);
      expect(activeOnly[0].deletedAt).toBeUndefined();
    });

    test("listExercises with includeDeleted=true should include deleted exercises", async () => {
      // Create two exercises, delete one
      const exercise1 = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Active" });

      const exercise2 = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Deleted" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exercise2 });

      // Query with includeDeleted=true
      const allExercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: true });

      expect(allExercises.length).toBe(2);
      expect(allExercises.some((e: any) => e._id === exercise1)).toBe(true);
      expect(allExercises.some((e: any) => e._id === exercise2)).toBe(true);

      const deletedExercise = allExercises.find(
        (e: any) => e._id === exercise2
      );
      expect(deletedExercise?.deletedAt).toBeDefined();
    });

    test("listExercises without includeDeleted should default to active only", async () => {
      // Create and delete exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Test" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Query without includeDeleted parameter (defaults to false/undefined)
      const exercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, {});

      expect(exercises.length).toBe(0);
    });
  });

  describe("updateExercise - Deleted Exercise Protection", () => {
    test("updateExercise should block editing deleted exercises", async () => {
      // Create and delete exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Original Name" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Attempt to update deleted exercise
      await expect(
        t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .mutation(api.exercises.updateExercise, {
            id: exerciseId,
            name: "New Name",
          })
      ).rejects.toThrow("Cannot update a deleted exercise");
    });

    test("updateExercise should allow editing active exercises normally", async () => {
      // Create exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Original" });

      // Update (should succeed)
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.updateExercise, {
          id: exerciseId,
          name: "Updated",
        });

      const exercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: false });

      expect(exercises[0].name).toBe("Updated");
    });
  });

  describe("restoreExercise Mutation", () => {
    test("restoreExercise should clear deletedAt field", async () => {
      // Create and delete exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Restore Test" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Restore
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.restoreExercise, { id: exerciseId });

      // Verify deletedAt cleared
      const exercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: false });

      expect(exercises.length).toBe(1);
      expect(exercises[0]._id).toBe(exerciseId);
      expect(exercises[0].deletedAt).toBeUndefined();
    });

    test("restoreExercise should throw error if exercise not deleted", async () => {
      // Create active exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Active" });

      // Attempt to restore (should fail - not deleted)
      await expect(
        t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .mutation(api.exercises.restoreExercise, { id: exerciseId })
      ).rejects.toThrow("Exercise is not deleted");
    });

    test("restoreExercise should verify ownership", async () => {
      // User 1 creates and deletes exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "User1 Exercise" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // User 2 attempts to restore (should fail)
      await expect(
        t
          .withIdentity({ subject: user2Subject, name: "User 2" })
          .mutation(api.exercises.restoreExercise, { id: exerciseId })
      ).rejects.toThrow("Not authorized to access this exercise");
    });
  });

  describe("Security & Ownership", () => {
    test("deleteExercise should verify ownership before soft delete", async () => {
      // User 1 creates exercise
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "User1 Only" });

      // User 2 attempts to delete (should fail)
      await expect(
        t
          .withIdentity({ subject: user2Subject, name: "User 2" })
          .mutation(api.exercises.deleteExercise, { id: exerciseId })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("soft-deleted exercises should remain isolated by user", async () => {
      // User 1 creates and deletes exercise
      const user1Exercise = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Private" });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: user1Exercise });

      // User 2 should not see User 1's deleted exercise
      const user2Exercises = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .query(api.exercises.listExercises, { includeDeleted: true });

      expect(user2Exercises.length).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle deleting already deleted exercise (idempotent)", async () => {
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Idempotent" });

      // Delete twice
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Should still be soft-deleted (not error)
      const exercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: true });

      expect(exercises.length).toBe(1);
      expect(exercises[0].deletedAt).toBeDefined();
    });

    test("should handle restoring and re-deleting exercise", async () => {
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Cycle Test" });

      // Delete
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      // Restore
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.restoreExercise, { id: exerciseId });

      // Delete again
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: exerciseId });

      const exercises = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.exercises.listExercises, { includeDeleted: true });

      expect(exercises.length).toBe(1);
      expect(exercises[0].deletedAt).toBeDefined();
    });
  });
});
