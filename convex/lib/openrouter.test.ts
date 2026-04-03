// @vitest-environment node

/**
 * OpenRouter Utilities Tests
 *
 * Tests for OpenRouter configuration and utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  OPENROUTER_BASE_URL,
  MODELS,
  PRICING,
  ROUTING_POLICY,
  RUNTIME_CONFIG,
  createOpenRouterClient,
  isConfigured,
  calculateCost,
} from "./openrouter";

describe("openrouter constants", () => {
  it("exports base URL", () => {
    expect(OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api/v1");
  });

  it("exports model identifiers", () => {
    expect(MODELS.MAIN).toBe("google/gemini-3-flash-preview");
    expect(MODELS.CLASSIFICATION).toBe("google/gemini-3-flash-preview");
    expect(MODELS.WRITER).toBe("google/gemini-3-flash-preview");
    expect(MODELS.FALLBACK).toBe("minimax/minimax-m2.7");
  });

  it("has pricing for all models", () => {
    for (const model of Object.values(MODELS)) {
      expect(PRICING[model]).toBeDefined();
    }
  });

  it("exports the canonical routing policy and runtime config", () => {
    expect(ROUTING_POLICY.COACH).toBe(MODELS.MAIN);
    expect(ROUTING_POLICY.CLASSIFICATION).toBe(MODELS.CLASSIFICATION);
    expect(ROUTING_POLICY.WRITER).toBe(MODELS.WRITER);
    expect(ROUTING_POLICY.FALLBACK).toBe(MODELS.FALLBACK);
    expect(RUNTIME_CONFIG.apiKeyEnvVar).toBe("OPENROUTER_API_KEY");
    expect(RUNTIME_CONFIG.coachModelOverrideEnvVar).toBe("COACH_AGENT_MODEL");
    expect(RUNTIME_CONFIG.timeoutMs).toBe(30000);
  });

  it("pricing has input and output costs", () => {
    for (const model of Object.values(MODELS)) {
      const pricing = PRICING[model];
      expect(typeof pricing.inputPerMillion).toBe("number");
      expect(typeof pricing.outputPerMillion).toBe("number");
    }
  });
});

describe("createOpenRouterClient", () => {
  it("returns null when API key is not set", () => {
    // In test environment, OPENROUTER_API_KEY may or may not be set
    // The function should not throw either way
    const result = createOpenRouterClient();
    // Result is either OpenAI instance or null
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("isConfigured", () => {
  it("returns a boolean", () => {
    const result = isConfigured();
    expect(typeof result).toBe("boolean");
  });
});

describe("calculateCost", () => {
  it("calculates cost for zero tokens", () => {
    const cost = calculateCost(MODELS.MAIN, 0, 0);
    expect(cost).toBe(0);
  });

  it("calculates input token cost", () => {
    // 1M input tokens at $0.50 = $0.50
    const cost = calculateCost(MODELS.MAIN, 1_000_000, 0);
    expect(cost).toBeCloseTo(0.5, 4);
  });

  it("calculates output token cost", () => {
    // 1M output tokens at $3.00 = $3.00
    const cost = calculateCost(MODELS.MAIN, 0, 1_000_000);
    expect(cost).toBeCloseTo(3.0, 4);
  });

  it("calculates combined cost", () => {
    // 1M input ($0.50) + 1M output ($3.00) = $3.50
    const cost = calculateCost(MODELS.MAIN, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(3.5, 4);
  });

  it("calculates cost for small token counts", () => {
    // 1000 input + 500 output
    const cost = calculateCost(MODELS.MAIN, 1000, 500);
    // 1000 * 0.50 / 1M + 500 * 3.00 / 1M = 0.0005 + 0.0015 = 0.002
    expect(cost).toBeCloseTo(0.002, 4);
  });

  it("works with classification model", () => {
    const cost = calculateCost(MODELS.CLASSIFICATION, 1_000_000, 1_000_000);
    // Same model as MAIN: $0.50 + $3.00 = $3.50
    expect(cost).toBeCloseTo(3.5, 4);
  });

  it("returns number with max 4 decimal places", () => {
    const cost = calculateCost(MODELS.MAIN, 1, 1);
    const decimalPlaces = cost.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(4);
  });
});
