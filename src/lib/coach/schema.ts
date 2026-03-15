import { z } from "zod";
import { modelMessageSchema, type ModelMessage } from "ai";

// Block types are defined as catalog components in catalog.ts (the single
// source of truth for the json-render generative UI vocabulary).
export { CoachBlockSchema, type CoachBlock } from "./catalog";

export const MAX_COACH_MESSAGES = 30;

export const CoachPreferencesSchema = z.object({
  unit: z.enum(["lbs", "kg"]),
  soundEnabled: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

const MAX_CONVERSATION_JSON_BYTES = 200_000;

export const CoachTurnRequestSchema = z
  .object({
    sessionId: z.string().min(1).max(256).optional(),
    messages: z.array(modelMessageSchema).min(1).max(MAX_COACH_MESSAGES),
    preferences: CoachPreferencesSchema,
  })
  .refine(
    (data) =>
      JSON.stringify(data.messages).length <= MAX_CONVERSATION_JSON_BYTES,
    {
      message: "Conversation too large.",
      path: ["messages"],
    }
  );

export type CoachMessageInput = ModelMessage;
export type CoachPreferences = z.infer<typeof CoachPreferencesSchema>;
export type CoachTurnRequest = z.infer<typeof CoachTurnRequestSchema>;

export const CoachTurnResponseSchema = z.object({
  assistantText: z.string().max(4000),
  responseMessages: z.array(z.record(z.string(), z.unknown())).optional(),
  trace: z.object({
    toolsUsed: z.array(z.string()),
    model: z.string(),
    fallbackUsed: z.boolean(),
  }),
});

export type CoachTurnResponse = z.infer<typeof CoachTurnResponseSchema>;

export const DEFAULT_COACH_SUGGESTIONS = [
  "10 pushups",
  "show today's summary",
  "what should I work on today?",
];
