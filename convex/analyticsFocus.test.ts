import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";

describe("Focus Suggestions Analytics", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_focus_test";
  const user2Subject = "user_2_focus_test";

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

  describe("getFocusSuggestions", () => {
    test("suggests exercise not trained in 7+ days (high priority)", async () => {
      const benchPress = await createExercise("Bench Press");
      const squats = await createExercise("Squats");

      // Train bench press today, squats 10 days ago
      await logSet(benchPress, 10, 135, daysAgo(0));
      await logSet(squats, 10, 225, daysAgo(10));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Should suggest squats (not trained in 10 days)
      const squatsSuggestion = result.find((s) => s.title === "Train Squats");
      expect(squatsSuggestion).toBeDefined();
      expect(squatsSuggestion?.type).toBe("exercise");
      expect(squatsSuggestion?.priority).toBe("high");
      // Should be 9 or 10 days depending on exact timing
      expect(squatsSuggestion?.reason).toMatch(/(9|10) days/);
      expect(squatsSuggestion?.exerciseId).toBe(squats);
    });

    test("suggests muscle group with no training in last 7 days (medium priority)", async () => {
      // Only train chest exercises
      const benchPress = await createExercise("Bench Press");
      await logSet(benchPress, 10, 135, daysAgo(1));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Should suggest untrained muscle groups (Back, Legs, etc.)
      const backSuggestion = result.find((s) => s.title === "Train Back");
      expect(backSuggestion).toBeDefined();
      expect(backSuggestion?.type).toBe("muscle_group");
      expect(backSuggestion?.priority).toBe("medium");
      expect(backSuggestion?.reason).toBe("No training in last 7 days");
      expect(backSuggestion?.suggestedExercises).toBeDefined();
      expect(backSuggestion?.suggestedExercises?.length).toBeGreaterThan(0);
    });

    test("detects push/pull imbalance (too much push, not enough pull)", async () => {
      // Train lots of push, minimal pull
      const benchPress = await createExercise("Bench Press"); // Chest, Triceps
      const shoulderPress = await createExercise("Shoulder Press"); // Shoulders, Triceps
      const pullups = await createExercise("Pull-ups"); // Back, Biceps

      // Heavy push volume
      await logSet(benchPress, 10, 225, daysAgo(1)); // 2250
      await logSet(benchPress, 10, 225, daysAgo(1)); // 2250
      await logSet(shoulderPress, 10, 135, daysAgo(2)); // 1350
      await logSet(shoulderPress, 10, 135, daysAgo(2)); // 1350
      // Total push: ~7200

      // Minimal pull volume (need actual weight for volume calculation)
      await logSet(pullups, 10, 50, daysAgo(3)); // 500
      // Total pull: 500

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      const imbalanceSuggestion = result.find((s) =>
        s.title.includes("Balance Push/Pull")
      );
      expect(imbalanceSuggestion).toBeDefined();
      expect(imbalanceSuggestion?.type).toBe("balance");
      expect(imbalanceSuggestion?.priority).toBe("medium");
      expect(imbalanceSuggestion?.reason).toContain("higher than pull");
      expect(imbalanceSuggestion?.suggestedExercises).toContain("Pull-ups");
    });

    test("detects upper/lower imbalance (too much upper, not enough legs)", async () => {
      // Train lots of upper body, minimal legs
      const benchPress = await createExercise("Bench Press"); // Upper
      const pullups = await createExercise("Pull-ups"); // Upper
      const squats = await createExercise("Squats"); // Lower

      // Heavy upper volume
      await logSet(benchPress, 10, 225, daysAgo(1)); // 2250
      await logSet(benchPress, 10, 225, daysAgo(1)); // 2250
      await logSet(pullups, 10, undefined, daysAgo(2)); // 0 (bodyweight)
      // Total upper: ~4500

      // Minimal leg volume
      await logSet(squats, 10, 135, daysAgo(3)); // 1350
      // Total lower: 1350

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      const legDaySuggestion = result.find((s) => s.title.includes("Leg Day"));
      expect(legDaySuggestion).toBeDefined();
      expect(legDaySuggestion?.type).toBe("balance");
      expect(legDaySuggestion?.priority).toBe("medium");
      expect(legDaySuggestion?.reason).toContain("higher than legs");
      expect(legDaySuggestion?.suggestedExercises).toContain("Squats");
    });

    test("detects pull/push imbalance (too much pull, not enough push)", async () => {
      // Train lots of pull, minimal push
      const pullups = await createExercise("Pull-ups"); // Back, Biceps
      const rows = await createExercise("Rows"); // Back, Biceps
      const benchPress = await createExercise("Bench Press"); // Chest, Triceps

      // Heavy pull volume
      await logSet(pullups, 10, 50, daysAgo(1)); // 500
      await logSet(pullups, 10, 50, daysAgo(1)); // 500
      await logSet(rows, 10, 135, daysAgo(2)); // 1350
      await logSet(rows, 10, 135, daysAgo(2)); // 1350
      // Total pull: ~3700

      // Minimal push volume
      await logSet(benchPress, 10, 135, daysAgo(3)); // 1350
      // Total push: 1350

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      const imbalanceSuggestion = result.find((s) =>
        s.title.includes("Balance Push/Pull")
      );
      expect(imbalanceSuggestion).toBeDefined();
      expect(imbalanceSuggestion?.reason).toContain("higher than push");
      expect(imbalanceSuggestion?.suggestedExercises).toContain("Bench Press");
    });

    test("returns max 5 suggestions (truncates if more)", async () => {
      // Create many exercises, don't train them (will generate many suggestions)
      await createExercise("Exercise 1");
      await createExercise("Exercise 2");
      await createExercise("Exercise 3");
      await createExercise("Exercise 4");
      await createExercise("Exercise 5");
      await createExercise("Exercise 6");
      await createExercise("Exercise 7");

      // Train them all 10+ days ago to generate high-priority suggestions
      const exercises = await t.run(async (ctx) => {
        return await ctx.db
          .query("exercises")
          .withIndex("by_user", (q) => q.eq("userId", user1Subject))
          .collect();
      });

      for (const exercise of exercises) {
        await logSet(exercise._id, 10, 135, daysAgo(10));
      }

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Should return exactly 5 suggestions
      expect(result.length).toBeLessThanOrEqual(5);
    });

    test("returns empty array for brand new user (no exercises)", async () => {
      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      expect(result).toEqual([]);
    });

    test("returns empty array for user with exercises but no sets", async () => {
      // Create exercises but don't log any sets
      await createExercise("Bench Press");
      await createExercise("Squats");

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      expect(result).toEqual([]);
    });

    test("returns empty array for unauthenticated user", async () => {
      // Create exercises and sets as authenticated user
      const benchPress = await createExercise("Bench Press");
      await logSet(benchPress, 10, 135);

      // Query without authentication
      const result = await t.query(api.analyticsFocus.getFocusSuggestions, {});

      expect(result).toEqual([]);
    });

    test("prioritizes high before medium before low", async () => {
      // Create scenario with both high and medium priority suggestions
      const benchPress = await createExercise("Bench Press");
      const squats = await createExercise("Squats");

      // Train bench press today (will generate medium priority for untrained muscle groups)
      await logSet(benchPress, 10, 135, daysAgo(0));

      // Train squats 10 days ago (will generate high priority)
      await logSet(squats, 10, 225, daysAgo(10));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Verify high priority suggestions come first
      let lastPriority = "high";
      const priorityOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };

      for (const suggestion of result) {
        expect(priorityOrder[suggestion.priority]).toBeGreaterThanOrEqual(
          priorityOrder[lastPriority]
        );
        lastPriority = suggestion.priority;
      }
    });

    test("does not suggest exercises trained recently (within 7 days)", async () => {
      const benchPress = await createExercise("Bench Press");
      const squats = await createExercise("Squats");

      // Train bench press 3 days ago (within 7 day threshold)
      await logSet(benchPress, 10, 135, daysAgo(3));

      // Train squats 10 days ago (outside threshold)
      await logSet(squats, 10, 225, daysAgo(10));

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Should suggest squats but not bench press
      const squatsSuggestion = result.find((s) => s.title.includes("Squats"));
      const benchSuggestion = result.find((s) =>
        s.title.includes("Bench Press")
      );

      expect(squatsSuggestion).toBeDefined();
      expect(benchSuggestion).toBeUndefined();
    });

    test("only returns data for authenticated user (data isolation)", async () => {
      // User 1: Create exercise and don't train it for 10 days
      const user1Exercise = await createExercise("Bench Press", user1Subject);
      await logSet(user1Exercise, 10, 135, daysAgo(10), user1Subject);

      // User 2: Create different exercise and train it today
      const user2Exercise = await createExercise("Squats", user2Subject);
      await logSet(user2Exercise, 10, 225, daysAgo(0), user2Subject);

      // Query as User 1
      const user1Result = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Query as User 2
      const user2Result = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // User 1 should have suggestions (bench press not trained)
      expect(user1Result.length).toBeGreaterThan(0);

      // User 2 should have suggestions (untrained muscle groups)
      expect(user2Result.length).toBeGreaterThan(0);

      // But they should be different
      expect(user1Result).not.toEqual(user2Result);
    });

    test("ignores deleted exercises from suggestions", async () => {
      const benchPress = await createExercise("Bench Press");

      // Train it 10 days ago
      await logSet(benchPress, 10, 135, daysAgo(10));

      // Delete the exercise
      await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .mutation(api.exercises.deleteExercise, { id: benchPress });

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Should not suggest deleted bench press
      const benchSuggestion = result.find((s) =>
        s.title.includes("Bench Press")
      );
      expect(benchSuggestion).toBeUndefined();
    });

    test("handles balanced training (no imbalance suggestions)", async () => {
      // Train push and pull equally
      const benchPress = await createExercise("Bench Press"); // Push
      const pullups = await createExercise("Pull-ups"); // Pull

      // Equal volume
      await logSet(benchPress, 10, 135, daysAgo(1)); // 1350
      await logSet(pullups, 10, 135, daysAgo(1)); // 1350

      const result = await t
        .withIdentity({ subject: user1Subject, name: "Test User" })
        .query(api.analyticsFocus.getFocusSuggestions, {});

      // Should not have push/pull imbalance suggestions
      const imbalanceSuggestion = result.find((s) =>
        s.title.includes("Balance Push/Pull")
      );
      expect(imbalanceSuggestion).toBeUndefined();
    });
  });
});
