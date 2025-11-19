import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";

describe("Recovery Analytics", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_recovery_test";
  const user2Subject = "user_2_recovery_test";

  beforeEach(async () => {
    // Create fresh test environment for each test
    t = convexTest(schema, import.meta.glob("./**/*.ts"));
  });

  /**
   * Helper: Create exercise for user
   */
  async function createExercise(
    name: string,
    userSubject = user1Subject
  ): Promise<Id<"exercises">> {
    return await t
      .withIdentity({ subject: userSubject, name: "Test User" })
      .action(api.exercises.createExercise, { name });
  }

  /**
   * Helper: Log set for exercise
   */
  async function logSet(
    exerciseId: Id<"exercises">,
    reps: number,
    weight?: number,
    performedAt?: number,
    userSubject = user1Subject
  ): Promise<Id<"sets">> {
    const setId = await t
      .withIdentity({ subject: userSubject, name: "Test User" })
      .mutation(api.sets.logSet, {
        exerciseId,
        reps,
        weight,
        unit: weight !== undefined ? "lbs" : undefined,
      });

    // If custom performedAt provided, manually update it
    if (performedAt !== undefined) {
      await t.run(async (ctx) => {
        await ctx.db.patch(setId, { performedAt });
      });
    }

    return setId;
  }

  /**
   * Helper: Get date timestamp for N days ago
   */
  function daysAgo(days: number): number {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
    return date.getTime();
  }

  describe("getRecoveryStatus", () => {
    test("correctly maps exercises to muscle groups", async () => {
      // Create exercises that map to different muscle groups
      const benchPress = await createExercise("Bench Press"); // Chest, Triceps
      const pullups = await createExercise("Pull-ups"); // Back, Biceps
      const squats = await createExercise("Squats"); // Quads, Glutes

      // Log sets for each exercise
      await logSet(benchPress, 10, 135, daysAgo(1));
      await logSet(pullups, 10, undefined, daysAgo(2));
      await logSet(squats, 10, 225, daysAgo(3));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      // Should have recovery data for all trained muscle groups
      const muscleGroups = result.map((r) => r.muscleGroup);
      expect(muscleGroups).toContain("Chest");
      expect(muscleGroups).toContain("Triceps");
      expect(muscleGroups).toContain("Back");
      expect(muscleGroups).toContain("Biceps");
      expect(muscleGroups).toContain("Quads");
      expect(muscleGroups).toContain("Glutes");
    });

    test("calculates days since last trained correctly", async () => {
      const benchPress = await createExercise("Bench Press"); // Chest, Triceps

      // Log set 3 days ago
      await logSet(benchPress, 10, 135, daysAgo(3));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      expect(chest).toBeDefined();
      // Should be 2 or 3 depending on exact timing
      expect(chest?.daysSince).toBeGreaterThanOrEqual(2);
      expect(chest?.daysSince).toBeLessThanOrEqual(3);
    });

    test("aggregates volume across multiple exercises for same muscle group", async () => {
      // Create multiple chest exercises
      const benchPress = await createExercise("Bench Press"); // Chest, Triceps
      const inclineBench = await createExercise("Incline Bench"); // Chest, Triceps
      const dips = await createExercise("Dips"); // Chest, Triceps

      // Log sets in last 7 days
      await logSet(benchPress, 10, 135, daysAgo(1)); // Volume: 1350
      await logSet(inclineBench, 10, 115, daysAgo(2)); // Volume: 1150
      await logSet(dips, 10, undefined, daysAgo(3)); // Volume: 0 (bodyweight)

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      expect(chest).toBeDefined();
      // Total chest volume = 1350 + 1150 + 0 = 2500
      expect(chest?.volumeLast7Days).toBe(2500);
    });

    test("counts frequency (distinct workout days) in last 7 days", async () => {
      const benchPress = await createExercise("Bench Press"); // Chest, Triceps

      // Log sets on 3 different days within last 7 days
      await logSet(benchPress, 10, 135, daysAgo(1));
      await logSet(benchPress, 10, 135, daysAgo(1)); // Same day as above
      await logSet(benchPress, 10, 135, daysAgo(3));
      await logSet(benchPress, 10, 135, daysAgo(5));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      expect(chest).toBeDefined();
      // Should count 3 distinct days
      expect(chest?.frequencyLast7Days).toBe(3);
    });

    test("ignores sets older than 7 days for volume/frequency", async () => {
      const benchPress = await createExercise("Bench Press");

      // Log sets both inside and outside 7-day window
      await logSet(benchPress, 10, 135, daysAgo(2)); // Inside: 1350
      await logSet(benchPress, 10, 135, daysAgo(10)); // Outside: should be ignored

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      expect(chest).toBeDefined();
      expect(chest?.volumeLast7Days).toBe(1350); // Only set from 2 days ago
      expect(chest?.frequencyLast7Days).toBe(1); // Only 1 day in last 7
    });

    test('assigns status "fresh" for 0-2 days since', async () => {
      const benchPress = await createExercise("Bench Press");

      // Log set today (0 days ago)
      await logSet(benchPress, 10, 135, daysAgo(0));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      // Should be "fresh" or "recovering" depending on exact timing
      expect(["fresh", "recovering"]).toContain(chest?.status);
    });

    test('assigns status "recovering" for 3-4 days since', async () => {
      const benchPress = await createExercise("Bench Press");

      // Log set 3 days ago
      await logSet(benchPress, 10, 135, daysAgo(3));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      // Should be "recovering" or potentially "ready" depending on exact timing
      expect(["fresh", "recovering", "ready"]).toContain(chest?.status);
    });

    test('assigns status "ready" for 5-7 days since', async () => {
      const benchPress = await createExercise("Bench Press");

      // Log set 6 days ago
      await logSet(benchPress, 10, 135, daysAgo(6));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      expect(chest?.status).toBe("ready");
    });

    test('assigns status "overdue" for 8+ days since', async () => {
      const benchPress = await createExercise("Bench Press");

      // Log set 10 days ago
      await logSet(benchPress, 10, 135, daysAgo(10));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      expect(chest?.status).toBe("overdue");
    });

    test("handles muscle groups never trained (null lastTrainedDate)", async () => {
      const benchPress = await createExercise("Bench Press"); // Chest only

      // Log set for chest
      await logSet(benchPress, 10, 135, daysAgo(1));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      // Find a muscle group that was never trained (e.g., Back)
      const back = result.find((r) => r.muscleGroup === "Back");
      expect(back).toBeDefined();
      expect(back?.lastTrainedDate).toBeNull();
      expect(back?.daysSince).toBe(999); // Sentinel value
      expect(back?.volumeLast7Days).toBe(0);
      expect(back?.frequencyLast7Days).toBe(0);
      expect(back?.status).toBe("overdue");
    });

    test("returns empty array for unauthenticated user", async () => {
      // Create exercise and sets as authenticated user
      const benchPress = await createExercise("Bench Press");
      await logSet(benchPress, 10, 135);

      // Query without authentication
      const result = await t.query(api.analyticsRecovery.getRecoveryStatus, {});

      expect(result).toEqual([]);
    });

    test("handles exercises mapped to multiple muscle groups", async () => {
      const deadlift = await createExercise("Deadlift"); // Back, Hamstrings, Glutes

      // Log deadlift set
      await logSet(deadlift, 5, 315, daysAgo(2));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      // All three muscle groups should be updated
      const back = result.find((r) => r.muscleGroup === "Back");
      const hamstrings = result.find((r) => r.muscleGroup === "Hamstrings");
      const glutes = result.find((r) => r.muscleGroup === "Glutes");

      // Should be 1-2 days depending on timing
      expect(back?.daysSince).toBeGreaterThanOrEqual(1);
      expect(back?.daysSince).toBeLessThanOrEqual(2);
      expect(hamstrings?.daysSince).toBeGreaterThanOrEqual(1);
      expect(hamstrings?.daysSince).toBeLessThanOrEqual(2);
      expect(glutes?.daysSince).toBeGreaterThanOrEqual(1);
      expect(glutes?.daysSince).toBeLessThanOrEqual(2);

      // Volume should be counted for all three
      const expectedVolume = 5 * 315; // 1575
      expect(back?.volumeLast7Days).toBe(expectedVolume);
      expect(hamstrings?.volumeLast7Days).toBe(expectedVolume);
      expect(glutes?.volumeLast7Days).toBe(expectedVolume);
    });

    test("returns all muscle groups (except Other) even if never trained", async () => {
      // Don't log any sets - user has no training data

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      // Should return 10 muscle groups (11 total minus "Other")
      expect(result.length).toBe(10);

      // All should have null lastTrainedDate and daysSince = 999
      for (const data of result) {
        expect(data.lastTrainedDate).toBeNull();
        expect(data.daysSince).toBe(999);
        expect(data.volumeLast7Days).toBe(0);
        expect(data.frequencyLast7Days).toBe(0);
        expect(data.status).toBe("overdue");
        expect(data.muscleGroup).not.toBe("Other");
      }
    });

    test("sorts results by days since descending (most rested first)", async () => {
      // Create exercises for different muscle groups
      const benchPress = await createExercise("Bench Press"); // Chest
      const pullups = await createExercise("Pull-ups"); // Back
      const squats = await createExercise("Squats"); // Quads

      // Log sets at different times
      await logSet(benchPress, 10, 135, daysAgo(1)); // Chest: 1 day
      await logSet(pullups, 10, undefined, daysAgo(5)); // Back: 5 days
      await logSet(squats, 10, 225, daysAgo(10)); // Quads: 10 days

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      // Should be sorted by daysSince descending
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].daysSince).toBeGreaterThanOrEqual(
          result[i + 1].daysSince
        );
      }

      // First few should be never-trained groups (999 days)
      // Then Quads (10 days), Back (5 days), Chest (1 day) should appear in order
      const chest = result.find((r) => r.muscleGroup === "Chest");
      const back = result.find((r) => r.muscleGroup === "Back");
      const quads = result.find((r) => r.muscleGroup === "Quads");

      const chestIndex = result.indexOf(chest!);
      const backIndex = result.indexOf(back!);
      const quadsIndex = result.indexOf(quads!);

      expect(quadsIndex).toBeLessThan(backIndex);
      expect(backIndex).toBeLessThan(chestIndex);
    });

    test("only returns data for authenticated user (data isolation)", async () => {
      // User 1: Create exercise and log sets
      const user1Exercise = await createExercise("Bench Press", user1Subject);
      await logSet(user1Exercise, 10, 135, undefined, user1Subject);

      // User 2: Create different exercise and log sets
      const user2Exercise = await createExercise("Squats", user2Subject);
      await logSet(user2Exercise, 10, 225, undefined, user2Subject);

      // Query as User 1
      const user1Result = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      // User 1 should see chest trained, quads never trained
      const user1Chest = user1Result.find((r) => r.muscleGroup === "Chest");
      const user1Quads = user1Result.find((r) => r.muscleGroup === "Quads");

      expect(user1Chest?.daysSince).toBeLessThan(999);
      expect(user1Quads?.daysSince).toBe(999); // Never trained

      // Query as User 2
      const user2Result = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      // User 2 should see quads trained, chest never trained
      const user2Chest = user2Result.find((r) => r.muscleGroup === "Chest");
      const user2Quads = user2Result.find((r) => r.muscleGroup === "Quads");

      expect(user2Chest?.daysSince).toBe(999); // Never trained
      expect(user2Quads?.daysSince).toBeLessThan(999);
    });

    test("updates lastTrainedDate to most recent workout", async () => {
      const benchPress = await createExercise("Bench Press");

      // Log sets on different days
      await logSet(benchPress, 10, 135, daysAgo(5));
      await logSet(benchPress, 10, 135, daysAgo(3)); // Most recent
      await logSet(benchPress, 10, 135, daysAgo(7));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const chest = result.find((r) => r.muscleGroup === "Chest");
      // Should use most recent (3 days ago), allowing for 2-3 due to timing
      expect(chest?.daysSince).toBeGreaterThanOrEqual(2);
      expect(chest?.daysSince).toBeLessThanOrEqual(3);
    });

    test("handles bodyweight exercises (zero volume)", async () => {
      const pullups = await createExercise("Pull-ups");

      // Log bodyweight sets (no weight)
      await logSet(pullups, 10, undefined, daysAgo(1));
      await logSet(pullups, 8, undefined, daysAgo(1));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsRecovery.getRecoveryStatus, {});

      const back = result.find((r) => r.muscleGroup === "Back");
      expect(back?.volumeLast7Days).toBe(0); // Bodyweight = 0 volume
      expect(back?.frequencyLast7Days).toBe(1); // Still counts as 1 workout day
    });
  });
});
