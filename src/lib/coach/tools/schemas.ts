import { z } from "zod";
import { GOAL_TYPES } from "@/lib/goals";

const ISO_LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function hasExactlyOneMetricField(data: {
  reps?: number;
  duration_seconds?: number;
}) {
  return (
    (data.reps !== undefined && data.duration_seconds === undefined) ||
    (data.reps === undefined && data.duration_seconds !== undefined)
  );
}

function hasAtMostOneMetricField(data: {
  reps?: number;
  duration_seconds?: number;
}) {
  return !(data.reps !== undefined && data.duration_seconds !== undefined);
}

function mergeExercisesMustDiffer(data: {
  source_exercise: string;
  target_exercise: string;
}) {
  return (
    data.source_exercise.trim().toLowerCase() !==
    data.target_exercise.trim().toLowerCase()
  );
}

export const LogSetArgsSchema = z
  .object({
    exercise_name: z.string().trim().min(1).max(80),
    reps: z.number().int().min(1).max(1000).optional(),
    duration_seconds: z.number().int().min(1).max(86_400).optional(),
    weight: z.number().min(0).max(5000).optional(),
    unit: z.enum(["lbs", "kg"]).optional(),
  })
  .refine(hasExactlyOneMetricField, {
    message: "Provide exactly one of reps or duration_seconds.",
    path: ["reps"],
  });

export const ExerciseReportArgsSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
});

export const SetWeightUnitArgsSchema = z.object({
  unit: z.enum(["lbs", "kg"]),
});

export const SetSoundArgsSchema = z.object({
  enabled: z.boolean(),
});

export const HistoryArgsSchema = z.object({
  limit: z.number().int().min(5).max(100).optional(),
});

export const ExerciseNameArgsSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
});

export const RenameExerciseArgsSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
  new_name: z.string().trim().min(1).max(80),
});

export const MergeExerciseArgsSchema = z
  .object({
    source_exercise: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .describe("Exercise name to merge from (will be archived)"),
    target_exercise: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .describe("Exercise name to merge into (will be kept)"),
  })
  .refine(mergeExercisesMustDiffer, {
    message: "Source and target exercises must be different.",
  });

export const UpdateMuscleGroupsArgsSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
  muscle_groups: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
});

export const DeleteSetArgsSchema = z
  .object({
    set_id: z.string().optional(),
    exercise_name: z.string().optional(),
  })
  .refine((data) => !!data.set_id || !!data.exercise_name, {
    message: "Provide set_id or exercise_name.",
  });

export const UpdatePreferencesArgsSchema = z.object({
  goals: z.array(z.enum(GOAL_TYPES)).max(4).optional(),
  custom_goal: z.string().trim().max(280).optional(),
  training_split: z.string().trim().max(280).optional(),
  coach_notes: z.string().trim().max(500).optional(),
});

export const ReportHistoryArgsSchema = z.object({
  limit: z.number().int().min(1).max(30).optional(),
});

export const EditSetArgsSchema = z
  .object({
    set_id: z.string().min(1),
    reps: z.number().int().min(1).max(1000).optional(),
    duration_seconds: z.number().int().min(1).max(86_400).optional(),
    weight: z.number().min(0).max(5000).optional(),
    unit: z.enum(["lbs", "kg"]).optional(),
  })
  .refine(hasAtMostOneMetricField, {
    message: "Provide at most one of reps or duration_seconds.",
    path: ["reps"],
  });

export const BulkLogItemSchema = z
  .object({
    exercise_name: z.string().trim().min(1).max(80),
    reps: z.number().int().min(1).max(1000).optional(),
    duration_seconds: z.number().int().min(1).max(86_400).optional(),
    weight: z.number().min(0).max(5000).optional(),
    unit: z.enum(["lbs", "kg"]).optional(),
  })
  .refine(hasExactlyOneMetricField, {
    message: "Provide exactly one of reps or duration_seconds.",
    path: ["reps"],
  });

export const BulkLogArgsSchema = z.object({
  sets: z.array(BulkLogItemSchema).min(1).max(20),
});

const CanonicalSingleLogArgsSchema = z.object({
  action: z.literal("log_set"),
  set: BulkLogItemSchema,
});

const CanonicalBulkLogArgsSchema = z.object({
  action: z.literal("bulk_log"),
  sets: z.array(BulkLogItemSchema).min(1).max(20),
});

const LegacyLogSetsArgsSchema = BulkLogArgsSchema.transform((args) =>
  args.sets.length === 1
    ? {
        action: "log_set" as const,
        set: args.sets[0],
      }
    : {
        action: "bulk_log" as const,
        sets: args.sets,
      }
);

export const LogSetsArgsSchema = z.union([
  CanonicalSingleLogArgsSchema,
  CanonicalBulkLogArgsSchema,
  LegacyLogSetsArgsSchema,
]);

export const ExerciseHistoryArgsSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(100).optional(),
});

export const DateRangeSetsArgsSchema = z.object({
  start_date: z
    .string()
    .regex(ISO_LOCAL_DATE_REGEX, "Date must be YYYY-MM-DD")
    .describe("ISO date string YYYY-MM-DD"),
  end_date: z
    .string()
    .regex(ISO_LOCAL_DATE_REGEX, "Date must be YYYY-MM-DD")
    .describe("ISO date string YYYY-MM-DD"),
});

export const WorkoutSessionArgsSchema = z.object({
  date: z
    .string()
    .regex(ISO_LOCAL_DATE_REGEX, "Date must be YYYY-MM-DD")
    .describe("ISO date string YYYY-MM-DD, defaults to today")
    .optional(),
});

export const QueryWorkoutsArgsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("today_summary"),
  }),
  z.object({
    action: z.literal("workout_session"),
    date: z
      .string()
      .regex(ISO_LOCAL_DATE_REGEX, "Date must be YYYY-MM-DD")
      .optional(),
  }),
  z.object({
    action: z.literal("date_range"),
    start_date: z
      .string()
      .regex(ISO_LOCAL_DATE_REGEX, "Date must be YYYY-MM-DD"),
    end_date: z.string().regex(ISO_LOCAL_DATE_REGEX, "Date must be YYYY-MM-DD"),
  }),
  z.object({
    action: z.literal("history_overview"),
    limit: z.number().int().min(5).max(100).optional(),
  }),
]);

export const QueryExerciseArgsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("snapshot"),
    exercise_name: z.string().trim().min(1).max(80),
  }),
  z.object({
    action: z.literal("trend"),
    exercise_name: z.string().trim().min(1).max(80),
  }),
  z.object({
    action: z.literal("history"),
    exercise_name: z.string().trim().min(1).max(80),
    limit: z.number().int().min(1).max(100).optional(),
  }),
]);

export const ManageExerciseArgsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("rename"),
    exercise_name: z.string().trim().min(1).max(80),
    new_name: z.string().trim().min(1).max(80),
  }),
  z.object({
    action: z.literal("delete"),
    exercise_name: z.string().trim().min(1).max(80),
  }),
  z.object({
    action: z.literal("restore"),
    exercise_name: z.string().trim().min(1).max(80),
  }),
  z
    .object({
      action: z.literal("merge"),
      source_exercise: z.string().trim().min(1).max(80),
      target_exercise: z.string().trim().min(1).max(80),
    })
    .refine(mergeExercisesMustDiffer, {
      message: "Source and target exercises must be different.",
    }),
  z.object({
    action: z.literal("update_muscle_groups"),
    exercise_name: z.string().trim().min(1).max(80),
    muscle_groups: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  }),
]);

export const ModifySetArgsSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("edit"),
      set_id: z.string().min(1),
      reps: z.number().int().min(1).max(1000).optional(),
      duration_seconds: z.number().int().min(1).max(86_400).optional(),
      weight: z.number().min(0).max(5000).optional(),
      unit: z.enum(["lbs", "kg"]).optional(),
    })
    .refine(hasAtMostOneMetricField, {
      message: "Provide at most one of reps or duration_seconds.",
      path: ["reps"],
    }),
  z
    .object({
      action: z.literal("delete"),
      set_id: z.string().optional(),
      exercise_name: z.string().optional(),
    })
    .refine((data) => !!data.set_id || !!data.exercise_name, {
      message: "Provide set_id or exercise_name.",
    }),
]);

export const UpdateSettingsArgsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("weight_unit"),
    unit: z.enum(["lbs", "kg"]),
  }),
  z.object({
    action: z.literal("sound"),
    enabled: z.boolean(),
  }),
  z.object({
    action: z.literal("preferences"),
    goals: z.array(z.enum(GOAL_TYPES)).max(4).optional(),
    custom_goal: z.string().trim().max(280).optional(),
    training_split: z.string().trim().max(280).optional(),
    coach_notes: z.string().trim().max(500).optional(),
  }),
]);

export const GetInsightsArgsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("analytics_overview"),
  }),
  z.object({
    action: z.literal("focus_suggestions"),
  }),
]);
