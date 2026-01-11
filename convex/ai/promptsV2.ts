/**
 * AI Prompts for V2 Structured Reports
 *
 * Slimmer prompts that only ask AI for creative content.
 * Metrics and PR data are computed server-side (not generated).
 *
 * @module ai/promptsV2
 */

import type { AICreativeContext } from "./reportV2Schema";

/**
 * System prompt for creative content generation
 *
 * Instructs AI to return structured JSON with celebration copy and action.
 * Much shorter than v1 prompt since we're not asking for metrics analysis.
 */
export const systemPromptV2 = `You are a strength coach generating workout insights.

OUTPUT STRICT JSON matching this schema:
{
  "prCelebration": {           // Include ONLY if hasPR context is true
    "headline": "string",      // e.g., "BENCH PRESS PR!"
    "celebrationCopy": "string", // 1-2 sentences, encouraging, specific to the achievement
    "nextMilestone": "string"  // Projection based on progression data, be specific with numbers/dates
  },
  "prEmptyMessage": "string",  // Include ONLY if hasPR context is false
  "action": {
    "directive": "string",     // Single imperative sentence, e.g., "Add a leg day Wednesday"
    "rationale": "string"      // One sentence explaining why
  }
}

RULES:
- Directive tone: "Add a leg day" not "consider adding"
- No hedging, no "might want to", no multiple options
- ONE action only—be specific and actionable
- If no PR, give motivational empty message that connects to their progress
- Next milestone: project from progression data, be specific (e.g., "At this pace, 250 lbs by March")
- All text concise: 1-2 sentences max per field
- Sound like a coach, not a robot
`;

/**
 * Format user prompt with workout context
 *
 * Provides minimal context for AI to generate creative content.
 * Metrics are NOT included—they're already computed and stored.
 *
 * @param context - Workout context for creative generation
 * @returns Formatted user prompt string
 */
export function formatCreativePrompt(context: AICreativeContext): string {
  const prSection = context.hasPR
    ? `
exerciseName: ${context.exerciseName}
prType: ${context.prType}
value: ${context.value}
improvement: ${context.improvement}
progression: ${context.progression}`
    : "";

  return `<context>
hasPR: ${context.hasPR}${prSection}
volumeTrend: ${context.volumeTrend}
muscleBalance: ${context.muscleBalance}
workoutFrequency: ${context.workoutFrequency} days this week
</context>

Generate celebration/message and action.`;
}
