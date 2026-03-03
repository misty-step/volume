import { z } from "zod";

const ISO_LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
import { GOAL_TYPES } from "@/lib/goals";

export const LogSetArgsSchema = z
  .object({
    exercise_name: z.string().trim().min(1).max(80),
    reps: z.number().int().min(1).max(1000).optional(),
    duration_seconds: z.number().int().min(1).max(86_400).optional(),
    weight: z.number().min(0).max(5000).optional(),
    unit: z.enum(["lbs", "kg"]).optional(),
  })
  .refine(
    (data) =>
      (data.reps !== undefined && data.duration_seconds === undefined) ||
      (data.reps === undefined && data.duration_seconds !== undefined),
    {
      message: "Provide exactly one of reps or duration_seconds.",
      path: ["reps"],
    }
  );

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
  .refine(
    (data) =>
      data.source_exercise.trim().toLowerCase() !==
      data.target_exercise.trim().toLowerCase(),
    { message: "Source and target exercises must be different." }
  );

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

export const EditSetArgsSchema = z.object({
  set_id: z.string().min(1),
  reps: z.number().int().min(1).max(1000).optional(),
  duration_seconds: z.number().int().min(1).max(86_400).optional(),
  weight: z.number().min(0).max(5000).optional(),
  unit: z.enum(["lbs", "kg"]).optional(),
});

export const BulkLogItemSchema = z
  .object({
    exercise_name: z.string().trim().min(1).max(80),
    reps: z.number().int().min(1).max(1000).optional(),
    duration_seconds: z.number().int().min(1).max(86_400).optional(),
    weight: z.number().min(0).max(5000).optional(),
    unit: z.enum(["lbs", "kg"]).optional(),
  })
  .refine(
    (data) =>
      (data.reps !== undefined && data.duration_seconds === undefined) ||
      (data.reps === undefined && data.duration_seconds !== undefined),
    {
      message: "Provide exactly one of reps or duration_seconds.",
      path: ["reps"],
    }
  );

export const BulkLogArgsSchema = z.object({
  sets: z.array(BulkLogItemSchema).min(1).max(20),
});

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
