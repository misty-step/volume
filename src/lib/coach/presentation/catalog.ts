import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const sceneFrameProps = z.object({
  title: z.string(),
  subtitle: z.string().nullable(),
});

const actionChipProps = z.object({
  label: z.string(),
});

const choiceCardProps = z.object({
  title: z.string(),
  description: z.string().nullable(),
  meta: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
});

const topExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().min(0),
  reps: z.number().int().min(0).nullable(),
  durationSeconds: z.number().int().min(0).nullable(),
});

const dailySnapshotProps = z.object({
  title: z.string(),
  subtitle: z.string().nullable(),
  totalSets: z.number().int().min(0),
  totalReps: z.number().int().min(0),
  totalDurationSeconds: z.number().int().min(0),
  exerciseCount: z.number().int().min(0),
  topExercises: z.array(topExerciseSchema),
});

const analyticsOverviewProps = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  workoutDays: z.number().int().min(0),
  recentVolume: z.number().int().min(0),
  recentPrs: z.array(
    z.object({
      exerciseName: z.string(),
      prLabel: z.string(),
      detail: z.string().nullable(),
    })
  ),
  overload: z.array(
    z.object({
      exerciseName: z.string(),
      trend: z.string(),
      note: z.string().nullable(),
    })
  ),
  focusSuggestions: z.array(
    z.object({
      title: z.string(),
      priority: z.string(),
      reason: z.string(),
    })
  ),
});

const summaryMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const trendSchema = z.object({
  subtitle: z.string().nullable(),
  metric: z.enum(["reps", "duration"]),
  total: z.number(),
  bestDay: z.number(),
  points: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
      value: z.number(),
    })
  ),
});

const tableRowSchema = z.object({
  label: z.string(),
  value: z.string(),
  meta: z.string().nullable(),
});

const exerciseInsightProps = z.object({
  exerciseName: z.string(),
  takeaway: z.string().nullable(),
  summaryMetrics: z.array(summaryMetricSchema),
  trend: trendSchema.nullable(),
  recentRows: z.array(tableRowSchema).nullable(),
});

const historyTimelineProps = z.object({
  sessions: z.array(
    z.object({
      dateLabel: z.string(),
      summary: z.string().nullable(),
      rows: z.array(tableRowSchema),
    })
  ),
});

const librarySceneProps = z.object({
  title: z.string(),
  description: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      muscleGroups: z.array(z.string()).nullable(),
      lastLogged: z.string().nullable(),
      note: z.string().nullable(),
    })
  ),
});

const settingsSceneProps = z.object({
  title: z.string(),
  description: z.string().nullable(),
  fields: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      emphasis: z.boolean().nullable(),
    })
  ),
});

const billingStateProps = z.object({
  status: z.enum(["trial", "active", "past_due", "canceled", "expired"]),
  title: z.string(),
  subtitle: z.string().nullable(),
  trialDaysRemaining: z.number().nullable(),
  periodEnd: z.string().nullable(),
  ctaLabel: z.string().nullable(),
});

const logOutcomeProps = z.object({
  tone: z.enum(["success", "error", "info"]),
  title: z.string(),
  description: z.string().nullable(),
  detailRows: z.array(tableRowSchema).nullable(),
  undoActionId: z.string().nullable(),
  undoTurnId: z.string().nullable(),
  undoTitle: z.string().nullable(),
  undoDescription: z.string().nullable(),
});

const clarifyPanelProps = z.object({
  title: z.string(),
  description: z.string().nullable(),
});

const confirmationPanelProps = z.object({
  title: z.string(),
  description: z.string(),
  confirmLabel: z.string().nullable(),
  cancelLabel: z.string().nullable(),
});

const preferenceCardProps = z.object({
  title: z.string(),
  description: z.string().nullable(),
  valueLabel: z.string(),
});

const quickLogComposerProps = z.object({
  title: z.string(),
  exerciseName: z.string().nullable(),
  reps: z.string().nullable(),
  durationSeconds: z.string().nullable(),
  weight: z.string().nullable(),
  unit: z.enum(["lbs", "kg"]).nullable(),
  helperText: z.string().nullable(),
});

const setPreferenceParams = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("unit"),
    value: z.enum(["lbs", "kg"]),
  }),
  z.object({
    key: z.literal("sound_enabled"),
    value: z.boolean(),
  }),
]);

export const coachPresentationCatalog = defineCatalog(schema, {
  components: {
    Scene: {
      props: sceneFrameProps,
      slots: ["default"],
      description:
        "Top-level scene frame for one assistant turn. Use as the root when rendering rich UI.",
    },
    ActionTray: {
      props: z.object({}),
      slots: ["default"],
      description:
        "Flexible row of follow-up actions. Usually placed after the main scene content.",
    },
    ActionChip: {
      props: actionChipProps,
      description:
        "Compact action chip that emits a press event for follow-up prompts or scoped actions.",
    },
    ChoiceCard: {
      props: choiceCardProps,
      description:
        "Selectable option card for clarifications, branching choices, or narrow workflows. Emits press.",
    },
    DailySnapshot: {
      props: dailySnapshotProps,
      description:
        "One-glance summary of today's workout with totals and top exercises.",
    },
    AnalyticsOverview: {
      props: analyticsOverviewProps,
      description:
        "Cross-cutting progress scene for streaks, recent PRs, overload, and focus suggestions.",
    },
    ExerciseInsight: {
      props: exerciseInsightProps,
      description:
        "Exercise-specific scene with takeaway, summary metrics, optional trend, and recent evidence.",
    },
    HistoryTimeline: {
      props: historyTimelineProps,
      description:
        "Timeline view of recent workout sessions grouped by day with detailed rows.",
    },
    LibraryScene: {
      props: librarySceneProps,
      description:
        "Exercise library scene for active and archived exercises with tags and metadata.",
    },
    SettingsScene: {
      props: settingsSceneProps,
      description:
        "Training preferences scene for goals, split, and coach notes.",
    },
    BillingState: {
      props: billingStateProps,
      description:
        "Subscription access scene with a single CTA. Emits cta when the button is pressed.",
    },
    LogOutcome: {
      props: logOutcomeProps,
      description:
        "Compact outcome scene for success, failure, or info after an action. Emits undo when undo ids are present.",
    },
    ClarifyPanel: {
      props: clarifyPanelProps,
      slots: ["default"],
      description:
        "Container for ambiguity resolution. Usually contains several ChoiceCard children.",
    },
    ConfirmationPanel: {
      props: confirmationPanelProps,
      description:
        "Explicit confirm/cancel panel for destructive or high-cost actions. Emits confirm and cancel.",
    },
    PreferenceCard: {
      props: preferenceCardProps,
      description:
        "Single preference control surface. Emits press to toggle or open a deeper action.",
    },
    QuickLogComposer: {
      props: quickLogComposerProps,
      description:
        "Structured quick-log form for exercise, reps or duration, optional weight, and unit. Uses value bindings and emits submit.",
    },
  },
  actions: {
    submit_prompt: {
      params: z.object({
        prompt: z.string().min(1).max(400),
      }),
      description: "Submit a conversational follow-up prompt to the coach.",
    },
    prefill_prompt: {
      params: z.object({
        prompt: z.string().min(1).max(400),
      }),
      description: "Prefill the chat composer without sending yet.",
    },
    undo_agent_action: {
      params: z.object({
        actionId: z.string().min(1),
        turnId: z.string().min(1),
      }),
      description:
        "Undo a reversible agent action using its action and turn ids.",
    },
    set_preference: {
      params: setPreferenceParams,
      description:
        "Update a small local preference such as weight unit or sound state.",
    },
    open_checkout: {
      params: z.object({}),
      description: "Navigate to the checkout flow.",
    },
    open_billing_portal: {
      params: z.object({}),
      description: "Open the billing management portal.",
    },
    quick_log_submit: {
      params: z.object({
        exerciseName: z.string().min(1).max(120),
        reps: z.string().max(12).nullable(),
        durationSeconds: z.string().max(12).nullable(),
        weight: z.string().max(12).nullable(),
        unit: z.enum(["lbs", "kg"]),
      }),
      description:
        "Submit the structured quick-log form without routing through prose.",
    },
  },
});

export const COACH_PRESENTATION_COMPONENTS = [
  "Scene",
  "ActionTray",
  "ActionChip",
  "ChoiceCard",
  "DailySnapshot",
  "AnalyticsOverview",
  "ExerciseInsight",
  "HistoryTimeline",
  "LibraryScene",
  "SettingsScene",
  "BillingState",
  "LogOutcome",
  "ClarifyPanel",
  "ConfirmationPanel",
  "PreferenceCard",
  "QuickLogComposer",
] as const;
