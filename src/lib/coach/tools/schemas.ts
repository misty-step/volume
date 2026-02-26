import { z } from "zod";
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

export const UpdateMuscleGroupsArgsSchema = z.object({
  exercise_name: z.string().trim().min(1).max(80),
  muscle_groups: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
});

export const DeleteSetArgsSchema = z
  .object({
    set_id: z.string().trim().min(1).optional(),
    exercise_name: z.string().trim().min(1).max(80).optional(),
  })
  .refine(
    (data) => data.set_id !== undefined || data.exercise_name !== undefined,
    {
      message: "Provide set_id or exercise_name.",
      path: ["set_id"],
    }
  );

export const UpdatePreferencesArgsSchema = z.object({
  goals: z.array(z.enum(GOAL_TYPES)).max(4).optional(),
  custom_goal: z.string().trim().max(280).optional(),
  training_split: z.string().trim().max(280).optional(),
  coach_notes: z.string().trim().max(500).optional(),
});

export const ReportHistoryArgsSchema = z.object({
  limit: z.number().int().min(1).max(30).optional(),
});
