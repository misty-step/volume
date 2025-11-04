/**
 * OpenAI Integration Module Tests
 *
 * Tests the generateAnalysis function with mocked OpenAI responses.
 * Verifies prompt construction, token tracking, cost calculation, and error handling.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateAnalysis,
  isConfigured,
  getPricing,
  type AnalysisResult,
} from "./openai";
import type { AnalyticsMetrics } from "./prompts";

// Mock OpenAI SDK
vi.mock("openai", () => {
  return {
    default: vi.fn(),
  };
});

describe("OpenAI Integration", () => {
  // Sample metrics for testing
  const sampleMetrics: AnalyticsMetrics = {
    volume: [
      {
        exerciseName: "Bench Press",
        totalVolume: 4050,
        sets: 3,
        isBodyweight: false,
      },
      {
        exerciseName: "Squats",
        totalVolume: 5400,
        sets: 4,
        isBodyweight: false,
      },
    ],
    prs: [
      {
        exerciseName: "Bench Press",
        prType: "weight",
        improvement: 10,
        performedAt: Date.now(),
      },
    ],
    streak: {
      currentStreak: 7,
      longestStreak: 30,
      totalWorkouts: 156,
    },
    frequency: {
      workoutDays: 5,
      restDays: 2,
      avgSetsPerDay: 12,
    },
    weekStartDate: Date.now(),
  };

  // Store original env var
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Set test API key
    process.env.OPENAI_API_KEY = "test-api-key-12345";
  });

  afterEach(() => {
    // Restore original API key
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  describe("generateAnalysis - Success Cases", () => {
    test("should return analysis with correct structure", async () => {
      // Mock successful OpenAI response
      const mockCompletion = {
        choices: [
          {
            message: {
              content:
                "## Training Volume\nSolid volume distribution with 4050 lbs bench and 5400 lbs squats.\n\n## Progress\nGood 10 lb PR on bench press.\n\n## Recommendations\n1. Continue progressive overload\n2. Monitor recovery",
            },
          },
        ],
        usage: {
          prompt_tokens: 250,
          completion_tokens: 150,
        },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      const result: AnalysisResult = await generateAnalysis(sampleMetrics);

      // Verify structure
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("tokenUsage");
      expect(result).toHaveProperty("model");

      // Verify content
      expect(result.content).toContain("Training Volume");
      expect(result.content).toContain("Progress");
      expect(result.content).toContain("Recommendations");

      // Verify model
      expect(result.model).toBe("gpt-5-mini");
    });

    test("should calculate token usage correctly", async () => {
      const mockCompletion = {
        choices: [{ message: { content: "Analysis content" } }],
        usage: {
          prompt_tokens: 300,
          completion_tokens: 200,
        },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      const result = await generateAnalysis(sampleMetrics);

      expect(result.tokenUsage.input).toBe(300);
      expect(result.tokenUsage.output).toBe(200);
    });

    test("should calculate cost correctly", async () => {
      const mockCompletion = {
        choices: [{ message: { content: "Analysis content" } }],
        usage: {
          prompt_tokens: 1_000_000, // 1M tokens
          completion_tokens: 1_000_000, // 1M tokens
        },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      const result = await generateAnalysis(sampleMetrics);

      // Cost = (1M * $0.25/1M) + (1M * $2.00/1M) = $2.25
      expect(result.tokenUsage.costUSD).toBe(2.25);
    });

    test("should trim whitespace from content", async () => {
      const mockCompletion = {
        choices: [{ message: { content: "  \n  Analysis with spaces  \n  " } }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      const result = await generateAnalysis(sampleMetrics);

      expect(result.content).toBe("Analysis with spaces");
    });
  });

  describe("generateAnalysis - Error Handling", () => {
    test("should throw error if OPENAI_API_KEY not set", async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(generateAnalysis(sampleMetrics)).rejects.toThrow(
        "OPENAI_API_KEY environment variable not set"
      );
    });

    test("should throw error if OpenAI returns empty content", async () => {
      const mockCompletion = {
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 100, completion_tokens: 0 },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      await expect(generateAnalysis(sampleMetrics)).rejects.toThrow(
        "OpenAI returned empty response"
      );
    });

    test("should throw error if OpenAI does not return token usage", async () => {
      const mockCompletion = {
        choices: [{ message: { content: "Analysis" } }],
        usage: undefined,
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      await expect(generateAnalysis(sampleMetrics)).rejects.toThrow(
        "OpenAI did not return token usage information"
      );
    });

    test("should not retry on API key errors", async () => {
      const OpenAI = (await import("openai")).default as any;
      const createMock = vi
        .fn()
        .mockRejectedValue(new Error("Invalid API key"));

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      }));

      await expect(generateAnalysis(sampleMetrics)).rejects.toThrow(
        "Invalid API key"
      );

      // Should only attempt once (no retries for API key errors)
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    test("should not retry on invalid_request errors", async () => {
      const OpenAI = (await import("openai")).default as any;
      const createMock = vi
        .fn()
        .mockRejectedValue(new Error("invalid_request: malformed prompt"));

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      }));

      await expect(generateAnalysis(sampleMetrics)).rejects.toThrow(
        "invalid_request"
      );

      // Should only attempt once
      expect(createMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("generateAnalysis - Retry Logic", () => {
    test("should retry on transient errors", async () => {
      const OpenAI = (await import("openai")).default as any;
      const createMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("Rate limit exceeded"))
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Success on third try" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      }));

      const result = await generateAnalysis(sampleMetrics);

      // Should succeed after 3 attempts
      expect(createMock).toHaveBeenCalledTimes(3);
      expect(result.content).toBe("Success on third try");
    });

    test("should throw error after max retries exhausted", async () => {
      const OpenAI = (await import("openai")).default as any;
      const createMock = vi
        .fn()
        .mockRejectedValue(new Error("Rate limit exceeded"));

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      }));

      await expect(generateAnalysis(sampleMetrics)).rejects.toThrow(
        "Failed to generate analysis after 3 attempts"
      );

      // Should attempt 3 times (max retries)
      expect(createMock).toHaveBeenCalledTimes(3);
    });

    test("should succeed on first retry", async () => {
      const OpenAI = (await import("openai")).default as any;
      const createMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Success on second try" } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      }));

      const result = await generateAnalysis(sampleMetrics);

      expect(createMock).toHaveBeenCalledTimes(2);
      expect(result.content).toBe("Success on second try");
    });
  });

  describe("Prompt Construction", () => {
    test("should send system and user prompts to OpenAI", async () => {
      const OpenAI = (await import("openai")).default as any;
      const createMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Analysis" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      }));

      await generateAnalysis(sampleMetrics);

      // Verify createMock was called with correct structure
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5-mini",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user" }),
          ]),
          max_completion_tokens: 3000,
          reasoning_effort: "high",
        })
      );

      // Verify messages array has exactly 2 messages
      const callArgs = createMock.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe("system");
      expect(callArgs.messages[1].role).toBe("user");

      // Verify user prompt contains metrics
      const userPrompt = callArgs.messages[1].content;
      expect(userPrompt).toContain("Bench Press");
      expect(userPrompt).toContain("4,050"); // Formatted with comma
      expect(userPrompt).toContain("Squats");
      expect(userPrompt).toContain("5,400"); // Formatted with comma
    });

    test("should include all metric sections in prompt", async () => {
      const OpenAI = (await import("openai")).default as any;
      const createMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Analysis" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      }));

      await generateAnalysis(sampleMetrics);

      const callArgs = createMock.mock.calls[0][0];
      const userPrompt = callArgs.messages[1].content;

      // Verify all sections included
      expect(userPrompt).toContain("volume"); // Volume section
      expect(userPrompt).toContain("PR"); // PRs section
      expect(userPrompt).toContain("streak"); // Streak section
      expect(userPrompt).toContain("workout"); // Frequency section
    });
  });

  describe("Configuration Helpers", () => {
    test("isConfigured should return true when API key is set", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(isConfigured()).toBe(true);
    });

    test("isConfigured should return false when API key is not set", () => {
      delete process.env.OPENAI_API_KEY;
      expect(isConfigured()).toBe(false);
    });

    test("getPricing should return current pricing structure", () => {
      const pricing = getPricing();

      expect(pricing).toHaveProperty("inputPerMillion");
      expect(pricing).toHaveProperty("outputPerMillion");
      expect(pricing.inputPerMillion).toBe(0.25);
      expect(pricing.outputPerMillion).toBe(2.0);
    });
  });

  describe("Cost Calculation Edge Cases", () => {
    test("should handle very small token counts", async () => {
      const mockCompletion = {
        choices: [{ message: { content: "Short" } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
        },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      const result = await generateAnalysis(sampleMetrics);

      // Cost should be very small but non-zero
      // 10 input tokens: (10 * 0.15) / 1M = 0.0000015
      // 10 output tokens: (10 * 0.6) / 1M = 0.000006
      // Total: 0.0000075, rounds to 0.0000
      expect(result.tokenUsage.costUSD).toBeGreaterThanOrEqual(0);
      expect(result.tokenUsage.costUSD).toBeLessThan(0.0001);
    });

    test("should handle zero tokens gracefully", async () => {
      const mockCompletion = {
        choices: [{ message: { content: "Test" } }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
        },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      const result = await generateAnalysis(sampleMetrics);

      expect(result.tokenUsage.costUSD).toBe(0);
    });

    test("should round cost to 4 decimal places", async () => {
      const mockCompletion = {
        choices: [{ message: { content: "Test" } }],
        usage: {
          prompt_tokens: 333, // Will produce non-round number
          completion_tokens: 777,
        },
      };

      const OpenAI = (await import("openai")).default as any;
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockCompletion),
          },
        },
      }));

      const result = await generateAnalysis(sampleMetrics);

      // Cost should be rounded to 4 decimal places
      const costString = result.tokenUsage.costUSD.toString();
      const decimalPlaces = costString.split(".")[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });
  });
});
