/**
 * Frontend Types for V2 Reports
 *
 * Mirrors the Zod schema from convex/ai/reportV2Schema.ts for frontend use.
 * Separated to avoid importing Zod in client bundles.
 */

/**
 * Full V2 report structure as stored in database and rendered by frontend
 */
export interface AIReportV2 {
  version: "2.0";

  period: {
    type: "weekly";
    startDate: string; // "2024-12-16"
    endDate: string; // "2024-12-22"
    label: string; // "Dec 16-22, 2024"
  };

  metrics: {
    volume: {
      value: string; // "24,500"
      unit: string; // "lbs"
    };
    workouts: { value: number };
    streak: { value: number };
  };

  pr: {
    hasPR: boolean;
    // Computed fields
    exercise?: string;
    type?: "weight" | "reps";
    value?: string; // "225 lbs"
    previousBest?: string; // "215 lbs"
    improvement?: string; // "+10 lbs"
    progression?: string; // "185 → 205 → 225 lbs"
    // AI-generated fields
    headline?: string; // "BENCH PRESS PR!"
    celebrationCopy?: string;
    nextMilestone?: string;
    emptyMessage?: string;
  };

  action: {
    directive: string;
    rationale: string;
  };
}
