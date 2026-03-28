// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
  };
});

const TEST_MODEL = "test-model" as any;

describe("memory-pipeline", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it("extracts an injury memory from a completed turn", async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        operations: [
          {
            kind: "remember",
            category: "injury",
            content: "Left shoulder has been bothering them.",
            source: "fact_extractor",
          },
        ],
      }),
    });

    const { extractMemoryOperations } = await import("./memory-pipeline");
    const result = await extractMemoryOperations({
      model: TEST_MODEL,
      transcript: [
        { role: "user", content: "My left shoulder has been bothering me." },
        {
          role: "assistant",
          content: "I'll keep that in mind for future exercise suggestions.",
        },
      ],
      existingMemories: [],
    });

    expect(result).toEqual([
      {
        kind: "remember",
        category: "injury",
        content: "Left shoulder has been bothering them.",
        source: "fact_extractor",
      },
    ]);

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(
              '{"role":"user","content":"My left shoulder has been bothering me."}'
            ),
          }),
        ]),
      })
    );
  });

  it("maps a forget request to an existing memory id", async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        operations: [
          {
            kind: "forget",
            memoryId: "memory_123",
          },
        ],
      }),
    });

    const { extractMemoryOperations } = await import("./memory-pipeline");
    const result = await extractMemoryOperations({
      model: TEST_MODEL,
      transcript: [
        { role: "user", content: "Forget that I have a shoulder injury." },
      ],
      existingMemories: [
        {
          _id: "memory_123",
          category: "injury",
          content: "Left shoulder impingement. Avoid heavy overhead pressing.",
          source: "fact_extractor",
          createdAt: 1,
        },
      ],
    });

    expect(result).toEqual([{ kind: "forget", memoryId: "memory_123" }]);
  });

  it("summarizes long conversations into a 2-3 sentence observation", async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        summary:
          "The user logged multiple upper-body sessions and mentioned a lingering shoulder issue. They are prioritizing consistency while avoiding movements that aggravate the shoulder.",
      }),
    });

    const { summarizeObservation, shouldGenerateObservation } =
      await import("./memory-pipeline");

    expect(
      shouldGenerateObservation({
        transcript: Array.from({ length: 20 }, (_, index) => ({
          role: index % 2 === 0 ? "user" : "assistant",
          content: `message-${index}`,
        })),
      })
    ).toBe(true);

    const result = await summarizeObservation({
      model: TEST_MODEL,
      transcript: Array.from({ length: 20 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `message-${index}`,
      })),
    });

    expect(result).toContain("shoulder");
  });

  it("selects observation ids to keep when the list exceeds the cap", async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        keepIds: Array.from(
          { length: 29 },
          (_, index) => `memory_${index + 2}`
        ),
      }),
    });

    const { selectObservationIdsToKeep } = await import("./memory-pipeline");

    const result = await selectObservationIdsToKeep({
      model: TEST_MODEL,
      observations: Array.from({ length: 50 }, (_, index) => ({
        _id: `memory_${index + 1}`,
        category: "other" as const,
        content: `Observation ${index + 1}`,
        source: "observer" as const,
        createdAt: index + 1,
      })),
    });

    expect(result).toHaveLength(29);
    expect(result?.[0]).toBe("memory_2");

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(
              '{"id":"memory_1","createdAt":1,"content":"Observation 1"}'
            ),
          }),
        ]),
      })
    );
  });

  it("rejects overlong extracted memory text", async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        operations: [
          {
            kind: "remember",
            category: "goal",
            content: "x".repeat(281),
            source: "fact_extractor",
          },
        ],
      }),
    });

    const { extractMemoryOperations } = await import("./memory-pipeline");

    await expect(
      extractMemoryOperations({
        model: TEST_MODEL,
        transcript: [{ role: "user", content: "Remember this goal." }],
        existingMemories: [],
      })
    ).rejects.toThrow();
  });

  it("rejects overlong observation summaries", async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        summary: "x".repeat(281),
      }),
    });

    const { summarizeObservation } = await import("./memory-pipeline");

    await expect(
      summarizeObservation({
        model: TEST_MODEL,
        transcript: Array.from({ length: 20 }, (_, index) => ({
          role: index % 2 === 0 ? "user" : "assistant",
          content: `message-${index}`,
        })),
      })
    ).rejects.toThrow();
  });
});
