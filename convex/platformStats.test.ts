import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { TestConvex } from "convex-test";

describe("platformStats", () => {
  let t: TestConvex<typeof schema>;
  const user1Subject = "user_platform_stats_1";
  const user2Subject = "user_platform_stats_2";

  beforeEach(() => {
    t = convexTest(schema, import.meta.glob("./**/*.ts"));
  });

  describe("getPlatformStats", () => {
    test("returns null when no sets exist (below threshold)", async () => {
      // No data seeded
      const stats = await t.query(api.platformStats.getPlatformStats, {});
      expect(stats).toBeNull();
    });

    test("returns null when sets are below threshold (< 100)", async () => {
      // Create exercise and log 50 sets (below threshold)
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Bench Press" });

      for (let i = 0; i < 50; i++) {
        await t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .mutation(api.sets.logSet, {
            exerciseId,
            reps: 10,
            weight: 100,
            unit: "lbs",
          });
      }

      const stats = await t.query(api.platformStats.getPlatformStats, {});
      expect(stats).toBeNull();
    });

    test("returns stats when sets are at or above threshold (>= 100)", async () => {
      // Create exercise and log 100 sets (at threshold)
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Bench Press" });

      for (let i = 0; i < 100; i++) {
        await t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .mutation(api.sets.logSet, {
            exerciseId,
            reps: 10,
            weight: 100,
            unit: "lbs",
          });
      }

      const stats = await t.query(api.platformStats.getPlatformStats, {});

      expect(stats).not.toBeNull();
      expect(stats?.totalSets).toBe(100);
      expect(stats?.totalLifters).toBe(1);
      expect(stats?.setsThisWeek).toBe(100); // All logged "now"
      expect(stats?.fetchedAt).toBeDefined();
    });

    test("counts unique lifters correctly", async () => {
      // Create exercises for two users and log 50 sets each
      const exercise1Id = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Bench Press" });

      const exercise2Id = await t
        .withIdentity({ subject: user2Subject, name: "User 2" })
        .action(api.exercises.createExercise, { name: "Squat" });

      for (let i = 0; i < 50; i++) {
        await t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .mutation(api.sets.logSet, {
            exerciseId: exercise1Id,
            reps: 10,
            weight: 100,
            unit: "lbs",
          });
      }

      for (let i = 0; i < 50; i++) {
        await t
          .withIdentity({ subject: user2Subject, name: "User 2" })
          .mutation(api.sets.logSet, {
            exerciseId: exercise2Id,
            reps: 10,
            weight: 100,
            unit: "lbs",
          });
      }

      const stats = await t.query(api.platformStats.getPlatformStats, {});

      expect(stats).not.toBeNull();
      expect(stats?.totalSets).toBe(100);
      expect(stats?.totalLifters).toBe(2);
    });

    test("is accessible without authentication (public query)", async () => {
      // Create exercise and log sets to meet threshold
      const exerciseId = await t
        .withIdentity({ subject: user1Subject, name: "User 1" })
        .action(api.exercises.createExercise, { name: "Bench Press" });

      for (let i = 0; i < 100; i++) {
        await t
          .withIdentity({ subject: user1Subject, name: "User 1" })
          .mutation(api.sets.logSet, {
            exerciseId,
            reps: 10,
            weight: 100,
            unit: "lbs",
          });
      }

      // Query WITHOUT identity (public/unauthenticated)
      const stats = await t.query(api.platformStats.getPlatformStats, {});

      expect(stats).not.toBeNull();
      expect(stats?.totalSets).toBe(100);
    });
  });
});
