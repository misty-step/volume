/**
 * AI Report Generation Tests
 *
 * Tests the public query and mutation functions:
 * - getLatestReport query
 * - getReportHistory query
 * - generateOnDemandReport mutation (with rate limiting)
 * - Ownership verification
 *
 * Note: The internal generateReport mutation is tested indirectly through
 * generateOnDemandReport. Full integration testing requires OpenAI API mocking
 * which is complex in convex-test environment.
 */

import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi, afterEach } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import type { TestConvex } from "convex-test";
import type { Id } from "../_generated/dataModel";
import * as aiReports from "./reports";
import * as aiData from "./data";
import * as aiGenerate from "./generate";
import * as generatedApi from "../_generated/api";
import * as rateLimit from "../lib/rateLimit";

// Mock the OpenAI generateAnalysis function
vi.mock("./openai", () => ({
  generateAnalysis: vi.fn().mockResolvedValue({
    content:
      "## Training Volume\nGood distribution.\n\n## Progress\nSolid gains.\n\n## Recommendations\n1. Continue\n2. Rest",
    tokenUsage: {
      input: 250,
      output: 150,
      costUSD: 0.0001,
    },
    model: "google/gemini-3-flash-preview",
  }),
  isConfigured: vi.fn().mockReturnValue(true),
  getPricing: vi.fn().mockReturnValue({
    inputPerMillion: 0.25,
    outputPerMillion: 2.0,
  }),
}));

describe("AI Report Queries and Mutations", () => {
  let t: TestConvex<typeof schema>;
  const user1 = "user_1_test";
  const user2 = "user_2_test";

  const originalApiKey = process.env.OPENROUTER_API_KEY;

  // Type workaround for skipped tests - api.ai namespace not in generated types
  const aiApi = api as any;

  beforeEach(async () => {
    // Fresh test environment for each test
    // Explicitly load modules to workaround convex-test globbing issues in subdirectories
    t = convexTest(schema, {
      "ai/reports": () => Promise.resolve(aiReports),
      "ai/data": () => Promise.resolve(aiData),
      "ai/generate": () => Promise.resolve(aiGenerate),
      "_generated/api": () => Promise.resolve(generatedApi),
      "lib/rateLimit": () => Promise.resolve(rateLimit),
    });

    // Set OPENROUTER_API_KEY for tests
    process.env.OPENROUTER_API_KEY = "test-key-12345";
  });

  afterEach(() => {
    // Restore original API key
    process.env.OPENROUTER_API_KEY = originalApiKey;
  });

  // Helper to create a test report directly in database
  async function createTestReport(
    userId: string,
    weekStartDate?: number,
    generatedAt?: number
  ): Promise<Id<"aiReports">> {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("aiReports", {
        userId,
        weekStartDate: weekStartDate ?? Date.now(),
        generatedAt: generatedAt ?? Date.now(),
        content: "Test report content with analysis",
        metricsSnapshot: {
          volume: [
            {
              exerciseName: "Bench Press",
              totalVolume: 4050,
              sets: 3,
              isBodyweight: false,
            },
          ],
          prs: [],
          streak: { currentStreak: 5, longestStreak: 10, totalWorkouts: 50 },
          frequency: { workoutDays: 5, restDays: 2, avgSetsPerDay: 12 },
        },
        model: "google/gemini-3-flash-preview",
        tokenUsage: { input: 250, output: 150, costUSD: 0.0001 },
      });
    });
  }

  describe("getLatestReport", () => {
    test("should return most recent report for authenticated user", async () => {
      // Create multiple reports for different weeks
      const week1 = new Date("2024-01-01T00:00:00Z").getTime();
      const week2 = new Date("2024-01-08T00:00:00Z").getTime();
      const generatedAt1 = new Date("2024-01-07T12:00:00Z").getTime();
      const generatedAt2 = new Date("2024-01-14T12:00:00Z").getTime();

      await createTestReport(user1, week1, generatedAt1);
      const latestReportId = await createTestReport(user1, week2, generatedAt2);

      // Query latest report
      const latestReport = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getLatestReport, {});

      expect(latestReport).toBeDefined();
      expect(latestReport?._id).toBe(latestReportId);
      expect(latestReport?.weekStartDate).toBe(week2);
      expect(latestReport?.content).toContain("analysis");
    });

    test("should return null when no reports exist", async () => {
      const latestReport = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getLatestReport, {});

      expect(latestReport).toBeNull();
    });

    test("should return null when not authenticated", async () => {
      // Create report for user 1
      await createTestReport(user1);

      // Query without authentication
      const latestReport = await t.query(aiApi.ai.reports.getLatestReport, {});

      expect(latestReport).toBeNull();
    });

    test("should only return reports for authenticated user", async () => {
      // Create report for user 1
      await createTestReport(user1);

      // Query as user 2
      const latestReport = await t
        .withIdentity({ subject: user2 })
        .query(aiApi.ai.reports.getLatestReport, {});

      // Should not see user 1's report
      expect(latestReport).toBeNull();
    });
  });

  describe("getReportHistory", () => {
    test("should return reports sorted by generatedAt descending", async () => {
      // Generate 3 reports with different generation times
      const week1 = new Date("2024-01-01T00:00:00Z").getTime();
      const week2 = new Date("2024-01-08T00:00:00Z").getTime();
      const week3 = new Date("2024-01-15T00:00:00Z").getTime();
      const gen1 = new Date("2024-01-07T12:00:00Z").getTime();
      const gen2 = new Date("2024-01-14T12:00:00Z").getTime();
      const gen3 = new Date("2024-01-21T12:00:00Z").getTime();

      await createTestReport(user1, week1, gen1);
      await createTestReport(user1, week2, gen2);
      await createTestReport(user1, week3, gen3);

      const history = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getReportHistory, {});

      expect(history.length).toBe(3);
      // Should be sorted by generatedAt, newest first
      expect(history[0].generatedAt).toBeGreaterThan(history[1].generatedAt);
      expect(history[1].generatedAt).toBeGreaterThan(history[2].generatedAt);
    });

    test("should respect limit parameter", async () => {
      // Generate 5 reports
      for (let i = 0; i < 5; i++) {
        const week = new Date(`2024-01-${1 + i * 7}T00:00:00Z`).getTime();
        await createTestReport(user1, week);
      }

      // Query with limit of 3
      const history = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getReportHistory, { limit: 3 });

      expect(history.length).toBe(3);
    });

    test("should default to 10 reports when limit not specified", async () => {
      // Generate 12 reports
      for (let i = 0; i < 12; i++) {
        const week = new Date(`2024-01-${1 + i * 7}T00:00:00Z`).getTime();
        const generated = new Date(`2024-01-${1 + i * 7}T12:00:00Z`).getTime();
        await createTestReport(user1, week, generated);
      }

      // Query without limit
      const history = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getReportHistory, {});

      expect(history.length).toBe(10);
    });

    test("should return empty array when not authenticated", async () => {
      await createTestReport(user1);

      const history = await t.query(aiApi.ai.reports.getReportHistory, {});

      expect(history).toEqual([]);
    });

    test("should only return reports for authenticated user", async () => {
      // Generate reports for both users
      await createTestReport(user1);
      await createTestReport(user2);

      // Query as user 1
      const history = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getReportHistory, {});

      expect(history.length).toBe(1);
      expect(history[0].userId).toBe(user1);
    });
  });

  describe("generateOnDemandReport - Rate Limiting", () => {
    // Helper to seed rate limit counter directly in the rateLimits table
    async function seedRateLimitCount(userId: string, count: number) {
      const now = Date.now();
      const windowMs = 86_400_000; // 24 hours (daily limit)
      const windowStartMs = Math.floor(now / windowMs) * windowMs;

      await t.run(async (ctx) => {
        await ctx.db.insert("rateLimits", {
          userId,
          scope: "aiReport:onDemand",
          windowStartMs,
          windowMs,
          count,
          expiresAt: windowStartMs + windowMs * 30,
        });
      });
    }

    test("should enforce daily limit of 5 reports", async () => {
      // Seed rate limit to 5 (at the limit)
      await seedRateLimitCount(user1, 5);

      // Try to generate report (should fail - already at limit)
      await expect(
        t
          .withIdentity({ subject: user1 })
          .action(aiApi.ai.reports.generateOnDemandReport, {})
      ).rejects.toThrow("Rate limit exceeded");
    });

    test("should throw error when not authenticated", async () => {
      await expect(
        t.action(aiApi.ai.reports.generateOnDemandReport, {})
      ).rejects.toThrow("You must be signed in");
    });

    test("rate limit should be per-user", async () => {
      // Seed rate limit for user 1 to 5 (at limit)
      await seedRateLimitCount(user1, 5);

      // User 1 should be at limit
      await expect(
        t
          .withIdentity({ subject: user1 })
          .action(aiApi.ai.reports.generateOnDemandReport, {})
      ).rejects.toThrow("Rate limit exceeded");

      // User 2 should have no rate limit and be under limit
      // Note: We cannot test actual generation without complex scheduler mocking
      // But we verified user 1 is blocked while user 2 has no records
      const user2History = await t
        .withIdentity({ subject: user2 })
        .query(aiApi.ai.reports.getReportHistory, {});

      expect(user2History.length).toBe(0);
    });
  });

  describe("Report Structure", () => {
    test("report should contain all required fields", async () => {
      const reportId = await createTestReport(user1);

      const latestReport = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getLatestReport, {});

      expect(latestReport).toBeDefined();
      expect(latestReport?._id).toBe(reportId);
      expect(latestReport?.userId).toBe(user1);
      expect(latestReport?.weekStartDate).toBeDefined();
      expect(latestReport?.generatedAt).toBeDefined();
      expect(latestReport?.content).toBeDefined();
      expect(latestReport?.metricsSnapshot).toBeDefined();
      expect(latestReport?.model).toBe("google/gemini-3-flash-preview");
      expect(latestReport?.tokenUsage).toBeDefined();
    });

    test("metricsSnapshot should include all metric categories", async () => {
      await createTestReport(user1);

      const latestReport = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getLatestReport, {});

      expect(latestReport?.metricsSnapshot.volume).toBeInstanceOf(Array);
      expect(latestReport?.metricsSnapshot.prs).toBeInstanceOf(Array);
      expect(latestReport?.metricsSnapshot.streak).toBeDefined();
      expect(latestReport?.metricsSnapshot.frequency).toBeDefined();
    });

    test("tokenUsage should track costs", async () => {
      await createTestReport(user1);

      const latestReport = await t
        .withIdentity({ subject: user1 })
        .query(aiApi.ai.reports.getLatestReport, {});

      expect(latestReport?.tokenUsage.input).toBeGreaterThan(0);
      expect(latestReport?.tokenUsage.output).toBeGreaterThan(0);
      expect(latestReport?.tokenUsage.costUSD).toBeGreaterThanOrEqual(0);
    });
  });
});
