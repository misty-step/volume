// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runManageMemoriesTool } from "./tool-manage-memories";

vi.mock("@/../convex/_generated/api", () => ({
  api: {
    userMemories: {
      rememberExplicitMemory: "userMemories.rememberExplicitMemory",
      forgetMemoryByContent: "userMemories.forgetMemoryByContent",
    },
  },
}));

const mutation = vi.fn();

const TEST_CTX = {
  convex: { mutation },
  defaultUnit: "lbs" as const,
  timezoneOffsetMinutes: 0,
  turnId: "turn-test",
};

describe("runManageMemoriesTool", () => {
  beforeEach(() => {
    mutation.mockReset();
  });

  it("stores explicit memories", async () => {
    mutation.mockResolvedValue({ created: true, memoryId: "memory_123" });

    const result = await runManageMemoriesTool(
      {
        action: "remember",
        category: "injury",
        content: "My left shoulder has been bothering me.",
      },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith(
      "userMemories.rememberExplicitMemory",
      {
        category: "injury",
        content: "My left shoulder has been bothering me.",
      }
    );
    expect(result.outputForModel).toMatchObject({
      status: "ok",
      action: "remember",
      created: true,
    });
  });

  it("returns an info block when no stored memory matches a forget request", async () => {
    mutation.mockResolvedValue({ deletedCount: 0 });

    const result = await runManageMemoriesTool(
      {
        action: "forget",
        content: "that shoulder injury",
      },
      TEST_CTX as any
    );

    expect(mutation).toHaveBeenCalledWith(
      "userMemories.forgetMemoryByContent",
      {
        content: "that shoulder injury",
      }
    );
    expect(result.blocks[0]).toMatchObject({
      type: "status",
      tone: "info",
      title: "Nothing matched",
    });
  });
});
