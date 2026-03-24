export const MEMORY_CATEGORIES = [
  "injury",
  "goal",
  "preference",
  "training_history",
  "body_composition",
  "other",
] as const;

export const MEMORY_SOURCES = [
  "fact_extractor",
  "explicit_user",
  "observer",
] as const;

export const MAX_ACTIVE_FACT_MEMORIES = 50;
export const MAX_ACTIVE_OBSERVATIONS = 30;
export const RECENT_OBSERVATION_LIMIT = 3;
export const OBSERVATION_TRIGGER_MESSAGES = 20;
export const MAX_MEMORY_CONTENT_LENGTH = 280;
export const MAX_MEMORY_ID_LENGTH = 128;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export type MemorySource = (typeof MEMORY_SOURCES)[number];

export type ActiveCoachMemory = {
  _id: string;
  category: MemoryCategory;
  content: string;
  source: MemorySource;
  createdAt: number;
};

export type PromptCoachMemory = Omit<ActiveCoachMemory, "_id">;

export type MemoryOperation =
  | {
      kind: "remember";
      category: MemoryCategory;
      content: string;
      source: Extract<MemorySource, "fact_extractor" | "explicit_user">;
      existingMemoryId?: string;
    }
  | {
      kind: "forget";
      memoryId: string;
    };

export function normalizeMemoryContent(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

export function isObservationMemory(memory: { source: MemorySource }) {
  return memory.source === "observer";
}
