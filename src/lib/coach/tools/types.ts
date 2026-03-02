import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "@/../convex/_generated/dataModel";
import type { CoachBlock } from "@/lib/coach/schema";
import type { Exercise } from "@/types/domain";

export type WeightUnit = "lbs" | "kg";

export type SetInput = {
  exerciseId: Id<"exercises">;
  performedAt: number;
  reps?: number;
  duration?: number;
  weight?: number;
  unit?: string;
};

export type FocusSuggestion = {
  type: "exercise" | "muscle_group" | "balance";
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  suggestedExercises?: string[];
};

export type ToolResult = {
  summary: string;
  blocks: CoachBlock[];
  outputForModel: Record<string, unknown>;
};

export type CoachToolExecutionOptions = {
  onBlocks?: (blocks: CoachBlock[]) => void;
};

export interface CoachToolContext {
  convex: ConvexHttpClient;
  defaultUnit: WeightUnit;
  timezoneOffsetMinutes: number;
  turnId: string;
  userInput?: string;
  /** Semantic exercise resolver — LLM-backed in production, mockable in tests */
  resolveExerciseName?: (
    name: string,
    candidates: Exercise[]
  ) => Promise<Exercise | null>;
}
