/**
 * Auth Guard Regression Tests
 *
 * Verifies that every Convex entrypoint touching user-owned data
 * enforces authentication and ownership checks consistently.
 *
 * Invariants tested:
 * - Mutations throw "Not authenticated" for unauthenticated callers
 * - Queries return null/[] for unauthenticated callers (graceful for UI)
 * - Cross-user access is blocked (IDOR prevention)
 * - All domains use requireAuth/requireOwnership from validate.ts
 */
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import type { TestConvex } from "convex-test";

const modules = import.meta.glob("./**/*.ts");

const USER_A = "user_a_auth_test";
const USER_B = "user_b_auth_test";

describe("Auth Guards — Cross-Domain Regression", () => {
  let t: TestConvex<typeof schema>;
  let userAExerciseId: Id<"exercises">;
  let userBExerciseId: Id<"exercises">;
  let userASetId: Id<"sets">;
  let userASessionId: Id<"coachSessions">;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    // Seed User A: exercise, set, coach session
    userAExerciseId = await t
      .withIdentity({ subject: USER_A, name: "User A" })
      .action(api.exercises.createExercise, { name: "BENCH PRESS" });

    userASetId = await t
      .withIdentity({ subject: USER_A, name: "User A" })
      .mutation(api.sets.logSet, {
        exerciseId: userAExerciseId,
        reps: 10,
        weight: 135,
        unit: "lbs",
      });

    // Create user record for User A (needed for user-scoped queries)
    await t
      .withIdentity({ subject: USER_A, name: "User A" })
      .mutation(api.users.getOrCreateUser, { timezone: "America/New_York" });

    // Create coach session for User A
    userASessionId = await t.run(async (ctx) => {
      return await ctx.db.insert("coachSessions", {
        userId: USER_A,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        status: "active",
      });
    });

    // Seed User B: exercise
    userBExerciseId = await t
      .withIdentity({ subject: USER_B, name: "User B" })
      .action(api.exercises.createExercise, { name: "SQUAT" });

    await t
      .withIdentity({ subject: USER_B, name: "User B" })
      .mutation(api.users.getOrCreateUser, { timezone: "Europe/London" });
  });

  // ==========================================================================
  // SETS DOMAIN
  // ==========================================================================
  describe("sets", () => {
    test("logSet rejects unauthenticated", async () => {
      await expect(
        t.mutation(api.sets.logSet, {
          exerciseId: userAExerciseId,
          reps: 5,
        })
      ).rejects.toThrow("Not authenticated");
    });

    test("logSet rejects cross-user exercise", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.sets.logSet, {
            exerciseId: userAExerciseId,
            reps: 5,
          })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("deleteSet rejects unauthenticated", async () => {
      await expect(
        t.mutation(api.sets.deleteSet, { id: userASetId })
      ).rejects.toThrow("Not authenticated");
    });

    test("deleteSet rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.sets.deleteSet, { id: userASetId })
      ).rejects.toThrow("Not authorized to access this set");
    });

    test("editSet rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.sets.editSet, { id: userASetId, reps: 20 })
      ).rejects.toThrow("Not authorized to access this set");
    });

    test("getSet returns null for cross-user", async () => {
      const result = await t
        .withIdentity({ subject: USER_B, name: "User B" })
        .query(api.sets.getSet, { id: userASetId });
      expect(result).toBeNull();
    });

    test("listSets returns empty for unauthenticated", async () => {
      const result = await t.query(api.sets.listSets, {});
      expect(result).toEqual([]);
    });

    test("listSetsForDateRange returns empty for unauthenticated", async () => {
      const result = await t.query(api.sets.listSetsForDateRange, {
        startDate: 0,
        endDate: Date.now() + 86400000,
      });
      expect(result).toEqual([]);
    });

    test("getRecentSetsForExercise rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .query(api.sets.getRecentSetsForExercise, {
            exerciseId: userAExerciseId,
          })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("listSetsForExerciseDateRange rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .query(api.sets.listSetsForExerciseDateRange, {
            exerciseId: userAExerciseId,
            startDate: 0,
            endDate: Date.now() + 86400000,
          })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("getExerciseAllTimeStats rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .query(api.sets.getExerciseAllTimeStats, {
            exerciseId: userAExerciseId,
          })
      ).rejects.toThrow("Not authorized to access this exercise");
    });
  });

  // ==========================================================================
  // EXERCISES DOMAIN
  // ==========================================================================
  describe("exercises", () => {
    test("updateExercise rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.exercises.updateExercise, {
            id: userAExerciseId,
            name: "STOLEN",
          })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("deleteExercise rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.exercises.deleteExercise, { id: userAExerciseId })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("mergeExercise rejects cross-user source", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.exercises.mergeExercise, {
            fromId: userAExerciseId,
            toId: userBExerciseId,
          })
      ).rejects.toThrow("Not authorized to access this exercise");
    });

    test("getExercise returns null for cross-user", async () => {
      const result = await t
        .withIdentity({ subject: USER_B, name: "User B" })
        .query(api.exercises.getExercise, { id: userAExerciseId });
      expect(result).toBeNull();
    });

    test("listExercises returns empty for unauthenticated", async () => {
      const result = await t.query(api.exercises.listExercises, {});
      expect(result).toEqual([]);
    });

    test("updateMuscleGroups rejects cross-user", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.exercises.updateMuscleGroups, {
            id: userAExerciseId,
            muscleGroups: ["Chest"],
          })
      ).rejects.toThrow("Not authorized to access this exercise");
    });
  });

  // ==========================================================================
  // COACH SESSIONS DOMAIN
  // ==========================================================================
  describe("coachSessions", () => {
    test("getOrCreateTodaySession rejects unauthenticated", async () => {
      await expect(
        t.mutation(api.coachSessions.getOrCreateTodaySession, {
          timezoneOffsetMinutes: 360,
        })
      ).rejects.toThrow("Not authenticated");
    });

    test("addMessage rejects cross-user session", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.coachSessions.addMessage, {
            sessionId: userASessionId,
            role: "user",
            content: "injected",
          })
      ).rejects.toThrow("Not authorized to access this session");
    });

    test("getSessionMessages rejects cross-user session", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .query(api.coachSessions.getSessionMessages, {
            sessionId: userASessionId,
          })
      ).rejects.toThrow("Not authorized to access this session");
    });

    test("applySummary rejects cross-user session", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.coachSessions.applySummary, {
            sessionId: userASessionId,
            summary: "stolen",
            summarizeThroughCreatedAt: Date.now(),
          })
      ).rejects.toThrow("Not authorized to access this session");
    });

    test("archiveSession rejects cross-user session", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.coachSessions.archiveSession, {
            sessionId: userASessionId,
          })
      ).rejects.toThrow("Not authorized to access this session");
    });
  });

  // ==========================================================================
  // AGENT ACTIONS DOMAIN
  // ==========================================================================
  describe("agentActions", () => {
    test("recordLogSetAction rejects unauthenticated", async () => {
      await expect(
        t.mutation(api.agentActions.recordLogSetAction, {
          turnId: "turn_1",
          setId: userASetId,
          exerciseId: userAExerciseId,
          exerciseName: "BENCH PRESS",
          reps: 10,
          performedAt: Date.now(),
        })
      ).rejects.toThrow("Not authenticated");
    });

    test("recordLogSetAction rejects cross-user set", async () => {
      await expect(
        t
          .withIdentity({ subject: USER_B, name: "User B" })
          .mutation(api.agentActions.recordLogSetAction, {
            turnId: "turn_1",
            setId: userASetId,
            exerciseId: userAExerciseId,
            exerciseName: "BENCH PRESS",
            reps: 10,
            performedAt: Date.now(),
          })
      ).rejects.toThrow("Not authorized to access this set");
    });

    test("listActionsForTurn returns empty for unauthenticated", async () => {
      const result = await t.query(api.agentActions.listActionsForTurn, {
        turnId: "turn_1",
      });
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // ANALYTICS DOMAIN
  // ==========================================================================
  describe("analytics", () => {
    test("getDashboardAnalytics returns defaults for unauthenticated", async () => {
      const result = await t.query(api.analytics.getDashboardAnalytics, {});
      expect(result.streakStats.currentStreak).toBe(0);
      expect(result.frequency).toEqual([]);
    });

    test("getVolumeByExercise returns empty for unauthenticated", async () => {
      const result = await t.query(api.analytics.getVolumeByExercise, {});
      expect(result).toEqual([]);
    });

    test("getStreakStats returns zeros for unauthenticated", async () => {
      const result = await t.query(api.analytics.getStreakStats, {});
      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
      });
    });
  });

  // ==========================================================================
  // USERS DOMAIN
  // ==========================================================================
  describe("users", () => {
    test("getOrCreateUser rejects unauthenticated", async () => {
      await expect(t.mutation(api.users.getOrCreateUser, {})).rejects.toThrow(
        "Not authenticated"
      );
    });

    test("getCurrentUser returns null for unauthenticated", async () => {
      const result = await t.query(api.users.getCurrentUser, {});
      expect(result).toBeNull();
    });

    test("getSubscriptionStatus returns null for unauthenticated", async () => {
      const result = await t.query(api.users.getSubscriptionStatus, {});
      expect(result).toBeNull();
    });

    test("updatePreferences rejects unauthenticated", async () => {
      await expect(
        t.mutation(api.users.updatePreferences, {
          goals: [],
        })
      ).rejects.toThrow("Not authenticated");
    });

    test("dismissOnboardingNudge rejects unauthenticated", async () => {
      await expect(
        t.mutation(api.users.dismissOnboardingNudge, {})
      ).rejects.toThrow("Not authenticated");
    });
  });

  // ==========================================================================
  // SUBSCRIPTIONS DOMAIN
  // ==========================================================================
  describe("subscriptions", () => {
    test("getStripeCustomerId returns null for unauthenticated", async () => {
      const result = await t.query(api.subscriptions.getStripeCustomerId, {});
      expect(result).toBeNull();
    });

    test("getBillingInfo returns null for unauthenticated", async () => {
      const result = await t.query(api.subscriptions.getBillingInfo, {});
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // AI REPORTS DOMAIN
  // ==========================================================================
  describe("ai/reports", () => {
    test("getLatestReport returns null for unauthenticated", async () => {
      const result = await t.query(api.ai.reports.getLatestReport, {});
      expect(result).toBeNull();
    });

    test("getReportHistory returns empty for unauthenticated", async () => {
      const result = await t.query(api.ai.reports.getReportHistory, {});
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // COACH DOMAIN
  // ==========================================================================
  describe("coach", () => {
    test("checkCoachTurnRateLimit rejects unauthenticated", async () => {
      await expect(
        t.mutation(api.coach.checkCoachTurnRateLimit, {})
      ).rejects.toThrow("Not authenticated");
    });
  });

  // ==========================================================================
  // PLATFORM STATS (intentionally public)
  // ==========================================================================
  describe("platformStats", () => {
    test("getPlatformStats works without authentication (public)", async () => {
      const result = await t.query(api.platformStats.getPlatformStats, {});
      // Returns null when no cache exists — but does NOT throw
      expect(result).toBeNull();
    });
  });
});
