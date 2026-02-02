/**
 * AI Report Generation Orchestration
 *
 * Hybrid compute + AI approach:
 * - Server computes metrics, PR history, muscle balance (reliable data)
 * - AI generates creative content only (celebration copy, action directive)
 *
 * @module ai/generate
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { generateCreativeContent } from "./llm";
import type {
  AIReportV2,
  AICreativeContext,
  AICreativeResult,
  ReportType,
} from "./reportSchema";
import {
  getDefaultPeriodStart,
  calculateDateRange,
  calculateCurrentStreak,
} from "./dateUtils";
import { format } from "date-fns";

type SetDoc = Doc<"sets">;
type ExerciseDoc = Doc<"exercises">;
type ReportId = Id<"aiReports">;

interface WorkoutData {
  volumeData: SetDoc[];
  recentPRs: SetDoc[];
  allSets: SetDoc[];
  exercises: ExerciseDoc[];
}

// ============================================================================
// Period Formatting Helpers
// ============================================================================

/**
 * Format period label for display based on report type
 *
 * @example daily: "Dec 28, 2024"
 * @example weekly: "Dec 16-22, 2024"
 * @example monthly: "December 2024"
 */
function formatPeriodLabel(
  startDate: number,
  endDate: number,
  reportType: ReportType
): string {
  const start = new Date(startDate);

  // Daily: "Dec 28, 2024"
  if (reportType === "daily") {
    return format(start, "MMM d, yyyy");
  }

  // Monthly: "December 2024"
  if (reportType === "monthly") {
    return format(start, "MMMM yyyy");
  }

  // Weekly: "Dec 16-22, 2024" or "Dec 30 - Jan 5, 2025"
  const end = new Date(endDate - 1); // endDate is exclusive, so subtract 1ms
  const startMonth = format(start, "MMM");
  const startDay = format(start, "d");
  const endDay = format(end, "d");
  const year = format(end, "yyyy");

  // If same month: "Dec 16-22, 2024"
  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  // Different months: "Dec 30 - Jan 5, 2025"
  const endMonth = format(end, "MMM");
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Format ISO date string from timestamp
 */
function formatISODate(timestamp: number): string {
  return format(new Date(timestamp), "yyyy-MM-dd");
}

// ============================================================================
// Metrics Computation Helpers
// ============================================================================

/**
 * Format number with thousands separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Count unique workout days in a set of sets
 */
function countWorkoutDays(sets: SetDoc[]): number {
  const days = new Set(
    sets.map((s) => new Date(s.performedAt).toISOString().split("T")[0])
  );
  return days.size;
}

/**
 * Calculate total volume from sets
 *
 * Volume = sum of (reps * weight) for all weighted sets
 * Bodyweight sets (weight = 0 or undefined) contribute reps directly
 * to ensure bodyweight exercises are reflected in total volume.
 */
function calculateTotalVolume(sets: SetDoc[]): number {
  return sets.reduce((total, set) => {
    if (set.reps === undefined) return total; // Skip duration sets
    const weight = set.weight ?? 0;
    // Bodyweight exercises: count reps directly since weight is 0
    // Weighted exercises: count reps * weight
    return total + (weight > 0 ? set.reps * weight : set.reps);
  }, 0);
}

// ============================================================================
// PR Progression Helpers
// ============================================================================

interface TopPR {
  exerciseId: Id<"exercises">;
  exerciseName: string;
  prType: "weight" | "reps";
  currentValue: number;
  previousValue: number;
  improvement: number;
  performedAt: number;
}

/**
 * Find the top PR in the period
 *
 * Prioritizes weight PRs over rep PRs.
 * Returns the single most impressive PR for celebration.
 */
function findTopPR(
  sets: SetDoc[],
  exerciseMap: Map<Id<"exercises">, ExerciseDoc>,
  startDate: number,
  endDate: number
): TopPR | null {
  // Group sets by exercise
  const setsByExercise = new Map<Id<"exercises">, SetDoc[]>();
  for (const set of sets) {
    if (set.reps === undefined) continue; // Skip duration sets
    const exerciseSets = setsByExercise.get(set.exerciseId) ?? [];
    exerciseSets.push(set);
    setsByExercise.set(set.exerciseId, exerciseSets);
  }

  const prs: TopPR[] = [];

  for (const [exerciseId, exerciseSets] of setsByExercise) {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) continue;

    // Sort by performedAt ascending
    const sorted = [...exerciseSets].sort(
      (a, b) => a.performedAt - b.performedAt
    );

    // Track running max for weight and reps
    let maxWeight = 0;
    let maxReps = 0;

    for (const set of sorted) {
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      const inPeriod =
        set.performedAt >= startDate && set.performedAt < endDate;

      // Check for weight PR in period
      if (weight > maxWeight) {
        if (inPeriod && weight > 0) {
          prs.push({
            exerciseId,
            exerciseName: exercise.name,
            prType: "weight",
            currentValue: weight,
            previousValue: maxWeight,
            improvement: weight - maxWeight,
            performedAt: set.performedAt,
          });
        }
        maxWeight = weight;
      }

      // Check for reps PR in period (only for bodyweight exercises)
      if (reps > maxReps && weight === 0) {
        if (inPeriod && reps > 0) {
          prs.push({
            exerciseId,
            exerciseName: exercise.name,
            prType: "reps",
            currentValue: reps,
            previousValue: maxReps,
            improvement: reps - maxReps,
            performedAt: set.performedAt,
          });
        }
        maxReps = reps;
      }
    }
  }

  if (prs.length === 0) return null;

  // Sort by: weight PRs first, then by improvement amount
  prs.sort((a, b) => {
    if (a.prType !== b.prType) {
      return a.prType === "weight" ? -1 : 1;
    }
    return b.improvement - a.improvement;
  });

  return prs[0]!;
}

/**
 * Get exercise progression narrative
 *
 * @returns "185 → 205 → 225 lbs" style progression string
 */
function getExerciseProgression(
  sets: SetDoc[],
  exerciseId: Id<"exercises">,
  prType: "weight" | "reps",
  limit: number = 5
): string {
  // Get sets for this exercise, sorted by date
  const exerciseSets = sets
    .filter((s) => s.exerciseId === exerciseId && s.reps !== undefined)
    .sort((a, b) => a.performedAt - b.performedAt);

  if (exerciseSets.length === 0) return "";

  // Track historical max values
  const milestones: number[] = [];
  let currentMax = 0;

  for (const set of exerciseSets) {
    const value = prType === "weight" ? (set.weight ?? 0) : (set.reps ?? 0);
    if (value > currentMax) {
      currentMax = value;
      milestones.push(value);
    }
  }

  // Take last N milestones
  const recentMilestones = milestones.slice(-limit);
  if (recentMilestones.length < 2) return "";

  const unit = prType === "weight" ? " lbs" : " reps";
  return recentMilestones.join(" → ") + unit;
}

/**
 * Format PR value with unit
 */
function formatPRValue(value: number, prType: "weight" | "reps"): string {
  return prType === "weight" ? `${value} lbs` : `${value} reps`;
}

/**
 * Format PR improvement
 */
function formatPRImprovement(
  improvement: number,
  prType: "weight" | "reps"
): string {
  const unit = prType === "weight" ? "lbs" : "reps";
  return `+${improvement} ${unit}`;
}

// ============================================================================
// Context Calculation for AI
// ============================================================================

/**
 * Calculate volume trend for context
 *
 * Compares this period's volume to previous period.
 * Adjusts comparison window based on report type.
 */
function calculateVolumeTrend(
  thisPeriodSets: SetDoc[],
  allSets: SetDoc[],
  periodStart: number,
  reportType: ReportType
): string {
  const thisPeriodVolume = calculateTotalVolume(thisPeriodSets);

  // Calculate previous period based on report type
  const periodDurationMs =
    reportType === "daily"
      ? 24 * 60 * 60 * 1000 // 1 day
      : reportType === "weekly"
        ? 7 * 24 * 60 * 60 * 1000 // 7 days
        : 30 * 24 * 60 * 60 * 1000; // ~30 days for monthly

  const prevPeriodStart = periodStart - periodDurationMs;
  const prevPeriodEnd = periodStart;
  const prevPeriodSets = allSets.filter(
    (s) => s.performedAt >= prevPeriodStart && s.performedAt < prevPeriodEnd
  );
  const prevPeriodVolume = calculateTotalVolume(prevPeriodSets);

  const periodLabel =
    reportType === "daily" ? "day" : reportType === "weekly" ? "week" : "month";

  if (prevPeriodVolume === 0) return `first ${periodLabel} tracked`;
  const change =
    ((thisPeriodVolume - prevPeriodVolume) / prevPeriodVolume) * 100;

  if (change > 10) return `up ${Math.round(change)}%`;
  if (change < -10) return `down ${Math.round(Math.abs(change))}%`;
  return "stable";
}

/**
 * Calculate muscle balance summary for context
 *
 * Groups volume by muscle group to identify imbalances.
 */
function calculateMuscleBalance(
  sets: SetDoc[],
  exercises: ExerciseDoc[]
): string {
  // Create lookup for exercise muscle groups
  const muscleGroupsByExercise = new Map<Id<"exercises">, string[]>();
  for (const exercise of exercises) {
    muscleGroupsByExercise.set(exercise._id, exercise.muscleGroups ?? []);
  }

  // Aggregate volume by muscle group
  const volumeByGroup = new Map<string, number>();
  for (const set of sets) {
    if (set.reps === undefined) continue;
    const volume = set.reps * (set.weight ?? 0);
    const groups = muscleGroupsByExercise.get(set.exerciseId) ?? [];

    for (const group of groups) {
      volumeByGroup.set(group, (volumeByGroup.get(group) ?? 0) + volume);
    }
  }

  if (volumeByGroup.size === 0) return "no muscle data available";

  // Find top and bottom groups
  const sorted = [...volumeByGroup.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  if (!top || !bottom || sorted.length < 2) return "balanced training";

  // Compare top to bottom
  const ratio = top[1] / (bottom[1] || 1);
  if (ratio > 3) {
    return `${top[0]} heavy, ${bottom[0]} light`;
  }
  if (ratio > 2) {
    return `${top[0]} dominant`;
  }
  return "balanced training";
}

// ============================================================================
// Main Generation Action
// ============================================================================

/**
 * Generate structured report
 *
 * Orchestrates the full report generation workflow:
 * 1. Compute period, metrics, PR data from database
 * 2. Call AI for creative content (celebration + action)
 * 3. Merge computed + AI data
 * 4. Store report
 *
 * @param userId - User to generate report for
 * @param reportType - Report type: daily, weekly, or monthly (default: weekly)
 * @param periodStartDate - Optional Unix timestamp for period start
 * @returns Report ID of newly generated or existing report
 */
export const generateReport = internalAction({
  args: {
    userId: v.string(),
    reportType: v.optional(
      v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))
    ),
    periodStartDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ReportId> => {
    const { userId } = args;
    const reportType = (args.reportType ?? "weekly") as ReportType;
    const periodStartDate =
      args.periodStartDate ?? getDefaultPeriodStart(reportType);

    console.log(
      `[AI Reports] Generating ${reportType} report for user ${userId}, period ${new Date(periodStartDate).toISOString()}`
    );

    // Check for existing report (deduplication)
    const existingReportId = await ctx.runQuery(
      internal.ai.data.checkExistingReport,
      { userId, reportType, periodStartDate }
    );

    if (existingReportId) {
      console.log(
        `[AI Reports] Report already exists for this period: ${existingReportId}`
      );
      return existingReportId;
    }

    // Calculate date range
    const { startDate, endDate } = calculateDateRange(
      reportType,
      periodStartDate
    );

    // Fetch workout data
    const { volumeData, allSets, exercises }: WorkoutData = await ctx.runQuery(
      internal.ai.data.getWorkoutData,
      { userId, startDate, endDate }
    );

    // Build exercise lookup
    const exerciseMap = new Map<Id<"exercises">, ExerciseDoc>();
    for (const exercise of exercises) {
      exerciseMap.set(exercise._id, exercise);
    }

    // ========================================================================
    // Step 1: Compute period metadata
    // ========================================================================
    const period = {
      type: reportType,
      startDate: formatISODate(startDate),
      endDate: formatISODate(endDate),
      label: formatPeriodLabel(startDate, endDate, reportType),
    };

    // ========================================================================
    // Step 2: Compute metrics
    // ========================================================================
    const totalVolume = calculateTotalVolume(volumeData);
    const workoutDays = countWorkoutDays(volumeData);

    // Calculate current streak using utility function
    const currentStreak = calculateCurrentStreak(allSets);

    const metrics = {
      volume: { value: formatNumber(totalVolume), unit: "lbs" },
      workouts: { value: workoutDays },
      streak: { value: currentStreak },
    };

    // ========================================================================
    // Step 3: Compute PR data
    // ========================================================================
    const topPR = findTopPR(allSets, exerciseMap, startDate, endDate);

    let pr: AIReportV2["pr"];
    let aiContext: AICreativeContext;

    if (topPR) {
      const progression = getExerciseProgression(
        allSets,
        topPR.exerciseId,
        topPR.prType
      );

      pr = {
        hasPR: true,
        exercise: topPR.exerciseName,
        type: topPR.prType,
        value: formatPRValue(topPR.currentValue, topPR.prType),
        previousBest: formatPRValue(topPR.previousValue, topPR.prType),
        improvement: formatPRImprovement(topPR.improvement, topPR.prType),
        progression: progression || undefined,
      };

      aiContext = {
        hasPR: true,
        exerciseName: topPR.exerciseName,
        prType: topPR.prType,
        value: pr.value,
        improvement: pr.improvement,
        progression: progression || undefined,
        volumeTrend: calculateVolumeTrend(
          volumeData,
          allSets,
          periodStartDate,
          reportType
        ),
        muscleBalance: calculateMuscleBalance(volumeData, exercises),
        workoutFrequency: workoutDays,
      };
    } else {
      pr = { hasPR: false };

      aiContext = {
        hasPR: false,
        volumeTrend: calculateVolumeTrend(
          volumeData,
          allSets,
          periodStartDate,
          reportType
        ),
        muscleBalance: calculateMuscleBalance(volumeData, exercises),
        workoutFrequency: workoutDays,
      };
    }

    // ========================================================================
    // Step 4: Call AI for creative content
    // ========================================================================
    const aiOutput: AICreativeResult = await generateCreativeContent(aiContext);

    // ========================================================================
    // Step 5: Merge computed + AI data
    // ========================================================================
    // Merge computed + AI data (handle discriminated union branches separately)
    const mergedPR: AIReportV2["pr"] = pr.hasPR
      ? {
          ...pr,
          headline: aiOutput.prCelebration?.headline,
          celebrationCopy: aiOutput.prCelebration?.celebrationCopy,
          nextMilestone: aiOutput.prCelebration?.nextMilestone,
        }
      : {
          hasPR: false,
          emptyMessage: aiOutput.prEmptyMessage ?? undefined,
        };

    const report: AIReportV2 = {
      version: "2.0",
      period,
      metrics,
      pr: mergedPR,
      action: aiOutput.action,
    };

    // ========================================================================
    // Step 6: Store report
    // ========================================================================
    const reportId: ReportId = await ctx.runMutation(
      internal.ai.data.saveReport,
      {
        userId,
        reportType,
        periodStartDate,
        structuredContent: report,
        model: aiOutput.model,
        tokenUsage: aiOutput.tokenUsage,
      }
    );

    console.log(`[AI Reports] Report saved: ${reportId}`);

    return reportId;
  },
});
