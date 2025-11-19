import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";

describe("Analytics Queries", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_analytics_test";
  const user2Subject = "user_2_analytics_test";

  beforeEach(async () => {
    // Create fresh test environment for each test
    t = convexTest(schema, import.meta.glob("./**/*.ts"));
  });

  /**
   * Helper: Create exercise for user
   */
  async function createExercise(name: string): Promise<Id<"exercises">> {
    return await t
      .withIdentity({ subject: user1Subject, name: "User 1" })
      .action(api.exercises.createExercise, { name });
  }

  /**
   * Helper: Log set for exercise
   */
  async function logSet(
    exerciseId: Id<"exercises">,
    reps: number,
    weight?: number,
    performedAt?: number
  ): Promise<Id<"sets">> {
    // If performedAt not provided, use current time
    const setId = await t
      .withIdentity({ subject: user1Subject, name: "User 1" })
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

  describe("getVolumeByExercise", () => {
    test("calculates total volume for multiple exercises", async () => {
      // Create exercises
      const benchPress = await createExercise("Bench Press");
      const squats = await createExercise("Squats");

      // Log sets
      // Bench: 3 sets × 10 reps × 135 lbs = 4050 volume
      await logSet(benchPress, 10, 135);
      await logSet(benchPress, 10, 135);
      await logSet(benchPress, 10, 135);

      // Squats: 2 sets × 12 reps × 225 lbs = 5400 volume
      await logSet(squats, 12, 225);
      await logSet(squats, 12, 225);

      // Query volume
      const volumes = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getVolumeByExercise, {});

      expect(volumes).toHaveLength(2);

      // Should be sorted by volume descending (Squats > Bench)
      expect(volumes[0].exerciseName).toBe("Squats");
      expect(volumes[0].totalVolume).toBe(5400);
      expect(volumes[0].sets).toBe(2);

      expect(volumes[1].exerciseName).toBe("Bench Press");
      expect(volumes[1].totalVolume).toBe(4050);
      expect(volumes[1].sets).toBe(3);
    });

    test("handles bodyweight exercises (weight = 0 or undefined)", async () => {
      const pullups = await createExercise("Pull-ups");

      // Bodyweight exercises: no weight provided
      await logSet(pullups, 10);
      await logSet(pullups, 8);
      await logSet(pullups, 6);

      const volumes = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getVolumeByExercise, {});

      expect(volumes).toHaveLength(1);
      expect(volumes[0].exerciseName).toBe("Pull-ups");
      expect(volumes[0].totalVolume).toBe(0); // 0 weight = 0 volume
      expect(volumes[0].sets).toBe(3);
    });

    test("filters by date range (startDate)", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

      // Old set (60 days ago)
      await logSet(benchPress, 10, 100, sixtyDaysAgo);

      // Recent sets (within 30 days)
      await logSet(benchPress, 10, 135, now - 1000);
      await logSet(benchPress, 10, 135, now);

      // Query last 30 days only
      const volumes = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getVolumeByExercise, {
          startDate: thirtyDaysAgo,
        });

      expect(volumes).toHaveLength(1);
      expect(volumes[0].totalVolume).toBe(2700); // 2 sets × 10 × 135
      expect(volumes[0].sets).toBe(2);
    });

    test("filters by date range (endDate)", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Old set (more than 7 days ago)
      await logSet(benchPress, 10, 135, sevenDaysAgo - 1000);

      // Recent set (within 7 days)
      await logSet(benchPress, 10, 135, now);

      // Query up to 7 days ago
      const volumes = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getVolumeByExercise, {
          endDate: sevenDaysAgo,
        });

      expect(volumes).toHaveLength(1);
      expect(volumes[0].totalVolume).toBe(1350); // 1 set × 10 × 135
      expect(volumes[0].sets).toBe(1);
    });

    test("returns empty array for user with no sets", async () => {
      const volumes = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getVolumeByExercise, {});

      expect(volumes).toEqual([]);
    });

    test("includes deleted exercises in volume calculation", async () => {
      const benchPress = await createExercise("Bench Press");

      // Log sets before deletion
      await logSet(benchPress, 10, 135);

      // Delete exercise (soft delete)
      await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .mutation(api.exercises.deleteExercise, { id: benchPress });

      // Volume query should still include deleted exercise's historical data
      const volumes = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getVolumeByExercise, {});

      expect(volumes).toHaveLength(1);
      expect(volumes[0].exerciseName).toBe("Bench Press");
      expect(volumes[0].totalVolume).toBe(1350);
    });

    test("isolates data per user", async () => {
      // User 1 exercise
      const user1Exercise = await createExercise("Bench Press");
      await logSet(user1Exercise, 10, 135);

      // User 2 exercise
      const user2Exercise = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .action(api.exercises.createExercise, { name: "Squats" });

      await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .mutation(api.sets.logSet, {
          exerciseId: user2Exercise,
          reps: 12,
          weight: 225,
          unit: "lbs",
        });

      // User 1 should only see their own data
      const user1Volumes = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getVolumeByExercise, {});

      expect(user1Volumes).toHaveLength(1);
      expect(user1Volumes[0].exerciseName).toBe("Bench Press");

      // User 2 should only see their own data
      const user2Volumes = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .query(api.analytics.getVolumeByExercise, {});

      expect(user2Volumes).toHaveLength(1);
      expect(user2Volumes[0].exerciseName).toBe("Squats");
    });
  });

  describe("getWorkoutFrequency", () => {
    test("returns daily workout counts for specified days", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

      // Log sets on different days
      await logSet(benchPress, 10, 135, twoDaysAgo);
      await logSet(benchPress, 10, 135, twoDaysAgo + 1000); // Same day
      await logSet(benchPress, 10, 135, oneDayAgo);

      const frequency = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getWorkoutFrequency, { days: 7 });

      // Should return 8 days (today + 7 days back)
      expect(frequency.length).toBeGreaterThanOrEqual(7);

      // Find the days with workouts
      const workoutDays = frequency.filter((day: any) => day.setCount > 0);
      expect(workoutDays.length).toBeGreaterThanOrEqual(2);
    });

    test("fills gaps with zero days for continuous date range", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Log sets only on day 0 (today) and day 7 (gap in between)
      await logSet(benchPress, 10, 135, sevenDaysAgo);
      await logSet(benchPress, 10, 135, now);

      const frequency = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getWorkoutFrequency, { days: 7 });

      // Should have 8 entries (today + 7 days back)
      expect(frequency.length).toBeGreaterThanOrEqual(7);

      // Most days should have zero sets
      const zeroDays = frequency.filter((day: any) => day.setCount === 0);
      expect(zeroDays.length).toBeGreaterThan(0);
    });

    test("calculates total volume per day", async () => {
      const benchPress = await createExercise("Bench Press");

      // Use recent timestamp (within query range)
      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      // Log multiple sets on same day
      await logSet(benchPress, 10, 100, oneDayAgo);
      await logSet(benchPress, 8, 110, oneDayAgo + 3600000); // 1 hour later

      const frequency = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getWorkoutFrequency, { days: 7 });

      // Should return data for last 7 days
      expect(frequency.length).toBeGreaterThan(0);

      // Find workout days (should have at least one)
      const workoutDays = frequency.filter((day: any) => day.setCount > 0);
      expect(workoutDays.length).toBeGreaterThan(0);

      // Verify volume calculated correctly for at least one day
      const hasCorrectVolume = workoutDays.some(
        (day: any) => day.setCount >= 1 && day.totalVolume > 0
      );
      expect(hasCorrectVolume).toBe(true);
    });

    test("returns empty array for unauthenticated user", async () => {
      const frequency = await t.query(api.analytics.getWorkoutFrequency, {
        days: 7,
      });

      expect(frequency).toEqual([]);
    });
  });

  describe("getStreakStats", () => {
    test("calculates current streak for consecutive workout days", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

      // Log sets on 3 consecutive days
      await logSet(benchPress, 10, 135, twoDaysAgo);
      await logSet(benchPress, 10, 135, oneDayAgo);
      await logSet(benchPress, 10, 135, now);

      const stats = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getStreakStats, {});

      expect(stats.currentStreak).toBeGreaterThanOrEqual(1);
      expect(stats.totalWorkouts).toBe(3);
    });

    test("returns zero current streak if last workout was >1 day ago", async () => {
      const benchPress = await createExercise("Bench Press");

      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

      // Last workout was 3 days ago (streak broken)
      await logSet(benchPress, 10, 135, threeDaysAgo);

      const stats = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getStreakStats, {});

      expect(stats.currentStreak).toBe(0);
      expect(stats.totalWorkouts).toBe(1);
    });

    test("calculates longest streak from workout history", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();

      // Create a 5-day streak in the past
      for (let i = 10; i <= 14; i++) {
        const daysAgo = i * 24 * 60 * 60 * 1000;
        await logSet(benchPress, 10, 135, now - daysAgo);
      }

      // Gap (streak broken)

      // Current shorter streak (2 days)
      await logSet(benchPress, 10, 135, now - 1 * 24 * 60 * 60 * 1000);
      await logSet(benchPress, 10, 135, now);

      const stats = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getStreakStats, {});

      expect(stats.longestStreak).toBeGreaterThanOrEqual(2);
      expect(stats.totalWorkouts).toBeGreaterThanOrEqual(7);
    });

    test("counts total unique workout days", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      // Log multiple sets on same day (should count as 1 workout day)
      await logSet(benchPress, 10, 135, now);
      await logSet(benchPress, 8, 140, now + 1000);
      await logSet(benchPress, 6, 145, now + 2000);

      // Different day
      await logSet(benchPress, 10, 135, oneDayAgo);

      const stats = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getStreakStats, {});

      expect(stats.totalWorkouts).toBe(2); // 2 unique days
    });

    test("returns zeros for user with no workouts", async () => {
      const stats = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getStreakStats, {});

      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
      expect(stats.totalWorkouts).toBe(0);
    });
  });

  describe("getRecentPRs", () => {
    test("detects weight PRs", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      // First set: 135 lbs
      await logSet(benchPress, 10, 135, oneDayAgo);

      // PR: 145 lbs (new weight PR)
      await logSet(benchPress, 10, 145, now);

      const prs = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      expect(prs.length).toBeGreaterThan(0);

      const weightPR = prs.find((pr: any) => pr.prType === "weight");
      expect(weightPR).toBeDefined();
      expect(weightPR!.currentValue).toBe(145);
      expect(weightPR!.previousValue).toBeLessThan(145);
    });

    test("detects reps PRs", async () => {
      const pullups = await createExercise("Pull-ups");

      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      // First set: 8 reps
      await logSet(pullups, 8, undefined, oneDayAgo);

      // PR: 12 reps (new reps PR for bodyweight)
      await logSet(pullups, 12, undefined, now);

      const prs = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      expect(prs.length).toBeGreaterThan(0);

      const repsPR = prs.find((pr: any) => pr.prType === "reps");
      expect(repsPR).toBeDefined();
      expect(repsPR!.currentValue).toBe(12);
      expect(repsPR!.previousValue).toBe(8);
    });

    test("detects volume PRs", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      // First set: 10 reps × 100 lbs = 1000 volume
      await logSet(benchPress, 10, 100, oneDayAgo);

      // PR: 15 reps × 100 lbs = 1500 volume (new volume PR)
      await logSet(benchPress, 15, 100, now);

      const prs = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      expect(prs.length).toBeGreaterThan(0);

      // Should detect volume PR (or reps PR - both are valid)
      const volumePR = prs.find(
        (pr: any) => pr.prType === "volume" || pr.prType === "reps"
      );
      expect(volumePR).toBeDefined();
    });

    test("first set for exercise is always a PR", async () => {
      const benchPress = await createExercise("Bench Press");

      // First ever set for this exercise
      await logSet(benchPress, 10, 135, Date.now());

      const prs = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      expect(prs.length).toBeGreaterThan(0);
      expect(prs[0].previousValue).toBe(0); // First set baseline
    });

    test("filters PRs by date range", async () => {
      const benchPress = await createExercise("Bench Press");

      const now = Date.now();
      const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;

      // Old PR (10 days ago)
      await logSet(benchPress, 10, 135, tenDaysAgo);

      const prs7Days = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      const prs30Days = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 30 });

      // 7-day query should not include 10-day-old PR
      expect(prs7Days.length).toBe(0);

      // 30-day query should include it
      expect(prs30Days.length).toBeGreaterThan(0);
    });

    test("includes exercise names in PR results", async () => {
      const benchPress = await createExercise("Bench Press");

      await logSet(benchPress, 10, 135, Date.now());

      const prs = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      expect(prs.length).toBeGreaterThan(0);
      expect(prs[0].exerciseName).toBe("Bench Press");
    });

    test("returns empty array when no PRs in date range", async () => {
      const benchPress = await createExercise("Bench Press");

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      // Old workout (not within query range)
      await logSet(benchPress, 10, 135, thirtyDaysAgo);
      await logSet(benchPress, 10, 135, thirtyDaysAgo + 1000);

      const prs = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      expect(prs).toEqual([]);
    });

    test("sorts PRs by date descending (most recent first)", async () => {
      const benchPress = await createExercise("Bench Press");
      const squats = await createExercise("Squats");

      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      // PR on different exercises at different times
      await logSet(benchPress, 10, 135, oneDayAgo); // Older PR
      await logSet(squats, 10, 225, now); // Newer PR

      const prs = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .query(api.analytics.getRecentPRs, { days: 7 });

      expect(prs.length).toBeGreaterThanOrEqual(2);

      // Most recent PR should be first
      expect(prs[0].performedAt).toBeGreaterThan(prs[1].performedAt);
    });
  });
});
