# DESIGN.md — AI Reports 2.0 Architecture

## Product Context (from SPEC.md)

**Problem**: Current AI reports are walls of markdown that bury insights. Users want 10-second scannability, visual celebration of PRs, and ONE clear action.

**Users**: Consistent lifters checking reports after workouts or on rest days.

**Core Stories**:
1. Key numbers at a glance (volume, workouts, streak)
2. PRs celebrated as the "gasp moment" (progression narrative, next milestone)
3. ONE clear action with rationale
4. Period context ("Dec 16-22" not just "Weekly")

**Success Metrics**: Time to insight <10s, emotional response on PR, ONE specific action.

**Non-Goals (v1)**: Daily/monthly reports, trend arrows, multiple actions, chart libraries.

---

## Architecture Overview

**Selected Approach**: Hybrid Compute + AI

**Rationale**: Backend computes reliable metrics and PR history (data we already have). AI generates only the creative elements: PR celebration copy, action directive. This maximizes data accuracy while preserving the "coach voice."

**Core Modules**:
- `convex/ai/reportV2Schema.ts`: Zod schema for structured AI output + validation
- `convex/ai/generateV2.ts`: Orchestration - compute metrics, call AI, merge, store
- `convex/ai/promptsV2.ts`: Slimmer prompt for AI (just celebration + action)
- `src/components/analytics/report-v2/`: React components for structured rendering

**Data Flow**:
```
User Request → Backend computes metrics + PR history
            → AI generates celebration copy + action (structured JSON)
            → Merge computed + AI data
            → Store in aiReports (with reportVersion: "2.0")
            → Frontend detects version → Render structured components
```

**Key Design Decisions**:
1. **Compute metrics server-side**: Period dates, volume, workouts, streak come from existing `metricsSnapshot` — no AI needed
2. **Compute PR progression server-side**: Query progressive overload history, format into "185 → 205 → 225 lbs" — deterministic
3. **AI generates only creative content**: PR celebration message, next milestone projection, action directive + rationale
4. **OpenAI Structured Outputs**: Use `response_format: { type: "json_schema" }` with strict mode for 100% schema compliance
5. **Zod for validation**: `zodResponseFormat` helper for type-safe parsing + fallback handling

---

## Alternative Architectures Considered

### Alternative A: AI-Only Structured Output
AI generates entire `AIReportV2` JSON including metrics, PR history, progression narrative.

**Pros**: Simple implementation, one AI call does everything
**Cons**:
- AI may hallucinate PR history (we have actual data)
- Larger prompt = more tokens = higher cost
- Metrics computed twice (once for prompt, once in output)

**Ousterhout Analysis**: Information duplication — metrics exist in prompt AND output. AI doing work we can do deterministically.

**Verdict**: Rejected — unnecessary AI work, data accuracy risk

### Alternative B: Hybrid Compute + AI ✅ SELECTED
Backend computes metrics + PR history. AI generates only celebration copy + action.

**Pros**:
- Reliable metrics (computed, not generated)
- Smaller AI scope = fewer tokens = lower cost (~40% reduction)
- PR progression comes from actual history (not AI hallucination)
- Simpler schema for AI to fill

**Cons**:
- Two-step process (compute → AI → merge)
- Slightly more backend code

**Ousterhout Analysis**: Deep module — simple interface (one function call), complex implementation hidden (metrics + AI + merge).

**Verdict**: Selected — best balance of reliability, cost, and coach voice

### Alternative C: Backend-Only (No AI for v2)
Backend computes everything including rule-based action selection.

**Pros**: Cheapest, fastest, most reliable, no AI cost
**Cons**:
- Actions become formulaic ("Add leg day" rules)
- Loses "coach voice" and contextual wisdom
- PR celebration messages repetitive

**Ousterhout Analysis**: Shallow module — all logic visible, no AI intelligence hidden.

**Verdict**: Rejected — loses the value of AI coaching

---

## Module Design

### Module: `convex/ai/reportV2Schema.ts`

**Responsibility**: Define and validate the v2 report structure. Single source of truth for types.

**Public Interface**:
```typescript
import { z } from "zod";

// Schema for AI-generated creative content only
export const AICreativeOutputSchema = z.object({
  prCelebration: z.object({
    headline: z.string(),          // "BENCH PRESS PR!"
    celebrationCopy: z.string(),   // "You've been building to this..."
    nextMilestone: z.string(),     // "At this pace, 250 lbs by March"
  }).optional(),  // Optional when no PR

  prEmptyMessage: z.string().optional(), // "No PRs this week—volume is up though!"

  action: z.object({
    directive: z.string(),         // "Add a leg day Wednesday"
    rationale: z.string(),         // "Your push volume is 2x your leg volume"
  }),
});

// Full report structure (computed + AI merged)
export const AIReportV2Schema = z.object({
  version: z.literal("2.0"),

  period: z.object({
    type: z.literal("weekly"),
    startDate: z.string(),         // "2024-12-16"
    endDate: z.string(),           // "2024-12-22"
    label: z.string(),             // "Dec 16-22, 2024"
  }),

  metrics: z.object({
    volume: z.object({
      value: z.string(),           // "24,500"
      unit: z.string(),            // "lbs"
    }),
    workouts: z.object({ value: z.number() }),
    streak: z.object({ value: z.number() }),
  }),

  pr: z.object({
    hasPR: z.boolean(),
    exercise: z.string().optional(),
    type: z.enum(["weight", "reps"]).optional(),
    value: z.string().optional(),           // "225 lbs"
    previousBest: z.string().optional(),    // "215 lbs"
    improvement: z.string().optional(),     // "+10 lbs"
    progression: z.string().optional(),     // "185 → 205 → 225 lbs"
    headline: z.string().optional(),        // AI: "BENCH PRESS PR!"
    celebrationCopy: z.string().optional(), // AI: "You've been building..."
    nextMilestone: z.string().optional(),   // AI: "250 lbs by March"
    emptyMessage: z.string().optional(),    // AI: "No PRs this week..."
  }),

  action: z.object({
    directive: z.string(),
    rationale: z.string(),
  }),
});

export type AICreativeOutput = z.infer<typeof AICreativeOutputSchema>;
export type AIReportV2 = z.infer<typeof AIReportV2Schema>;
```

**Dependencies**:
- Requires: `zod`
- Used by: `generateV2.ts`, `openai.ts`, frontend components

---

### Module: `convex/ai/generateV2.ts`

**Responsibility**: Orchestrate v2 report generation. Compute metrics, call AI, merge, store.

**Public Interface**:
```typescript
import { internalAction } from "../_generated/server";

/**
 * Generate v2 structured report
 *
 * 1. Compute period, metrics, PR data from database
 * 2. Call AI for creative content (celebration + action)
 * 3. Merge computed + AI data
 * 4. Store with reportVersion: "2.0"
 */
export const generateReportV2 = internalAction({
  args: {
    userId: v.string(),
    weekStartDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ReportId> => { ... }
});
```

**Internal Implementation** (pseudocode):
```pseudocode
function generateReportV2(userId, weekStartDate):
  1. Calculate period bounds
     weekStart = weekStartDate ?? getWeekStartDate()
     weekEnd = weekStart + 7 days

  2. Check for existing report (deduplication)
     existing = query checkExistingReport(userId, "weekly", weekStart, version="2.0")
     if existing: return existing.id

  3. Fetch workout data
     { volumeData, exercises, allSets } = query getWorkoutData(userId, weekStart, weekEnd)

  4. Compute metrics (server-side, no AI)
     period = {
       type: "weekly",
       startDate: formatDate(weekStart),
       endDate: formatDate(weekEnd),
       label: formatPeriodLabel(weekStart, weekEnd)  // "Dec 16-22, 2024"
     }

     metrics = {
       volume: { value: formatNumber(totalVolume), unit: "lbs" },
       workouts: { value: countWorkoutDays(volumeData) },
       streak: { value: calculateCurrentStreak(allSets) }
     }

  5. Compute PR data (server-side, from actual history)
     topPR = getTopPRForPeriod(userId, weekStart, weekEnd)

     if topPR:
       prHistory = getExerciseProgression(topPR.exerciseId, limit=5)
       progression = formatProgression(prHistory)  // "185 → 205 → 225 lbs"

       pr = {
         hasPR: true,
         exercise: topPR.exerciseName,
         type: topPR.prType,
         value: formatValue(topPR.currentValue, topPR.prType),
         previousBest: formatValue(topPR.previousValue, topPR.prType),
         improvement: formatImprovement(topPR),
         progression: progression
       }
     else:
       pr = { hasPR: false }

  6. Prepare context for AI (minimal — just what AI needs to be creative)
     aiContext = {
       hasPR: pr.hasPR,
       exerciseName: pr.exercise,
       prType: pr.type,
       value: pr.value,
       improvement: pr.improvement,
       progression: pr.progression,
       volumeTrend: calculateVolumeTrend(userId),
       muscleBalance: calculateMuscleBalance(userId),
       workoutFrequency: metrics.workouts.value
     }

  7. Call AI for creative content only
     aiOutput = await generateCreativeContent(aiContext)
     // Returns: { prCelebration?, prEmptyMessage?, action }

  8. Merge computed + AI data
     report = {
       version: "2.0",
       period,
       metrics,
       pr: {
         ...pr,
         headline: aiOutput.prCelebration?.headline,
         celebrationCopy: aiOutput.prCelebration?.celebrationCopy,
         nextMilestone: aiOutput.prCelebration?.nextMilestone,
         emptyMessage: aiOutput.prEmptyMessage
       },
       action: aiOutput.action
     }

  9. Store report
     reportId = mutation saveReportV2({
       userId,
       reportType: "weekly",
       weekStartDate: weekStart,
       structuredContent: report,  // JSON, not markdown
       reportVersion: "2.0",
       model: aiOutput.model,
       tokenUsage: aiOutput.tokenUsage
     })

  10. Return report ID
      return reportId
```

**Dependencies**:
- Requires: `data.ts` (queries), `openai.ts` (AI call), `reportV2Schema.ts`
- Used by: Cron jobs, on-demand generation API

**Error Handling**:
- AI returns invalid JSON → Log error, fallback to v1 markdown generation
- AI timeout → Retry with exponential backoff (existing pattern)
- Missing PR history → Set `progression` to undefined (AI adapts)

---

### Module: `convex/ai/promptsV2.ts`

**Responsibility**: Slimmer prompt that only asks AI for creative content.

**Public Interface**:
```typescript
export const systemPromptV2: string;
export function formatCreativePrompt(context: AIContext): string;
```

**System Prompt** (condensed):
```typescript
export const systemPromptV2 = `You are a strength coach generating workout insights.

OUTPUT STRICT JSON matching this schema:
{
  "prCelebration": {           // Include ONLY if hasPR is true
    "headline": "string",      // e.g., "BENCH PRESS PR!"
    "celebrationCopy": "string", // 1-2 sentences, encouraging, specific
    "nextMilestone": "string"  // Projection based on progression data
  },
  "prEmptyMessage": "string",  // Include ONLY if hasPR is false
  "action": {
    "directive": "string",     // Single imperative sentence
    "rationale": "string"      // One sentence explaining why
  }
}

RULES:
- Directive tone: "Add a leg day" not "consider adding"
- No hedging, no "might want to", no multiple options
- ONE action only
- If no PR, give motivational empty message
- Next milestone: project from progression data, be specific
- All text concise: 1-2 sentences max per field
`;
```

**User Prompt Format**:
```typescript
export function formatCreativePrompt(context: AIContext): string {
  return `
<context>
hasPR: ${context.hasPR}
${context.hasPR ? `
exerciseName: ${context.exerciseName}
prType: ${context.prType}
value: ${context.value}
improvement: ${context.improvement}
progression: ${context.progression}
` : ''}
volumeTrend: ${context.volumeTrend}
muscleBalance: ${context.muscleBalance}
workoutFrequency: ${context.workoutFrequency} days this week
</context>

Generate celebration/message and action.
`;
}
```

**Token Estimate**: ~150 input tokens (vs ~400 for v1) = ~60% reduction

---

### Module: `convex/ai/openaiV2.ts`

**Responsibility**: Call OpenAI with Structured Outputs for guaranteed JSON compliance.

**Public Interface**:
```typescript
export async function generateCreativeContent(
  context: AIContext
): Promise<AICreativeResult>;
```

**Internal Implementation**:
```typescript
import { zodResponseFormat } from "openai/helpers/zod";
import { AICreativeOutputSchema } from "./reportV2Schema";

export async function generateCreativeContent(
  context: AIContext
): Promise<AICreativeResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemPromptV2 },
      { role: "user", content: formatCreativePrompt(context) },
    ],
    // Structured Outputs: 100% schema compliance
    response_format: zodResponseFormat(AICreativeOutputSchema, "creative_content"),
    max_completion_tokens: 500,  // Much smaller than v1
    reasoning_effort: "low",     // Simple creative task
  });

  // Handle refusal (safety content)
  const message = completion.choices[0].message;
  if (message.refusal) {
    console.error("[OpenAI] Refusal:", message.refusal);
    return fallbackCreativeContent(context);
  }

  // Zod-validated parsed response
  const parsed = message.parsed;  // Already typed as AICreativeOutput

  return {
    ...parsed,
    model: "gpt-5-mini",
    tokenUsage: {
      input: completion.usage?.prompt_tokens ?? 0,
      output: completion.usage?.completion_tokens ?? 0,
      costUSD: calculateCost(completion.usage),
    },
  };
}

// Fallback for edge cases
function fallbackCreativeContent(context: AIContext): AICreativeResult {
  return {
    prEmptyMessage: context.hasPR
      ? undefined
      : "Keep training—PRs come from consistent effort.",
    action: {
      directive: "Keep up your current routine.",
      rationale: "Your training is progressing well.",
    },
    model: "fallback",
    tokenUsage: { input: 0, output: 0, costUSD: 0 },
  };
}
```

---

### Module: `src/components/analytics/report-v2/`

**Responsibility**: Render structured v2 reports with visual components.

**File Organization**:
```
src/components/analytics/report-v2/
  index.ts                 # Barrel export
  AIReportCardV2.tsx       # Main orchestrator, version detection
  MetricsRow.tsx           # Three number cards
  PRCelebration.tsx        # The "gasp moment" card
  ActionDirective.tsx      # Single action + rationale
  ReportSkeleton.tsx       # Loading state with fixed heights
  types.ts                 # Frontend types (mirrors Zod schema)
```

#### Component: `AIReportCardV2.tsx`

**Responsibility**: Version detection + orchestration.

```tsx
interface Props {
  report: Doc<"aiReports">;
}

export function AIReportCardV2({ report }: Props) {
  // Version detection
  const isV2 = report.reportVersion === "2.0" && report.structuredContent;

  if (!isV2) {
    // Fallback to v1 markdown renderer
    return <AIInsightsCard report={report} />;
  }

  const data = report.structuredContent as AIReportV2;

  return (
    <Card>
      {/* Period Header */}
      <CardHeader>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">{data.period.label}</span>
          <Badge variant="outline">Weekly</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Section 1: Metrics */}
        <MetricsRow
          volume={data.metrics.volume}
          workouts={data.metrics.workouts}
          streak={data.metrics.streak}
        />

        {/* Section 2: PR Celebration */}
        <PRCelebration pr={data.pr} />

        {/* Section 3: Action */}
        <ActionDirective action={data.action} />
      </CardContent>
    </Card>
  );
}
```

#### Component: `MetricsRow.tsx`

**Responsibility**: Three big numbers in a row.

```tsx
interface Props {
  volume: { value: string; unit: string };
  workouts: { value: number };
  streak: { value: number };
}

export function MetricsRow({ volume, workouts, streak }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        value={volume.value}
        label={volume.unit}
        aria-label={`Total volume: ${volume.value} ${volume.unit}`}
      />
      <MetricCard
        value={workouts.value.toString()}
        label="workouts"
        aria-label={`${workouts.value} workouts`}
      />
      <MetricCard
        value={streak.value.toString()}
        label="day streak"
        aria-label={`${streak.value} day streak`}
      />
    </div>
  );
}

function MetricCard({ value, label, ...props }: MetricCardProps) {
  return (
    <div
      className="text-center p-4 bg-muted/30 border-2 border-border"
      {...props}
    >
      <div className="text-3xl font-bold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
```

#### Component: `PRCelebration.tsx`

**Responsibility**: The "gasp moment" — visual highlight of the report.

```tsx
interface Props {
  pr: AIReportV2["pr"];
}

export function PRCelebration({ pr }: Props) {
  // Empty state
  if (!pr.hasPR) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm">{pr.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-safety-orange/10 border-2 border-safety-orange p-6">
      {/* Headline with icon */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-safety-orange" aria-hidden="true" />
        <span className="sr-only">Personal Record:</span>
        <h3 className="text-xl font-bold uppercase tracking-wide">
          {pr.headline}
        </h3>
      </div>

      {/* Big number */}
      <div className="text-4xl font-bold font-mono mb-2">
        {pr.value}
      </div>

      {/* Progression narrative */}
      {pr.progression && (
        <div className="text-sm text-muted-foreground mb-4 font-mono">
          {pr.progression}
        </div>
      )}

      {/* Previous + improvement */}
      <div className="text-sm mb-4">
        <span className="text-muted-foreground">Previous: </span>
        <span>{pr.previousBest}</span>
        <span className="text-green-500 ml-2">({pr.improvement})</span>
      </div>

      {/* AI celebration copy */}
      {pr.celebrationCopy && (
        <p className="text-sm italic mb-2">{pr.celebrationCopy}</p>
      )}

      {/* Next milestone */}
      {pr.nextMilestone && (
        <p className="text-sm font-medium text-safety-orange">
          {pr.nextMilestone}
        </p>
      )}
    </div>
  );
}
```

#### Component: `ActionDirective.tsx`

**Responsibility**: ONE action with rationale.

```tsx
interface Props {
  action: { directive: string; rationale: string };
}

export function ActionDirective({ action }: Props) {
  return (
    <div className="flex items-start gap-3 p-4 bg-muted/30 border-2 border-border">
      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">{action.directive}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {action.rationale}
        </p>
      </div>
    </div>
  );
}
```

---

## Schema Changes

### `convex/schema.ts` Updates

```typescript
aiReports: defineTable({
  userId: v.string(),
  reportType: v.optional(v.union(...)),
  weekStartDate: v.number(),
  generatedAt: v.number(),

  // V1: Markdown content
  content: v.optional(v.string()),  // Now optional for v2

  // V2: Structured JSON content
  structuredContent: v.optional(v.any()),  // AIReportV2 JSON
  reportVersion: v.optional(v.string()),   // "1.0" or "2.0"

  // Preserved from v1
  metricsSnapshot: v.object({ ... }),
  model: v.string(),
  tokenUsage: v.object({ ... }),
})
```

**Migration Strategy**:
1. Add optional `structuredContent` and `reportVersion` fields
2. New reports get `reportVersion: "2.0"` + `structuredContent`
3. Old reports have `content` (markdown), no `reportVersion` → render as v1
4. Frontend checks `reportVersion` to pick renderer

---

## Testing Strategy

### Backend Tests (`convex/ai/generateV2.test.ts`)

```typescript
describe("generateReportV2", () => {
  // Unit tests with mocked OpenAI
  test("computes period dates correctly", async () => {});
  test("computes metrics from workout data", async () => {});
  test("computes PR progression from history", async () => {});
  test("merges AI output with computed data", async () => {});

  // AI output validation
  test("validates AI response against schema", async () => {});
  test("falls back gracefully on invalid AI output", async () => {});
  test("handles AI refusal", async () => {});

  // Integration
  test("stores report with version 2.0", async () => {});
  test("deduplicates existing v2 reports", async () => {});
});
```

### Component Tests (`src/components/analytics/report-v2/*.test.tsx`)

```typescript
describe("AIReportCardV2", () => {
  test("renders v1 report with markdown renderer", () => {});
  test("renders v2 report with structured components", () => {});
});

describe("PRCelebration", () => {
  test("renders PR with all fields", () => {});
  test("renders empty state when no PR", () => {});
  test("has accessible trophy icon", () => {});
});

describe("MetricsRow", () => {
  test("renders three metrics", () => {});
  test("has aria-labels for screen readers", () => {});
});
```

### Mocking Strategy
- Mock OpenAI SDK in unit tests (existing pattern)
- Use Zod schema to generate valid mock AI responses
- Real integration tests hit OpenAI (rate-limited, CI-only)

---

## Performance Considerations

**Token Cost Reduction**:
- v1 prompt: ~400 tokens input, ~300 output = ~$0.003/report
- v2 prompt: ~150 tokens input, ~100 output = ~$0.001/report
- **~65% cost reduction**

**Latency**:
- v1: One AI call (~2-3s)
- v2: Metrics compute (~10ms) + One AI call (~1-2s) + Merge (~1ms)
- **Similar or slightly faster** (smaller prompt = faster completion)

**Caching**:
- Metrics could be cached, but deduplication already prevents regeneration
- No additional caching needed for v1

---

## Security Considerations

- AI output validated via Zod (no injection through malformed JSON)
- No user-supplied content passed directly to AI (only computed metrics)
- Existing auth checks preserved (userId verification)

---

## Open Questions Resolved

1. **PR progression calculation**: Server-side from existing `calculateProgressiveOverload` pattern. AI does NOT generate progression data — just creative copy about it.

2. **Milestone projection**: AI generates based on progression context. Acceptable accuracy — it's aspirational, not a guarantee.

3. **Zod validation**: Strict via OpenAI Structured Outputs (`strict: true`). Fallback to rule-based content if parse fails.

4. **Token cost**: ~65% reduction due to smaller prompt (metrics computed, not described).

5. **Backwards compat**: `reportVersion` field + frontend version detection. Old reports render unchanged.

---

## Implementation Order

1. **Schema + Types** (1h)
   - Add `structuredContent`, `reportVersion` to schema
   - Create `reportV2Schema.ts` with Zod schemas

2. **Backend Compute** (2h)
   - Helper functions for period formatting
   - PR progression calculation from history
   - Muscle balance calculation for action context

3. **AI Integration** (2h)
   - `promptsV2.ts` with slimmer prompts
   - `openaiV2.ts` with Structured Outputs
   - `generateV2.ts` orchestration

4. **Frontend Components** (3h)
   - `MetricsRow`, `PRCelebration`, `ActionDirective`
   - `AIReportCardV2` with version detection
   - `ReportSkeleton` for loading state

5. **Integration + Testing** (2h)
   - Wire up to report navigator
   - Backend tests with mocked AI
   - Component tests

**Total estimate**: ~10h implementation

---

## File Changes Summary

**New Files**:
- `convex/ai/reportV2Schema.ts`
- `convex/ai/generateV2.ts`
- `convex/ai/promptsV2.ts`
- `convex/ai/openaiV2.ts`
- `src/components/analytics/report-v2/index.ts`
- `src/components/analytics/report-v2/AIReportCardV2.tsx`
- `src/components/analytics/report-v2/MetricsRow.tsx`
- `src/components/analytics/report-v2/PRCelebration.tsx`
- `src/components/analytics/report-v2/ActionDirective.tsx`
- `src/components/analytics/report-v2/ReportSkeleton.tsx`
- `src/components/analytics/report-v2/types.ts`

**Modified Files**:
- `convex/schema.ts` — Add `structuredContent`, `reportVersion`
- `convex/ai/data.ts` — Add `saveReportV2` mutation
- `src/components/analytics/report-navigator.tsx` — Use `AIReportCardV2`

**Preserved Files** (v1 unchanged):
- `convex/ai/generate.ts`
- `convex/ai/openai.ts`
- `convex/ai/prompts.ts`
- `src/components/analytics/ai-insights-card.tsx`
