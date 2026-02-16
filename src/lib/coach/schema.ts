import { z } from "zod";

export const CoachMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const CoachPreferencesSchema = z.object({
  unit: z.enum(["lbs", "kg"]),
  soundEnabled: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

export const CoachTurnRequestSchema = z.object({
  messages: z.array(CoachMessageSchema).min(1).max(30),
  preferences: CoachPreferencesSchema,
});

export type CoachMessageInput = z.infer<typeof CoachMessageSchema>;
export type CoachPreferences = z.infer<typeof CoachPreferencesSchema>;
export type CoachTurnRequest = z.infer<typeof CoachTurnRequestSchema>;

const StatusBlockSchema = z.object({
  type: z.literal("status"),
  tone: z.enum(["success", "error", "info"]),
  title: z.string(),
  description: z.string(),
});

const MetricsBlockSchema = z.object({
  type: z.literal("metrics"),
  title: z.string(),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
});

const TrendPointSchema = z.object({
  date: z.string(),
  label: z.string(),
  value: z.number(),
});

const TrendBlockSchema = z.object({
  type: z.literal("trend"),
  title: z.string(),
  subtitle: z.string(),
  metric: z.enum(["reps", "duration"]),
  points: z.array(TrendPointSchema),
  total: z.number(),
  bestDay: z.number(),
});

const TableBlockSchema = z.object({
  type: z.literal("table"),
  title: z.string(),
  rows: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      meta: z.string().optional(),
    })
  ),
});

const SuggestionsBlockSchema = z.object({
  type: z.literal("suggestions"),
  prompts: z.array(z.string()),
});

const ClientActionBlockSchema = z.object({
  type: z.literal("client_action"),
  action: z.enum(["set_weight_unit", "set_sound"]),
  payload: z.record(z.string(), z.unknown()),
});

export const CoachBlockSchema = z.discriminatedUnion("type", [
  StatusBlockSchema,
  MetricsBlockSchema,
  TrendBlockSchema,
  TableBlockSchema,
  SuggestionsBlockSchema,
  ClientActionBlockSchema,
]);

export type CoachBlock = z.infer<typeof CoachBlockSchema>;

export const CoachTurnResponseSchema = z.object({
  assistantText: z.string(),
  blocks: z.array(CoachBlockSchema),
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
  "show trend for squats",
];

const CoachStreamStartEventSchema = z.object({
  type: z.literal("start"),
  model: z.string(),
});

const CoachStreamToolStartEventSchema = z.object({
  type: z.literal("tool_start"),
  toolName: z.string(),
});

const CoachStreamToolResultEventSchema = z.object({
  type: z.literal("tool_result"),
  toolName: z.string(),
  blocks: z.array(CoachBlockSchema),
});

const CoachStreamFinalEventSchema = z.object({
  type: z.literal("final"),
  response: CoachTurnResponseSchema,
});

const CoachStreamErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const CoachStreamEventSchema = z.discriminatedUnion("type", [
  CoachStreamStartEventSchema,
  CoachStreamToolStartEventSchema,
  CoachStreamToolResultEventSchema,
  CoachStreamFinalEventSchema,
  CoachStreamErrorEventSchema,
]);

export type CoachStreamEvent = z.infer<typeof CoachStreamEventSchema>;
