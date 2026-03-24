import type { CoachBlock } from "@/lib/coach/schema";

export type ToolExecutionRecord = {
  toolName: string;
  input: unknown;
  summary: string;
  outputForModel: Record<string, unknown>;
  legacyBlocks: CoachBlock[];
};

export type CoachPresentationContext = {
  latestUserText: string;
  conversationSummary?: string | null;
  preferences: {
    unit: string;
    soundEnabled: boolean;
  };
  planner: {
    kind: "ok" | "error";
    assistantText: string;
    toolsUsed: string[];
    errorMessage?: string;
    hitToolLimit: boolean;
    toolResults: ToolExecutionRecord[];
  };
  followUpPrompts: string[];
};
