import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MuscleGroup } from "./analyticsRecovery";

/**
 * Focus Suggestions Analytics
 *
 * Provides rule-based training recommendations to optimize workout balance:
 * - Identifies neglected exercises (not trained in 7+ days)
 * - Detects muscle group imbalances (push/pull, upper/lower)
 * - Suggests specific exercises to improve training variety
 */

export type SuggestionType = "exercise" | "muscle_group" | "balance";
export type SuggestionPriority = "high" | "medium" | "low";

export interface FocusSuggestion {
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string; // e.g., "Train Squats"
  reason: string; // e.g., "Haven't trained in 9 days"
  suggestedExercises?: string[]; // For muscle_group type
  exerciseId?: Id<"exercises">; // For exercise type (deep link)
}

/**
 * Get focus suggestions for user's training
 *
 * Generates personalized training recommendations based on:
 * - Exercise frequency (identifies neglected exercises)
 * - Muscle group balance (detects push/pull, upper/lower imbalances)
 * - Training variety
 *
 * Returns up to 5 suggestions, prioritized by importance.
 *
 * @returns Array of training suggestions sorted by priority
 *
 * @example
 * ```typescript
 * const suggestions = await ctx.query(api.analyticsFocus.getFocusSuggestions, {});
 * // [
 * //   { type: "exercise", priority: "high", title: "Train Squats", ... },
 * //   { type: "balance", priority: "medium", title: "Balance Push/Pull", ... }
 * // ]
 * ```
 */
export const getFocusSuggestions = query({
  args: {},
  handler: async (ctx): Promise<FocusSuggestion[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Fetch user exercises and sets
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("deletedAt"), undefined)) // Only active exercises
      .collect();

    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user_performed", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    // Early return for new users
    if (exercises.length === 0 || sets.length === 0) {
      return [];
    }

    const suggestions: FocusSuggestion[] = [];

    // Track last trained date per exercise
    const exerciseLastTrained = new Map<Id<"exercises">, number>();
    for (const set of sets) {
      const current = exerciseLastTrained.get(set.exerciseId);
      if (!current || set.performedAt > current) {
        exerciseLastTrained.set(set.exerciseId, set.performedAt);
      }
    }

    // 1. Identify exercises not trained in 7+ days (HIGH priority)
    for (const exercise of exercises) {
      const lastTrained = exerciseLastTrained.get(exercise._id);
      if (!lastTrained) {
        // Never trained (created but not used)
        continue;
      }

      const daysSince = Math.floor((now - lastTrained) / (24 * 60 * 60 * 1000));
      if (daysSince >= 7) {
        suggestions.push({
          type: "exercise",
          priority: "high",
          title: `Train ${exercise.name}`,
          reason: `Haven't trained in ${daysSince} days`,
          exerciseId: exercise._id,
        });
      }
    }

    // 2. Calculate muscle group volumes (last 7 days) for balance analysis
    const muscleGroupVolumes = new Map<MuscleGroup, number>();

    // Build exercise Map for O(1) lookups (performance optimization)
    const exerciseMap = new Map(exercises.map((ex) => [ex._id, ex]));

    for (const set of sets) {
      if (set.performedAt < sevenDaysAgo) break; // Sets are sorted desc

      const exercise = exerciseMap.get(set.exerciseId);
      if (!exercise) continue;

      // Get muscle groups from exercise record (AI-classified)
      const muscleGroups = exercise.muscleGroups || ["Other"];
      // Only count volume for rep-based exercises
      const volume = set.reps !== undefined ? set.reps * (set.weight || 0) : 0;

      for (const group of muscleGroups) {
        if (group === "Other") continue;
        const current = muscleGroupVolumes.get(group as MuscleGroup) || 0;
        muscleGroupVolumes.set(group as MuscleGroup, current + volume);
      }
    }

    // 3. Detect push/pull imbalance (MEDIUM priority)
    const pushGroups: MuscleGroup[] = ["Chest", "Shoulders", "Triceps"];
    const pullGroups: MuscleGroup[] = ["Back", "Biceps"];

    const pushVolume = pushGroups.reduce(
      (sum, group) => sum + (muscleGroupVolumes.get(group) || 0),
      0
    );
    const pullVolume = pullGroups.reduce(
      (sum, group) => sum + (muscleGroupVolumes.get(group) || 0),
      0
    );

    if (pushVolume > 0 && pullVolume > 0) {
      const pushPullRatio = pushVolume / pullVolume;
      if (pushPullRatio > 2) {
        suggestions.push({
          type: "balance",
          priority: "medium",
          title: "Balance Push/Pull Training",
          reason: `Push volume is ${pushPullRatio.toFixed(1)}x higher than pull`,
          suggestedExercises: ["Pull-ups", "Rows", "Lat Pulldowns"],
        });
      } else if (pushPullRatio < 0.5) {
        suggestions.push({
          type: "balance",
          priority: "medium",
          title: "Balance Push/Pull Training",
          reason: `Pull volume is ${(1 / pushPullRatio).toFixed(1)}x higher than push`,
          suggestedExercises: ["Bench Press", "Overhead Press", "Dips"],
        });
      }
    }

    // 4. Detect upper/lower imbalance (MEDIUM priority)
    const upperGroups: MuscleGroup[] = [
      "Chest",
      "Back",
      "Shoulders",
      "Biceps",
      "Triceps",
    ];
    const lowerGroups: MuscleGroup[] = [
      "Quads",
      "Hamstrings",
      "Glutes",
      "Calves",
    ];

    const upperVolume = upperGroups.reduce(
      (sum, group) => sum + (muscleGroupVolumes.get(group) || 0),
      0
    );
    const lowerVolume = lowerGroups.reduce(
      (sum, group) => sum + (muscleGroupVolumes.get(group) || 0),
      0
    );

    if (upperVolume > 0 && lowerVolume > 0) {
      const upperLowerRatio = upperVolume / lowerVolume;
      if (upperLowerRatio > 2) {
        suggestions.push({
          type: "balance",
          priority: "medium",
          title: "Don't Skip Leg Day",
          reason: `Upper body volume is ${upperLowerRatio.toFixed(1)}x higher than legs`,
          suggestedExercises: ["Squats", "Deadlifts", "Lunges"],
        });
      } else if (upperLowerRatio < 0.5) {
        suggestions.push({
          type: "balance",
          priority: "medium",
          title: "Train Upper Body More",
          reason: `Leg volume is ${(1 / upperLowerRatio).toFixed(1)}x higher than upper body`,
          suggestedExercises: ["Bench Press", "Pull-ups", "Rows"],
        });
      }
    }

    // 5. Identify undertrained muscle groups (MEDIUM priority)
    // Find muscle groups with no volume in last 7 days
    const allGroups: MuscleGroup[] = [
      "Chest",
      "Back",
      "Shoulders",
      "Biceps",
      "Triceps",
      "Quads",
      "Hamstrings",
      "Glutes",
      "Calves",
      "Core",
    ];

    for (const group of allGroups) {
      const volume = muscleGroupVolumes.get(group) || 0;
      if (volume === 0) {
        // Get sample exercises for this muscle group
        const sampleExercises = getSampleExercises(group);

        suggestions.push({
          type: "muscle_group",
          priority: "medium",
          title: `Train ${group}`,
          reason: "No training in last 7 days",
          suggestedExercises: sampleExercises,
        });
      }
    }

    // Sort by priority: high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    // Return max 5 suggestions
    return suggestions.slice(0, 5);
  },
});

/**
 * Get sample exercises for a muscle group
 */
function getSampleExercises(muscleGroup: MuscleGroup): string[] {
  const exerciseMap: Record<MuscleGroup, string[]> = {
    Chest: ["Bench Press", "Push-ups", "Dips"],
    Back: ["Pull-ups", "Rows", "Deadlifts"],
    Shoulders: ["Overhead Press", "Lateral Raises", "Face Pulls"],
    Biceps: ["Curls", "Chin-ups", "Hammer Curls"],
    Triceps: ["Dips", "Tricep Extensions", "Close-Grip Bench"],
    Quads: ["Squats", "Leg Press", "Lunges"],
    Hamstrings: ["Deadlifts", "Leg Curls", "RDLs"],
    Glutes: ["Hip Thrusts", "Squats", "Lunges"],
    Calves: ["Calf Raises", "Jump Rope", "Box Jumps"],
    Core: ["Planks", "Crunches", "Leg Raises"],
    Other: [],
  };

  return exerciseMap[muscleGroup] || [];
}
