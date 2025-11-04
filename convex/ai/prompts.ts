/**
 * AI Prompt Templates for Workout Analysis
 *
 * This module handles prompt engineering for generating technical workout insights.
 * Prompts are versioned to enable A/B testing and quality improvements over time.
 *
 * @module ai/prompts
 */

/**
 * Current prompt version for tracking and A/B testing
 */
export const PROMPT_VERSION = "v1";

/**
 * System prompt defining AI role and behavior
 *
 * Role: Technical strength coach focused on data-driven analysis
 * Tone: Technical, actionable, evidence-based (not motivational fluff)
 * Output: 200-400 words of insights on trends, plateaus, recovery, optimization
 */
export const systemPrompt = `You are a technical strength coach analyzing workout data. Your role is to provide data-driven, actionable insights based on training metrics.

**Guidelines**:
- Focus on technical analysis: trends, plateaus, recovery patterns, optimization opportunities
- Be specific and evidence-based: cite actual numbers from the data
- Avoid generic motivation - users want technical insights, not cheerleading
- Identify: progressive overload signals, potential overtraining, recovery needs, volume distribution
- Suggest: programming adjustments, deload timing, exercise prioritization
- Keep analysis concise: 200-400 words maximum

**CRITICAL - Data Validity**:
- This app logs REAL workout data from actual training sessions
- Mixed training approaches (weighted + bodyweight versions of same exercise) are NORMAL and INTENTIONAL
- Variable set counts and rep schemes are part of legitimate training variation
- DO NOT suggest "fixing timestamps", "verifying set counts", "correcting data", or "debugging logs"
- DO NOT call ANY logged data "anomalies", "bugs", "errors", "miscounts", or "data issues"
- TRUST the data completely and provide actionable training insights, not data debugging

**CRITICAL - Bodyweight Exercise Handling**:
- Bodyweight exercises (push-ups, pull-ups, chin-ups, dips, bodyweight squats, etc.) are logged as TOTAL REPS ONLY
- This is CORRECT and INTENTIONAL - NOT a data error or logging mistake
- Do NOT suggest adding weight, body mass calculations, or treating these as "0 lbs" anomalies
- Analyze bodyweight exercises based on rep volume, set count, and rep PRs (not weight)

**Analysis Examples** (Good vs Bad):

✅ GOOD: "Push-ups: 96 reps across 10 sets shows solid bodyweight volume. Consider progressive overload by increasing reps per set or adding difficulty variations (e.g., diamond, decline)."

❌ BAD: "Push-ups: 0 lbs across 96 sets appears to be a logging error. Please log body weight for accurate volume tracking."

✅ GOOD: "Squats show mixed training: weighted sets (900 lbs over 15 sets = 60 lbs avg) combined with bodyweight sets (200 reps over 44 sets). This suggests varied intensity training - possibly warm-ups, technique work, or endurance sets alongside strength work."

❌ BAD: "Squats: 15.3 lbs per set is unusually low. This likely indicates a data logging issue or incorrect weight entry. Please verify squat loads."

**Output Structure**:
1. **Training Volume**: Assess overall volume and distribution across exercises
2. **Progress Indicators**: Highlight PRs and strength gains with context
3. **Recovery & Frequency**: Evaluate workout frequency and rest patterns
4. **Recommendations**: 2-3 specific, actionable adjustments

Use markdown formatting for readability. Be direct and technical. Focus on coaching, not data validation.`;

/**
 * Metrics input for prompt generation
 */
export interface AnalyticsMetrics {
  volume: Array<{
    exerciseName: string;
    totalVolume: number;
    sets: number;
    isBodyweight: boolean;
  }>;
  prs: Array<{
    exerciseName: string;
    prType: "weight" | "reps" | "volume";
    improvement: number;
    performedAt: number;
  }>;
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalWorkouts: number;
  };
  frequency: {
    workoutDays: number;
    restDays: number;
    avgSetsPerDay: number;
  };
  weekStartDate: number; // For week-over-week comparison (future enhancement)
}

/**
 * Format analytics metrics into a user prompt for AI analysis
 *
 * Converts structured workout data into a natural language prompt that provides
 * context for the AI to generate insights. Includes all relevant metrics in a
 * scannable format.
 *
 * @param metrics - Structured analytics data from the past week/period
 * @returns Formatted prompt string ready for AI consumption
 *
 * @example
 * ```typescript
 * const metrics = {
 *   volume: [{ exerciseName: "Bench Press", totalVolume: 4050, sets: 3 }],
 *   prs: [{ exerciseName: "Bench Press", prType: "weight", improvement: 10 }],
 *   streak: { currentStreak: 7, longestStreak: 30, totalWorkouts: 156 },
 *   frequency: { workoutDays: 5, restDays: 2, avgSetsPerDay: 12 }
 * };
 * const prompt = formatMetricsPrompt(metrics);
 * ```
 */
export function formatMetricsPrompt(metrics: AnalyticsMetrics): string {
  const { volume, prs, streak, frequency } = metrics;

  // Separate weighted vs bodyweight exercises
  const weightedExercises = volume.filter((v) => !v.isBodyweight);
  const bodyweightExercises = volume.filter((v) => v.isBodyweight);

  const weightedSection =
    weightedExercises.length > 0
      ? weightedExercises
          .slice(0, 10)
          .map(
            (v) =>
              `- **${v.exerciseName}**: ${v.totalVolume.toLocaleString()} lbs total (${v.sets} sets)`
          )
          .join("\n")
      : "- No weighted exercises this period";

  const bodyweightSection =
    bodyweightExercises.length > 0
      ? bodyweightExercises
          .slice(0, 10)
          .map(
            (v) =>
              `- **${v.exerciseName}**: ${v.totalVolume} total reps (${v.sets} sets)`
          )
          .join("\n")
      : "- No bodyweight exercises this period";

  // Separate PRs by type
  const weightPRs = prs.filter((pr) => pr.prType === "weight");
  const repPRs = prs.filter((pr) => pr.prType === "reps");

  const weightPRSection =
    weightPRs.length > 0
      ? weightPRs
          .map((pr) => {
            const date = new Date(pr.performedAt).toLocaleDateString();
            return `- **${pr.exerciseName}**: ${pr.improvement} lbs on ${date}`;
          })
          .join("\n")
      : "";

  const repPRSection =
    repPRs.length > 0
      ? repPRs
          .map((pr) => {
            const date = new Date(pr.performedAt).toLocaleDateString();
            return `- **${pr.exerciseName}**: ${pr.improvement} reps on ${date}`;
          })
          .join("\n")
      : "";

  const prsSection = [weightPRSection, repPRSection]
    .filter((s) => s)
    .join("\n\n");
  const noPRs = prs.length === 0;

  const totalDays = frequency.workoutDays + frequency.restDays;
  const consistencyPct =
    totalDays > 0 ? ((frequency.workoutDays / totalDays) * 100).toFixed(0) : 0;

  return `<task>
Analyze this training period and provide actionable, technical insights.
</task>

<context>
This report covers a training period with ${frequency.workoutDays} workout days and ${frequency.restDays} rest days. Focus ONLY on data from this specific period - do not extrapolate to longer timeframes.
</context>

<data_interpretation>
**How to read this data:**
- **Weighted exercises**: Show total weight × reps in lbs. Example: "Bench Press: 4,050 lbs (3 sets)" means 3 sets totaling 4,050 lbs of volume.
- **Bodyweight exercises**: Show total reps only. Example: "Push-ups: 96 reps (10 sets)" means 10 sets totaling 96 reps.
- **Mixed exercises**: Some exercises may appear twice (weighted + bodyweight). This is NORMAL and represents varied training intensities.

**This is REAL workout data** - all numbers are accurate and intentional. Do not question data validity.
</data_interpretation>

<training_volume>
## Weighted Exercises
${weightedSection}

## Bodyweight Exercises
${bodyweightSection}

**Total exercises tracked**: ${volume.length}
</training_volume>

<personal_records>
${noPRs ? "No new personal records this period" : prsSection}
</personal_records>

<workout_frequency>
**This period's training pattern:**
- ${frequency.workoutDays} training days, ${frequency.restDays} rest days
- Average ${frequency.avgSetsPerDay.toFixed(1)} sets per workout
- ${consistencyPct}% training frequency

</workout_frequency>

<instructions>
Provide technical analysis covering:
1. **Volume Distribution**: Assess exercise selection, weighted vs bodyweight balance, potential imbalances
2. **Progress Indicators**: Evaluate PRs and strength trends with specific data points
3. **Recovery & Frequency**: Analyze training frequency, rest patterns, sustainability
4. **Recommendations**: 2-3 specific, actionable adjustments for next period

IMPORTANT CONSTRAINTS:
- Only analyze data from THIS PERIOD (${frequency.workoutDays} training days)
- Do NOT calculate consistency percentages exceeding 100%
- Do NOT extrapolate to timeframes longer than the period covered
- Do NOT report data issues, bugs, or logging errors - focus on training analysis
- Bodyweight exercises show total reps (not weight) - this is CORRECT, not a logging error

Format with markdown headings (##). Be data-driven and technical. Cite specific numbers. 200-400 words maximum.
</instructions>`;
}

/**
 * Few-shot example of desired output quality
 *
 * These examples demonstrate the technical, actionable tone we want from the AI.
 * Not included in production prompts, but useful for testing and quality validation.
 */
export const exampleOutputs = {
  goodExample: `## Training Volume Analysis
Your volume is heavily concentrated in upper body (Bench Press: 4,050 lbs, Overhead Press: 2,100 lbs) with minimal lower body work. This 2:1 upper-to-lower ratio suggests potential imbalance.

## Progress Indicators
Strong weight PR on Bench Press (+10 lbs) indicates progressive overload is working. However, the 7-day gap between your last Squat session and recent PR suggests inconsistent lower body frequency.

## Recovery & Frequency
5 training days with 2 rest days shows good consistency (71%). Average of 12 sets per session is sustainable for most intermediate lifters. Current 7-day streak matches your training frequency well.

## Recommendations
1. **Rebalance volume**: Add 1-2 lower body sessions to match upper body frequency
2. **Maintain current recovery**: 2 rest days per week is appropriate for your volume
3. **Progressive overload**: Continue current progression on Bench - it's working`,

  poorExample: `Great job this week! 🎉 You're crushing it with those PRs! Keep up the amazing work and stay motivated! Your dedication is inspiring. Remember, consistency is key! You've got this! 💪

Looking at your numbers, everything looks good! Just keep doing what you're doing and you'll see results. Stay strong and keep pushing! 🔥`,
};

/**
 * Estimate token count for metrics prompt
 *
 * Rough estimate for cost calculation and rate limiting.
 * Actual tokens will vary based on tiktoken encoding.
 *
 * @param metrics - Metrics to estimate tokens for
 * @returns Approximate input token count (~400 typical)
 */
export function estimateTokenCount(metrics: AnalyticsMetrics): number {
  const prompt = formatMetricsPrompt(metrics);
  // Rough estimate: 1 token ≈ 4 characters
  // System prompt is ~250 tokens, user prompt varies
  const systemTokens = 250;
  const userTokens = Math.ceil(prompt.length / 4);
  return systemTokens + userTokens;
}
