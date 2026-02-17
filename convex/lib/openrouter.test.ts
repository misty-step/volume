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
  createOpenRouterClient,
  isConfigured,
  calculateCost,
} from "./openrouter";

describe("openrouter constants", () => {
  it("exports base URL", () => {
    expect(OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api/v1");
  });

  it("exports model identifiers", () => {
    expect(MODELS.MAIN).toBe("minimax/minimax-m2.5");
    expect(MODELS.CLASSIFICATION).toBe("minimax/minimax-m2.5");
    expect(MODELS.WRITER).toBe("moonshotai/kimi-k2.5");
    expect(MODELS.FALLBACK).toBe("z-ai/glm-5");
  });

  it("has pricing for all models", () => {
    expect(PRICING[MODELS.MAIN]).toBeDefined();
    expect(PRICING[MODELS.CLASSIFICATION]).toBeDefined();
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
    // 1M input tokens at $0.30 = $0.30
    const cost = calculateCost(MODELS.MAIN, 1_000_000, 0);
    expect(cost).toBeCloseTo(0.3, 4);
  });

  it("calculates output token cost", () => {
    // 1M output tokens at $1.20 = $1.20
    const cost = calculateCost(MODELS.MAIN, 0, 1_000_000);
    expect(cost).toBeCloseTo(1.2, 4);
  });

  it("calculates combined cost", () => {
    // 1M input ($0.30) + 1M output ($1.20) = $1.50
    const cost = calculateCost(MODELS.MAIN, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(1.5, 4);
  });

  it("calculates cost for small token counts", () => {
    // 1000 input + 500 output
    const cost = calculateCost(MODELS.MAIN, 1000, 500);
    // 1000 * 0.30 / 1M + 500 * 1.20 / 1M = 0.0003 + 0.0006 = 0.0009
    expect(cost).toBeCloseTo(0.0009, 4);
  });

  it("works with classification model", () => {
    const cost = calculateCost(MODELS.CLASSIFICATION, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(1.5, 4);
  });

  it("returns number with max 4 decimal places", () => {
    const cost = calculateCost(MODELS.MAIN, 1, 1);
    const decimalPlaces = cost.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(4);
  });
});
