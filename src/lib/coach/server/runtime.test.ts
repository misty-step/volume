// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => "mock-model")),
}));

describe("getCoachRuntime", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns null when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { getCoachRuntime } = await import("./runtime");
    expect(getCoachRuntime()).toBeNull();
  });

  it("returns null when OPENROUTER_API_KEY is whitespace only", async () => {
    process.env.OPENROUTER_API_KEY = "   ";
    const { getCoachRuntime } = await import("./runtime");
    expect(getCoachRuntime()).toBeNull();
  });

  it("returns a CoachRuntime when OPENROUTER_API_KEY is set", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const { getCoachRuntime } = await import("./runtime");
    const result = getCoachRuntime();
    expect(result).not.toBeNull();
    expect(result!.modelId).toBe("google/gemini-3-flash-preview");
    expect(result!.model).toBeDefined();
    expect(result!.classificationModel).toBeDefined();
    expect(result!.fallbacks).toHaveLength(2);
    expect(result!.fallbacks[0]!.modelId).toBe("openai/gpt-5.4-mini");
    expect(result!.fallbacks[1]!.modelId).toBe("minimax/minimax-m2.7");
  });

  it("uses COACH_AGENT_MODEL env var when set", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.COACH_AGENT_MODEL = "openai/gpt-4o";
    const { getCoachRuntime } = await import("./runtime");
    const result = getCoachRuntime();
    expect(result!.modelId).toBe("openai/gpt-4o");
    expect(result!.fallbacks).toHaveLength(0);
  });

  it("ignores whitespace-only COACH_AGENT_MODEL overrides", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.COACH_AGENT_MODEL = "   ";
    const { getCoachRuntime } = await import("./runtime");
    const result = getCoachRuntime();
    expect(result!.modelId).toBe("google/gemini-3-flash-preview");
  });
});
