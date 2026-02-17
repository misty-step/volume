import { z } from "zod";

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
