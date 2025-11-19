import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";

describe("Progressive Overload Analytics", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_progressive_overload_test";
  const user2Subject = "user_2_progressive_overload_test";

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
   * Helper: Log duration-based set for exercise
   */
  async function logDurationSet(
    exerciseId: Id<"exercises">,
    duration: number,
    performedAt?: number,
    userSubject = user1Subject
  ): Promise<Id<"sets">> {
    const setId = await t
      .withIdentity({ subject: userSubject, name: "Test User" })
      .mutation(api.sets.logSet, {
        exerciseId,
        duration,
      });

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
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  describe("getProgressiveOverloadData", () => {
    test("returns top 5 exercises by recent activity", async () => {
      // Create 7 exercises
      const exercises = await Promise.all([
        createExercise("Exercise 1"),
        createExercise("Exercise 2"),
        createExercise("Exercise 3"),
        createExercise("Exercise 4"),
        createExercise("Exercise 5"),
        createExercise("Exercise 6"),
        createExercise("Exercise 7"),
      ]);

      // Log sets with different recency (most recent first)
      await logSet(exercises[0], 10, 100, daysAgo(0)); // Today
      await logSet(exercises[1], 10, 100, daysAgo(1)); // Yesterday
      await logSet(exercises[2], 10, 100, daysAgo(2)); // 2 days ago
      await logSet(exercises[3], 10, 100, daysAgo(3)); // 3 days ago
      await logSet(exercises[4], 10, 100, daysAgo(4)); // 4 days ago
      await logSet(exercises[5], 10, 100, daysAgo(10)); // 10 days ago
      await logSet(exercises[6], 10, 100, daysAgo(20)); // 20 days ago

      // Query with default exerciseCount (5)
      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      // Should return exactly 5 exercises
      expect(result).toHaveLength(5);

      // Should be sorted by most recent activity
      expect(result[0].exerciseName).toBe("Exercise 1");
      expect(result[1].exerciseName).toBe("Exercise 2");
      expect(result[2].exerciseName).toBe("Exercise 3");
      expect(result[3].exerciseName).toBe("Exercise 4");
      expect(result[4].exerciseName).toBe("Exercise 5");
    });

    test("skips duration-only exercises but still fills requested count", async () => {
      const plank = await createExercise("Plank");
      const bench = await createExercise("Bench Press");
      const squats = await createExercise("Squats");

      await logDurationSet(plank, 60, daysAgo(0));
      await logSet(bench, 8, 135, daysAgo(1));
      await logSet(squats, 10, 185, daysAgo(2));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {
          exerciseCount: 2,
        });

      expect(result).toHaveLength(2);
      expect(result[0].exerciseName).toBe("Bench Press");
      expect(result[1].exerciseName).toBe("Squats");
      expect(result.find((exercise) => exercise.exerciseName === "Plank")).toBe(
        undefined
      );
      expect(result.every((exercise) => exercise.dataPoints.length > 0)).toBe(
        true
      );
    });

    test("respects custom exerciseCount parameter", async () => {
      // Create 5 exercises
      const exercises = await Promise.all([
        createExercise("Ex 1"),
        createExercise("Ex 2"),
        createExercise("Ex 3"),
        createExercise("Ex 4"),
        createExercise("Ex 5"),
      ]);

      // Log sets for each
      for (const ex of exercises) {
        await logSet(ex, 10, 100);
      }

      // Query with exerciseCount = 3
      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {
          exerciseCount: 3,
        });

      expect(result).toHaveLength(3);
    });

    test("correctly calculates max weight per workout", async () => {
      const benchPress = await createExercise("Bench Press");

      // Workout 1 (10 days ago): Multiple sets with varying weights
      await logSet(benchPress, 10, 135, daysAgo(10));
      await logSet(benchPress, 8, 145, daysAgo(10)); // Max weight
      await logSet(benchPress, 6, 155, daysAgo(10)); // Max weight
      await logSet(benchPress, 4, 165, daysAgo(10)); // Max weight

      // Workout 2 (5 days ago): Different max weight
      await logSet(benchPress, 10, 140, daysAgo(5));
      await logSet(benchPress, 8, 150, daysAgo(5));
      await logSet(benchPress, 6, 160, daysAgo(5)); // Max weight

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].dataPoints).toHaveLength(2);

      // First workout (oldest) should have maxWeight = 165
      expect(result[0].dataPoints[0].maxWeight).toBe(165);

      // Second workout should have maxWeight = 160
      expect(result[0].dataPoints[1].maxWeight).toBe(160);
    });

    test("correctly calculates max reps per workout", async () => {
      const squats = await createExercise("Squats");

      // Workout 1: Multiple sets with varying reps
      await logSet(squats, 5, 225, daysAgo(10));
      await logSet(squats, 8, 225, daysAgo(10));
      await logSet(squats, 12, 225, daysAgo(10)); // Max reps

      // Workout 2: Different max reps
      await logSet(squats, 6, 225, daysAgo(5));
      await logSet(squats, 10, 225, daysAgo(5)); // Max reps

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].dataPoints).toHaveLength(2);

      // First workout should have maxReps = 12
      expect(result[0].dataPoints[0].maxReps).toBe(12);

      // Second workout should have maxReps = 10
      expect(result[0].dataPoints[1].maxReps).toBe(10);
    });

    test("correctly calculates volume per workout", async () => {
      const deadlift = await createExercise("Deadlift");

      // Workout 1: 3 sets
      // Volume = (5 × 315) + (5 × 315) + (5 × 315) = 4725
      await logSet(deadlift, 5, 315, daysAgo(10));
      await logSet(deadlift, 5, 315, daysAgo(10));
      await logSet(deadlift, 5, 315, daysAgo(10));

      // Workout 2: 4 sets with different weights
      // Volume = (8 × 225) + (6 × 275) + (4 × 315) + (2 × 365) = 1800 + 1650 + 1260 + 730 = 5440
      await logSet(deadlift, 8, 225, daysAgo(5));
      await logSet(deadlift, 6, 275, daysAgo(5));
      await logSet(deadlift, 4, 315, daysAgo(5));
      await logSet(deadlift, 2, 365, daysAgo(5));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].dataPoints).toHaveLength(2);

      expect(result[0].dataPoints[0].volume).toBe(4725);
      expect(result[0].dataPoints[1].volume).toBe(5440);
    });

    test("limits to last 10 workouts per exercise", async () => {
      const benchPress = await createExercise("Bench Press");

      // Log 15 workouts (one per day for 15 days)
      for (let i = 0; i < 15; i++) {
        await logSet(benchPress, 10, 135, daysAgo(14 - i));
      }

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);

      // Should only return last 10 workouts
      expect(result[0].dataPoints).toHaveLength(10);
    });

    test("handles multiple sets on same day correctly", async () => {
      const squats = await createExercise("Squats");

      // Single workout day with 5 sets
      const workoutDay = daysAgo(5);
      await logSet(squats, 10, 225, workoutDay);
      await logSet(squats, 10, 225, workoutDay);
      await logSet(squats, 8, 245, workoutDay); // Max weight
      await logSet(squats, 6, 265, workoutDay); // Max weight and reps
      await logSet(squats, 12, 185, workoutDay); // Max reps

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);

      // Should group all sets into single workout
      expect(result[0].dataPoints).toHaveLength(1);

      const workout = result[0].dataPoints[0];
      expect(workout.maxWeight).toBe(265);
      expect(workout.maxReps).toBe(12);

      // Volume = (10×225) + (10×225) + (8×245) + (6×265) + (12×185) = 10270
      expect(workout.volume).toBe(10270);
    });

    test("handles bodyweight exercises (null weight)", async () => {
      const pullups = await createExercise("Pull-ups");

      // Bodyweight exercise - no weight
      await logSet(pullups, 10, undefined, daysAgo(10));
      await logSet(pullups, 8, undefined, daysAgo(10));
      await logSet(pullups, 6, undefined, daysAgo(10));

      await logSet(pullups, 12, undefined, daysAgo(5));
      await logSet(pullups, 10, undefined, daysAgo(5));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].dataPoints).toHaveLength(2);

      // maxWeight should be null for bodyweight exercises
      expect(result[0].dataPoints[0].maxWeight).toBeNull();
      expect(result[0].dataPoints[1].maxWeight).toBeNull();

      // But maxReps should still be calculated
      expect(result[0].dataPoints[0].maxReps).toBe(10);
      expect(result[0].dataPoints[1].maxReps).toBe(12);

      // Volume for bodyweight is 0 (no weight)
      expect(result[0].dataPoints[0].volume).toBe(0);
      expect(result[0].dataPoints[1].volume).toBe(0);
    });

    test("trend detection: improving (weight increased)", async () => {
      const benchPress = await createExercise("Bench Press");

      // Create 6 workouts with increasing volume
      // Previous 3 workouts (days 15-13): avg volume ≈ 4050
      await logSet(benchPress, 10, 135, daysAgo(15)); // Volume: 1350
      await logSet(benchPress, 10, 135, daysAgo(15));
      await logSet(benchPress, 10, 135, daysAgo(15)); // Total: 4050

      await logSet(benchPress, 10, 135, daysAgo(14)); // Volume: 4050
      await logSet(benchPress, 10, 135, daysAgo(14));
      await logSet(benchPress, 10, 135, daysAgo(14));

      await logSet(benchPress, 10, 135, daysAgo(13)); // Volume: 4050
      await logSet(benchPress, 10, 135, daysAgo(13));
      await logSet(benchPress, 10, 135, daysAgo(13));

      // Recent 3 workouts (days 12-10): avg volume ≈ 4500 (11% increase)
      await logSet(benchPress, 10, 150, daysAgo(12)); // Volume: 4500
      await logSet(benchPress, 10, 150, daysAgo(12));
      await logSet(benchPress, 10, 150, daysAgo(12));

      await logSet(benchPress, 10, 150, daysAgo(11)); // Volume: 4500
      await logSet(benchPress, 10, 150, daysAgo(11));
      await logSet(benchPress, 10, 150, daysAgo(11));

      await logSet(benchPress, 10, 150, daysAgo(10)); // Volume: 4500
      await logSet(benchPress, 10, 150, daysAgo(10));
      await logSet(benchPress, 10, 150, daysAgo(10));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].trend).toBe("improving");
    });

    test("trend detection: plateau (no significant change)", async () => {
      const squats = await createExercise("Squats");

      // Create 6 workouts with consistent volume (within ±5%)
      for (let i = 0; i < 6; i++) {
        await logSet(squats, 10, 225, daysAgo(10 - i)); // Volume: 2250
        await logSet(squats, 10, 225, daysAgo(10 - i));
      }

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].trend).toBe("plateau");
    });

    test("trend detection: declining (weight decreased)", async () => {
      const deadlift = await createExercise("Deadlift");

      // Previous 3 workouts: high volume
      await logSet(deadlift, 5, 405, daysAgo(15)); // Volume: 2025
      await logSet(deadlift, 5, 405, daysAgo(15));

      await logSet(deadlift, 5, 405, daysAgo(14)); // Volume: 2025
      await logSet(deadlift, 5, 405, daysAgo(14));

      await logSet(deadlift, 5, 405, daysAgo(13)); // Volume: 2025
      await logSet(deadlift, 5, 405, daysAgo(13));

      // Recent 3 workouts: lower volume (30% decrease)
      await logSet(deadlift, 5, 315, daysAgo(12)); // Volume: 1575
      await logSet(deadlift, 5, 315, daysAgo(12));

      await logSet(deadlift, 5, 315, daysAgo(11)); // Volume: 1575
      await logSet(deadlift, 5, 315, daysAgo(11));

      await logSet(deadlift, 5, 315, daysAgo(10)); // Volume: 1575
      await logSet(deadlift, 5, 315, daysAgo(10));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].trend).toBe("declining");
    });

    test("trend detection: defaults to plateau with fewer than 6 workouts", async () => {
      const benchPress = await createExercise("Bench Press");

      // Only 3 workouts - not enough for trend detection
      await logSet(benchPress, 10, 135, daysAgo(5));
      await logSet(benchPress, 10, 140, daysAgo(4));
      await logSet(benchPress, 10, 145, daysAgo(3));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].trend).toBe("plateau");
    });

    test("returns empty array for unauthenticated user", async () => {
      // Create exercise and sets
      const benchPress = await createExercise("Bench Press");
      await logSet(benchPress, 10, 135);

      // Query without authentication
      const result = await t.query(
        api.analyticsProgressiveOverload.getProgressiveOverloadData,
        {}
      );

      expect(result).toEqual([]);
    });

    test("returns empty array for user with no sets", async () => {
      // Create exercise but no sets
      await createExercise("Bench Press");

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toEqual([]);
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
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(user1Result).toHaveLength(1);
      expect(user1Result[0].exerciseName).toBe("Bench Press");

      // Query as User 2
      const user2Result = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(user2Result).toHaveLength(1);
      expect(user2Result[0].exerciseName).toBe("Squats");
    });

    test("dataPoints are sorted chronologically (oldest to newest)", async () => {
      const benchPress = await createExercise("Bench Press");

      // Log sets in random order
      await logSet(benchPress, 10, 135, daysAgo(5));
      await logSet(benchPress, 10, 145, daysAgo(1)); // Most recent
      await logSet(benchPress, 10, 140, daysAgo(3));
      await logSet(benchPress, 10, 130, daysAgo(10)); // Oldest
      await logSet(benchPress, 10, 142, daysAgo(2));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsProgressiveOverload.getProgressiveOverloadData, {});

      expect(result).toHaveLength(1);
      expect(result[0].dataPoints).toHaveLength(5);

      // Verify chronological order (oldest to newest)
      const weights = result[0].dataPoints.map((d) => d.maxWeight);
      expect(weights).toEqual([130, 135, 140, 142, 145]);
    });
  });
});
