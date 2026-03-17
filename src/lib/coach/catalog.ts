import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared prop schemas — single source of truth for both the json-render
// catalog (generative UI vocabulary) AND the CoachBlock discriminated union
// (tool return validation).
// ---------------------------------------------------------------------------

const statusProps = z.object({
  tone: z.enum(["success", "error", "info"]),
  title: z.string().max(200),
  description: z.string().max(2000).optional(),
});

const metricsProps = z.object({
  title: z.string().max(200),
  metrics: z.array(
    z.object({
      label: z.string().max(100),
      value: z.string().max(100),
    })
  ),
});

const trendPointSchema = z.object({
  date: z.string().max(32),
  label: z.string().max(32),
  value: z.number(),
});

const trendProps = z.object({
  title: z.string().max(200),
  subtitle: z.string().max(200),
  metric: z.enum(["reps", "duration"]),
  points: z.array(trendPointSchema).max(90),
  total: z.number(),
  bestDay: z.number(),
});

const tableProps = z.object({
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

const suggestionsProps = z.object({
  prompts: z.array(z.string().max(200)).max(8),
});

const entityListProps = z.object({
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

const detailPanelProps = z.object({
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

const billingPanelProps = z.object({
  status: z.enum(["trial", "active", "past_due", "canceled", "expired"]),
  title: z.string().max(200),
  subtitle: z.string().max(240).optional(),
  trialDaysRemaining: z.number().int().min(0).max(365).optional(),
  periodEnd: z.string().max(40).optional(),
  ctaLabel: z.string().max(60).optional(),
  ctaAction: z.enum(["open_checkout", "open_billing_portal"]).optional(),
});

const quickLogFormProps = z.object({
  title: z.string().max(200),
  exerciseName: z.string().max(80).optional(),
  defaultUnit: z.enum(["lbs", "kg"]).optional(),
});

const confirmationProps = z.object({
  title: z.string().max(200),
  description: z.string().max(400),
  confirmPrompt: z.string().max(200),
  cancelPrompt: z.string().max(200).optional(),
  confirmLabel: z.string().max(40).optional(),
  cancelLabel: z.string().max(40).optional(),
});

const clientActionPayloadSchema = z.union([
  z.object({ unit: z.enum(["lbs", "kg"]) }).strict(),
  z.object({ enabled: z.boolean() }).strict(),
  z.object({ mode: z.enum(["checkout", "portal"]) }).strict(),
]);

const undoProps = z.object({
  actionId: z.string().min(1).max(128),
  turnId: z.string().min(1).max(128),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// CoachBlock — discriminated union used by tools to construct UI blocks.
// Defined here as catalog components (AC#5).
// ---------------------------------------------------------------------------

const ClientActionBlockSchema = z
  .object({
    type: z.literal("client_action"),
    action: z.enum([
      "set_weight_unit",
      "set_sound",
      "open_checkout",
      "open_billing_portal",
    ]),
    payload: clientActionPayloadSchema,
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

export const CoachBlockSchema = z.discriminatedUnion("type", [
  statusProps.extend({ type: z.literal("status") }),
  metricsProps.extend({ type: z.literal("metrics") }),
  trendProps.extend({ type: z.literal("trend") }),
  tableProps.extend({ type: z.literal("table") }),
  suggestionsProps.extend({ type: z.literal("suggestions") }),
  entityListProps.extend({ type: z.literal("entity_list") }),
  detailPanelProps.extend({ type: z.literal("detail_panel") }),
  billingPanelProps.extend({ type: z.literal("billing_panel") }),
  quickLogFormProps.extend({ type: z.literal("quick_log_form") }),
  confirmationProps.extend({ type: z.literal("confirmation") }),
  ClientActionBlockSchema,
  undoProps.extend({ type: z.literal("undo") }),
]);

export type CoachBlock = z.infer<typeof CoachBlockSchema>;

// ---------------------------------------------------------------------------
// json-render catalog — generative UI vocabulary for the coach model.
// Uses .nullable() for optional catalog props (json-render convention).
//
// DESIGN NOTE: Catalog prop schemas are intentionally looser than the shared
// schemas above (no .max() constraints). The catalog communicates the prop
// structure to the model; strict validation (length limits, refinements)
// happens through CoachBlockSchema when tool results are constructed.
// TODO: generate catalog props from shared schemas with an optional→nullable transform.
// ---------------------------------------------------------------------------

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string().nullable(),
      }),
      slots: ["default"],
      description:
        "Container card that groups child components. Use as a root element when multiple blocks belong together.",
    },

    Status: {
      props: z.object({
        tone: z.enum(["success", "error", "info"]),
        title: z.string(),
        description: z.string().nullable(),
      }),
      description:
        "Feedback banner showing success, error, or info after an action.",
    },

    Metrics: {
      props: z.object({
        title: z.string(),
        metrics: z.array(z.object({ label: z.string(), value: z.string() })),
      }),
      description:
        "Grid of labeled metric values (e.g. today's workout totals).",
    },

    Trend: {
      props: z.object({
        title: z.string(),
        subtitle: z.string(),
        metric: z.enum(["reps", "duration"]),
        points: z.array(
          z.object({
            date: z.string(),
            label: z.string(),
            value: z.number(),
          })
        ),
        total: z.number(),
        bestDay: z.number(),
      }),
      description: "Time-series trend chart for an exercise over recent days.",
    },

    Table: {
      props: z.object({
        title: z.string(),
        rows: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
            meta: z.string().nullable(),
          })
        ),
      }),
      description: "Simple label-value table with optional meta column.",
    },

    Suggestions: {
      props: z.object({
        prompts: z.array(z.string()),
      }),
      description:
        "Follow-up prompt chips the user can tap to continue the conversation.",
    },

    EntityList: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        emptyLabel: z.string().nullable(),
        items: z.array(
          z.object({
            id: z.string().nullable(),
            title: z.string(),
            subtitle: z.string().nullable(),
            meta: z.string().nullable(),
            tags: z.array(z.string()).nullable(),
            prompt: z.string().nullable(),
          })
        ),
      }),
      description:
        "Scrollable list of entities (exercises, sessions) with optional drill-down prompts.",
    },

    DetailPanel: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        fields: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
            emphasis: z.boolean().nullable(),
          })
        ),
        prompts: z.array(z.string()).nullable(),
      }),
      description:
        "Detailed field-value panel for settings, preferences, or exercise detail.",
    },

    BillingPanel: {
      props: z.object({
        status: z.enum(["trial", "active", "past_due", "canceled", "expired"]),
        title: z.string(),
        subtitle: z.string().nullable(),
        trialDaysRemaining: z.number().nullable(),
        periodEnd: z.string().nullable(),
        ctaLabel: z.string().nullable(),
        ctaAction: z.enum(["open_checkout", "open_billing_portal"]).nullable(),
      }),
      description:
        "Subscription status panel with optional upgrade/manage CTA.",
    },

    QuickLogForm: {
      props: z.object({
        title: z.string(),
        exerciseName: z.string().nullable(),
        defaultUnit: z.enum(["lbs", "kg"]).nullable(),
      }),
      description: "Inline form for quickly logging a set.",
    },

    Confirmation: {
      props: z.object({
        title: z.string(),
        description: z.string(),
        confirmPrompt: z.string(),
        cancelPrompt: z.string().nullable(),
        confirmLabel: z.string().nullable(),
        cancelLabel: z.string().nullable(),
      }),
      description:
        "Confirmation dialog with confirm/cancel actions that send prompts.",
    },

    ClientAction: {
      props: z.object({
        action: z.enum([
          "set_weight_unit",
          "set_sound",
          "open_checkout",
          "open_billing_portal",
        ]),
        payload: z.record(z.string(), z.unknown()),
      }),
      description:
        "Invisible side-effect block: triggers a client action (settings change, navigation). Never rendered visually.",
    },

    Undo: {
      props: z.object({
        actionId: z.string(),
        turnId: z.string(),
        title: z.string().nullable(),
        description: z.string().nullable(),
      }),
      description: "Undo button for a reversible agent action.",
    },
  },
  actions: {},
});

/** All component names in the catalog. */
export const COACH_BLOCK_TYPES = [
  "Status",
  "Metrics",
  "Trend",
  "Table",
  "Suggestions",
  "EntityList",
  "DetailPanel",
  "BillingPanel",
  "QuickLogForm",
  "Confirmation",
  "ClientAction",
  "Undo",
] as const;

export type CoachBlockType = (typeof COACH_BLOCK_TYPES)[number];
