/**
 * AI Report V2 Schema Definitions
 *
 * Zod schemas for structured AI report output. Separates computed data
 * (metrics, PR history) from AI-generated creative content (celebration copy, actions).
 *
 * @module ai/reportV2Schema
 */

import { z } from "zod";

/**
 * AI-generated creative content only
 *
 * This is what the AI returns—just the creative parts:
 * - PR celebration messages
 * - Action directive + rationale
 *
 * Metrics and PR data are computed server-side, not generated.
 */
export const AICreativeOutputSchema = z.object({
  // PR celebration (only when hasPR context is true)
  // Using .nullable() instead of .optional() for OpenAI Structured Outputs compatibility
  prCelebration: z
    .object({
      headline: z.string(), // "BENCH PRESS PR!"
      celebrationCopy: z.string(), // "You've been building to this..."
      nextMilestone: z.string(), // "At this pace, 250 lbs by March"
    })
    .nullable(),

  // Empty state message (only when hasPR context is false)
  prEmptyMessage: z.string().nullable(),

  // Always required: ONE action directive
  action: z.object({
    directive: z.string(), // "Add a leg day Wednesday"
    rationale: z.string(), // "Your push volume is 2x your leg volume"
  }),
});

/**
 * Full V2 report structure (computed + AI merged)
 *
 * This is what gets stored in the database and rendered by frontend.
 */
export const AIReportV2Schema = z.object({
  version: z.literal("2.0"),

  // Period metadata (computed server-side)
  period: z.object({
    type: z.enum(["daily", "weekly", "monthly"]),
    startDate: z.string(), // "2024-12-16"
    endDate: z.string(), // "2024-12-22"
    label: z.string(), // "Dec 16-22, 2024" or "Dec 28, 2024" or "December 2024"
  }),

  // Key numbers (computed server-side)
  metrics: z.object({
    volume: z.object({
      value: z.string(), // "24,500"
      unit: z.string(), // "lbs"
    }),
    workouts: z.object({ value: z.number() }),
    streak: z.object({ value: z.number() }),
  }),

  // PR section (computed + AI merged)
  pr: z.object({
    hasPR: z.boolean(),
    // Computed fields (from database)
    exercise: z.string().optional(),
    type: z.enum(["weight", "reps"]).optional(),
    value: z.string().optional(), // "225 lbs"
    previousBest: z.string().optional(), // "215 lbs"
    improvement: z.string().optional(), // "+10 lbs"
    progression: z.string().optional(), // "185 → 205 → 225 lbs"
    // AI-generated fields
    headline: z.string().optional(), // "BENCH PRESS PR!"
    celebrationCopy: z.string().optional(), // "You've been building..."
    nextMilestone: z.string().optional(), // "250 lbs by March"
    emptyMessage: z.string().optional(), // "No PRs this week..."
  }),

  // Action section (AI-generated)
  action: z.object({
    directive: z.string(),
    rationale: z.string(),
  }),
});

// Type exports
export type AICreativeOutput = z.infer<typeof AICreativeOutputSchema>;
export type AIReportV2 = z.infer<typeof AIReportV2Schema>;
export type ReportType = AIReportV2["period"]["type"];

/**
 * Context passed to AI for creative content generation
 *
 * Minimal data—just what AI needs to be creative.
 * Metrics are NOT included (they're computed, not generated).
 */
export interface AICreativeContext {
  hasPR: boolean;
  exerciseName?: string;
  prType?: "weight" | "reps";
  value?: string;
  improvement?: string;
  progression?: string; // "185 → 205 → 225 lbs"
  volumeTrend: string; // "up 15%", "stable", "down 10%"
  muscleBalance: string; // "Push heavy, legs light"
  workoutFrequency: number; // days this week
}

/**
 * Result from AI creative content generation
 */
export interface AICreativeResult extends AICreativeOutput {
  model: string;
  tokenUsage: {
    input: number;
    output: number;
    costUSD: number;
  };
}
