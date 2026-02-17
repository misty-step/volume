import { z } from "zod";

export const MAX_COACH_MESSAGES = 30;

export const CoachMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const CoachPreferencesSchema = z.object({
  unit: z.enum(["lbs", "kg"]),
  soundEnabled: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

const MAX_TOTAL_MESSAGE_CHARS = 50_000;

export const CoachTurnRequestSchema = z
  .object({
    messages: z.array(CoachMessageSchema).min(1).max(MAX_COACH_MESSAGES),
    preferences: CoachPreferencesSchema,
  })
  .refine(
    (data) =>
      data.messages.reduce(
        (total, message) => total + message.content.length,
        0
      ) <= MAX_TOTAL_MESSAGE_CHARS,
    {
      message: `Conversation too large (max ${MAX_TOTAL_MESSAGE_CHARS} characters).`,
      path: ["messages"],
    }
  );

export type CoachMessageInput = z.infer<typeof CoachMessageSchema>;
export type CoachPreferences = z.infer<typeof CoachPreferencesSchema>;
export type CoachTurnRequest = z.infer<typeof CoachTurnRequestSchema>;

const StatusBlockSchema = z.object({
  type: z.literal("status"),
  tone: z.enum(["success", "error", "info"]),
  title: z.string().max(200),
  description: z.string().max(2000),
});

const MetricsBlockSchema = z.object({
  type: z.literal("metrics"),
  title: z.string().max(200),
  metrics: z.array(
    z.object({
      label: z.string().max(100),
      value: z.string().max(100),
    })
  ),
});

const TrendPointSchema = z.object({
  date: z.string().max(32),
  label: z.string().max(32),
  value: z.number(),
});

const TrendBlockSchema = z.object({
  type: z.literal("trend"),
  title: z.string().max(200),
  subtitle: z.string().max(200),
  metric: z.enum(["reps", "duration"]),
  points: z.array(TrendPointSchema).max(90),
  total: z.number(),
  bestDay: z.number(),
});

const TableBlockSchema = z.object({
  type: z.literal("table"),
  title: z.string().max(200),
  rows: z
    .array(
      z.object({
        label: z.string().max(120),
        value: z.string().max(120),
        meta: z.string().max(200).optional(),
      })
    )
    .max(50),
});

const SuggestionsBlockSchema = z.object({
  type: z.literal("suggestions"),
  prompts: z.array(z.string().max(200)).max(8),
});

const ClientActionPayloadSchema = z.union([
  z.object({ unit: z.enum(["lbs", "kg"]) }).strict(),
  z.object({ enabled: z.boolean() }).strict(),
]);

const ClientActionBlockSchema = z
  .object({
    type: z.literal("client_action"),
    action: z.enum(["set_weight_unit", "set_sound"]),
    payload: ClientActionPayloadSchema,
  })
  .superRefine((value, ctx) => {
    if (value.action === "set_weight_unit" && !("unit" in value.payload)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "set_weight_unit payload must be { unit }.",
        path: ["payload"],
      });
    }
    if (value.action === "set_sound" && !("enabled" in value.payload)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "set_sound payload must be { enabled }.",
        path: ["payload"],
      });
    }
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
  assistantText: z.string().max(4000),
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
