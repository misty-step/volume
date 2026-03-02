import { z } from "zod";
import { modelMessageSchema, type ModelMessage } from "ai";

export const MAX_COACH_MESSAGES = 30;

export const CoachPreferencesSchema = z.object({
  unit: z.enum(["lbs", "kg"]),
  soundEnabled: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

const MAX_CONVERSATION_JSON_BYTES = 200_000;

export const CoachTurnRequestSchema = z
  .object({
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

const StatusBlockSchema = z.object({
  type: z.literal("status"),
  tone: z.enum(["success", "error", "info"]),
  title: z.string().max(200),
  description: z.string().max(2000).optional(),
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

const EntityListBlockSchema = z.object({
  type: z.literal("entity_list"),
  title: z.string().max(200),
  description: z.string().max(400).optional(),
  emptyLabel: z.string().max(160).optional(),
  items: z
    .array(
      z.object({
        id: z.string().max(128).optional(),
        title: z.string().max(200),
        subtitle: z.string().max(240).optional(),
        meta: z.string().max(200).optional(),
        tags: z.array(z.string().max(60)).max(6).optional(),
        prompt: z.string().max(200).optional(),
      })
    )
    .max(100),
});

const DetailPanelBlockSchema = z.object({
  type: z.literal("detail_panel"),
  title: z.string().max(200),
  description: z.string().max(400).optional(),
  fields: z
    .array(
      z.object({
        label: z.string().max(120),
        value: z.string().max(240),
        emphasis: z.boolean().optional(),
      })
    )
    .max(30),
  prompts: z.array(z.string().max(200)).max(6).optional(),
});

const BillingPanelBlockSchema = z.object({
  type: z.literal("billing_panel"),
  status: z.enum(["trial", "active", "past_due", "canceled", "expired"]),
  title: z.string().max(200),
  subtitle: z.string().max(240).optional(),
  trialDaysRemaining: z.number().int().min(0).max(365).optional(),
  periodEnd: z.string().max(40).optional(),
  ctaLabel: z.string().max(60).optional(),
  ctaAction: z.enum(["open_checkout", "open_billing_portal"]).optional(),
});

const QuickLogFormBlockSchema = z.object({
  type: z.literal("quick_log_form"),
  title: z.string().max(200),
  exerciseName: z.string().max(80).optional(),
  defaultUnit: z.enum(["lbs", "kg"]).optional(),
});

const ConfirmationBlockSchema = z.object({
  type: z.literal("confirmation"),
  title: z.string().max(200),
  description: z.string().max(400),
  confirmPrompt: z.string().max(200),
  cancelPrompt: z.string().max(200).optional(),
  confirmLabel: z.string().max(40).optional(),
  cancelLabel: z.string().max(40).optional(),
});

const ClientActionPayloadSchema = z.union([
  z.object({ unit: z.enum(["lbs", "kg"]) }).strict(),
  z.object({ enabled: z.boolean() }).strict(),
  z.object({ mode: z.enum(["checkout", "portal"]) }).strict(),
]);

const ClientActionBlockSchema = z
  .object({
    type: z.literal("client_action"),
    action: z.enum([
      "set_weight_unit",
      "set_sound",
      "open_checkout",
      "open_billing_portal",
    ]),
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
    if (
      value.action === "open_checkout" &&
      (!("mode" in value.payload) || value.payload.mode !== "checkout")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "open_checkout payload must be { mode: 'checkout' }.",
        path: ["payload"],
      });
    }
    if (
      value.action === "open_billing_portal" &&
      (!("mode" in value.payload) || value.payload.mode !== "portal")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "open_billing_portal payload must be { mode: 'portal' }.",
        path: ["payload"],
      });
    }
  });

const UndoBlockSchema = z.object({
  type: z.literal("undo"),
  actionId: z.string().min(1).max(128),
  turnId: z.string().min(1).max(128),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

export const CoachBlockSchema = z.discriminatedUnion("type", [
  StatusBlockSchema,
  MetricsBlockSchema,
  TrendBlockSchema,
  TableBlockSchema,
  SuggestionsBlockSchema,
  EntityListBlockSchema,
  DetailPanelBlockSchema,
  BillingPanelBlockSchema,
  QuickLogFormBlockSchema,
  ConfirmationBlockSchema,
  ClientActionBlockSchema,
  UndoBlockSchema,
]);

export type CoachBlock = z.infer<typeof CoachBlockSchema>;

export const CoachTurnResponseSchema = z.object({
  assistantText: z.string().max(4000),
  blocks: z.array(CoachBlockSchema),
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
