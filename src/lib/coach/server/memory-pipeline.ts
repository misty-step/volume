import { generateText, type LanguageModel } from "ai";
import { z } from "zod";
import {
  MAX_ACTIVE_OBSERVATIONS,
  MAX_MEMORY_CONTENT_LENGTH,
  MAX_MEMORY_ID_LENGTH,
  OBSERVATION_TRIGGER_MESSAGES,
  normalizeMemoryContent,
  type ActiveCoachMemory,
  type MemoryOperation,
} from "@/lib/coach/memory";

const memoryOperationsSchema = z.object({
  operations: z.array(
    z.union([
      z.object({
        kind: z.literal("remember"),
        category: z.enum([
          "injury",
          "goal",
          "preference",
          "training_history",
          "body_composition",
          "other",
        ]),
        content: z.string().min(1).max(MAX_MEMORY_CONTENT_LENGTH),
        source: z.enum(["fact_extractor", "explicit_user"]),
        existingMemoryId: z
          .string()
          .min(1)
          .max(MAX_MEMORY_ID_LENGTH)
          .optional(),
      }),
      z.object({
        kind: z.literal("forget"),
        memoryId: z.string().min(1).max(MAX_MEMORY_ID_LENGTH),
      }),
    ])
  ),
});

const observationSummarySchema = z.object({
  summary: z.string().min(1).max(MAX_MEMORY_CONTENT_LENGTH),
});

const keepObservationIdsSchema = z.object({
  keepIds: z.array(z.string().min(1).max(MAX_MEMORY_ID_LENGTH)),
});

export type MemoryTranscriptMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
};

function serializePromptRecord(value: unknown) {
  return JSON.stringify(value);
}

function stringifyTranscript(transcript: MemoryTranscriptMessage[]) {
  return transcript.map((message) => serializePromptRecord(message)).join("\n");
}

function stringifyExistingMemories(memories: ActiveCoachMemory[]) {
  if (memories.length === 0) {
    return "None";
  }

  return memories
    .map((memory) =>
      serializePromptRecord({
        id: memory._id,
        category: memory.category,
        source: memory.source,
        content: memory.content,
      })
    )
    .join("\n");
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(fenced);
}

export async function extractMemoryOperations({
  model,
  transcript,
  existingMemories,
}: {
  model: LanguageModel;
  transcript: MemoryTranscriptMessage[];
  existingMemories: ActiveCoachMemory[];
}): Promise<MemoryOperation[]> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "system",
        content:
          "You extract durable user memories for a workout coach. Return JSON only. " +
          "Remember stable facts like injuries, goals, preferences, body composition, and training history. " +
          "When the user explicitly revokes or corrects a stored memory, return a forget operation referencing the existing memory id. " +
          "Do not store ephemeral workout logs or one-off chat filler.",
      },
      {
        role: "user",
        content: `Existing memories:\n${stringifyExistingMemories(
          existingMemories
        )}\n\nTranscript:\n${stringifyTranscript(transcript)}\n\nReturn JSON like {"operations":[...]}.`,
      },
    ],
  });

  const parsed = memoryOperationsSchema.parse(extractJson(text));

  return parsed.operations
    .map((operation) =>
      operation.kind === "remember"
        ? {
            ...operation,
            content: normalizeMemoryContent(operation.content),
          }
        : operation
    )
    .filter((operation) =>
      operation.kind === "remember" ? operation.content.length > 0 : true
    ) as MemoryOperation[];
}

export function shouldGenerateObservation({
  transcript,
}: {
  transcript: MemoryTranscriptMessage[];
}) {
  return transcript.length >= OBSERVATION_TRIGGER_MESSAGES;
}

export async function summarizeObservation({
  model,
  transcript,
}: {
  model: LanguageModel;
  transcript: MemoryTranscriptMessage[];
}) {
  if (!shouldGenerateObservation({ transcript })) {
    return null;
  }

  const { text } = await generateText({
    model,
    messages: [
      {
        role: "system",
        content:
          "You compress longer workout-coach conversations into a durable 2-3 sentence observation. " +
          "Return JSON only with a single summary field. Preserve long-term context such as injuries, goals, preferences, and ongoing behavior patterns.",
      },
      {
        role: "user",
        content: `Transcript:\n${stringifyTranscript(
          transcript
        )}\n\nReturn JSON like {"summary":"..."}.`,
      },
    ],
  });

  const parsed = observationSummarySchema.parse(extractJson(text));
  return normalizeMemoryContent(parsed.summary);
}

export async function selectObservationIdsToKeep({
  model,
  observations,
}: {
  model: LanguageModel;
  observations: ActiveCoachMemory[];
}) {
  if (observations.length <= MAX_ACTIVE_OBSERVATIONS) {
    return null;
  }

  const keepCount = MAX_ACTIVE_OBSERVATIONS - 1;
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are reflecting over coach observations. Return JSON only. " +
          `Select the ${keepCount} observation ids that best preserve durable context while dropping stale or redundant notes.`,
      },
      {
        role: "user",
        content: observations
          .map((observation) =>
            serializePromptRecord({
              id: observation._id,
              createdAt: observation.createdAt,
              content: observation.content,
            })
          )
          .join("\n"),
      },
    ],
  });

  const parsed = keepObservationIdsSchema.parse(extractJson(text));
  const validIds = new Set(observations.map((observation) => observation._id));

  return parsed.keepIds.filter((id, index, array) => {
    return validIds.has(id) && array.indexOf(id) === index && index < keepCount;
  });
}
