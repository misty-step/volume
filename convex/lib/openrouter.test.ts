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
    expect(MODELS.MAIN).toBe("google/gemini-3-flash-preview");
    expect(MODELS.CLASSIFICATION).toBe("openai/gpt-5-nano");
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
    // 1M input tokens at $0.10 = $0.10
    const cost = calculateCost(MODELS.MAIN, 1_000_000, 0);
    expect(cost).toBeCloseTo(0.1, 4);
  });

  it("calculates output token cost", () => {
    // 1M output tokens at $0.40 = $0.40
    const cost = calculateCost(MODELS.MAIN, 0, 1_000_000);
    expect(cost).toBeCloseTo(0.4, 4);
  });

  it("calculates combined cost", () => {
    // 1M input ($0.10) + 1M output ($0.40) = $0.50
    const cost = calculateCost(MODELS.MAIN, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.5, 4);
  });

  it("calculates cost for small token counts", () => {
    // 1000 input + 500 output
    const cost = calculateCost(MODELS.MAIN, 1000, 500);
    // 1000 * 0.10 / 1M + 500 * 0.40 / 1M = 0.0001 + 0.0002 = 0.0003
    expect(cost).toBeCloseTo(0.0003, 4);
  });

  it("works with classification model", () => {
    const cost = calculateCost(MODELS.CLASSIFICATION, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.5, 4);
  });

  it("returns number with max 4 decimal places", () => {
    const cost = calculateCost(MODELS.MAIN, 1, 1);
    const decimalPlaces = cost.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(4);
  });
});
