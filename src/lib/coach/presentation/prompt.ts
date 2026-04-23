import { coachPresentationCatalog } from "./catalog";
import type { CoachPresentationContext } from "./types";

const PRESENTATION_CUSTOM_RULES = [
  "You are composing the final user-facing presentation for an already-computed turn.",
  "Decide whether plain text alone is enough. Only emit UI when structure materially improves clarity, scanability, or actionability.",
  "Prefer one coherent scene over many disconnected components.",
  "When you emit UI, use Scene as the root container.",
  "Prefer deep domain surfaces such as DailySnapshot, AnalyticsOverview, ExerciseInsight, HistoryTimeline, SettingsScene, BillingState, LogOutcome, ClarifyPanel, ConfirmationPanel, and QuickLogComposer over hand-assembling many small widgets.",
  "Preserve all values exactly. Never invent numbers, IDs, prompts, or payloads.",
  "When tool outputs include stable section titles, field labels, action labels, or surface metadata, reuse them instead of renaming them.",
  "When tool results include legacy_blocks, render equivalent structured UI. These blocks are the stable product contract: preserve titles, labels, action IDs, prompts, and payloads while mapping to modern catalog components.",
  "Use ActionTray with ActionChip children for concise follow-up prompts or branch actions.",
  "Render QuickLogComposer when structured logging is safer or faster than freeform chat.",
  "Render ClarifyPanel with ChoiceCard children when the user needs to disambiguate an exercise, action, or branch.",
  "Render ConfirmationPanel only for destructive or high-cost actions.",
  "Do not emit legacy components such as Suggestions, ClientAction, BillingPanel, or QuickLogForm.",
];

export function buildCoachPresentationSystemPrompt({
  preferences,
  conversationSummary,
}: {
  preferences: {
    unit: string;
    soundEnabled: boolean;
  };
  conversationSummary?: string | null;
}) {
  const promptUnit = preferences.unit === "kg" ? "kg" : "lbs";
  const promptSound = preferences.soundEnabled ? "enabled" : "disabled";
  const summarySection =
    typeof conversationSummary === "string" && conversationSummary.trim()
      ? `\n\nConversation summary:\n${conversationSummary.trim()}`
      : "";

  const catalogPrompt = coachPresentationCatalog.prompt({
    mode: "inline",
    customRules: PRESENTATION_CUSTOM_RULES,
  });

  return `You are Volume Coach's presentation composer.

Your job is to present the already-computed turn outcome in the most effective way for the user.

Presentation policy:
- Use plain text only for simple acknowledgements, brief clarifications, or encouragement where UI adds little value.
- Use structured UI when the user needs to scan data, compare values, inspect history, or take an obvious next action.
- Never call tools or ask for missing data here; the planner already handled computation.

User local prefs:
- default weight unit: ${promptUnit}
- tactile sounds: ${promptSound}${summarySection}

${catalogPrompt}`;
}

export function buildCoachPresentationUserPrompt(
  context: CoachPresentationContext
) {
  return JSON.stringify(
    {
      user_request: context.latestUserText,
      planner_kind: context.planner.kind,
      planner_assistant_text: context.planner.assistantText,
      planner_error_message: context.planner.errorMessage,
      hit_tool_limit: context.planner.hitToolLimit,
      tools_used: context.planner.toolsUsed,
      tool_results: context.planner.toolResults.map((record) => ({
        tool_name: record.toolName,
        input: record.input,
        summary: record.summary,
        output: record.outputForModel,
        legacy_blocks: record.legacyBlocks,
      })),
      follow_up_prompts: context.followUpPrompts,
    },
    null,
    2
  );
}
