# Analytics & Insights Reimagining

## Executive Summary

Transform Volume's analytics from informational widgets into actionable intelligence. Replace text-heavy cards with visual body map, consolidate redundant widgets, and rearchitect AI reports from scheduled markdown dumps into contextual, data-grounded insight cards that answer: "How was yesterday?", "What should I focus on today?", and "How's my week going?"

**User Value**: Gym-goers get glanceable, actionable guidance instead of walls of text. Mid-workout: see recovery at a glance. Pre-workout: know what to train. Post-workout: celebrate wins, spot trends.

**Success Criteria**:

- Time-to-insight < 3 seconds (glanceable body map vs reading text)
- AI insights cite specific numbers (no generic "Great job!")
- Actionable recommendations have one-tap execution

---

## User Context

**Primary User**: Self-directed lifter logging sets via Volume
**Problem**: Current analytics are informational but not actionable

- Recovery Dashboard = wall of text cards per muscle group
- Focus Suggestions = separate widget with similar data
- AI Reports = scheduled markdown blobs, often stale by viewing time

**User Workflows** (from your framing):

| Context       | Current                | Gap                          |
| ------------- | ---------------------- | ---------------------------- |
| Pre-workout   | Nothing                | "What should I train today?" |
| Mid-workout   | Ghost set, suggestions | Quick recovery check         |
| Post-workout  | Nothing                | Daily summary, celebration   |
| Weekly review | Markdown AI reports    | Trends, comparisons          |

---

## Requirements

### Functional Requirements

**FR1: Visual Body Map**

- SVG front/back body outline with muscle group heat intensity
- Color gradient: never trained → recovering → ready → overdue
- Tap muscle group → show detail (days since, volume, exercises)
- Replace current RecoveryDashboardWidget entirely

**FR2: Consolidated Training Focus**

- Merge Recovery + Focus Suggestions into single "Training Focus" section
- Body map as primary visual, with contextual recommendations
- "Ready to train" muscle groups highlighted prominently

**FR3: Contextual AI Insight Cards**

- Replace markdown reports with structured insight cards
- Card types: Volume Trend, Recovery Ready, Plateau Detected, Streak Update, Daily Summary
- Each card: headline (specific numbers), context (comparison), one action
- Generate on-demand or near-realtime, not just scheduled

**FR4: "Today's Focus" Recommendation**

- Morning-ready card: "Based on 72hr recovery, try: Chest + Triceps"
- Considers: recovery status, recent volume distribution, user patterns
- Links directly to exercises in that category

**FR5: Daily Summary Generation**

- End-of-day summary (user-triggered or automatic at midnight)
- Includes: total volume, exercises worked, PRs, muscle distribution
- Optional: Gemini-generated shareable graphic (future phase)
- Appears in History page timeline

**FR6: Weekly Synthesis (Improved)**

- Keep scheduled generation but restructure format
- Structured sections: Volume vs Target, PRs Achieved, Training Balance, Focus This Week
- Compare to previous week with specific deltas

### Non-Functional Requirements

**NFR1**: Mobile-first, touch-friendly (body map tappable)
**NFR2**: Dark mode optimized (gym lighting)
**NFR3**: Insights load < 500ms (precompute where possible)
**NFR4**: AI insights cost < $0.01/user/day average

---

## Architecture Decision

### Selected Approach: Insight Cards + Body Map Consolidation

**Rationale**:

- **User Value (40%)**: Glanceable body map beats reading 6 text cards. Insight cards with actions beat passive markdown.
- **Simplicity (30%)**: Consolidating Recovery + Focus into one visual reduces cognitive load and code surface.
- **Explicitness (20%)**: Structured insight cards are type-safe, testable, predictable vs freeform markdown.
- **Risk (10%)**: `react-body-highlighter` is proven library. Insight card format is well-understood pattern.

### Alternatives Considered

| Approach                     | Value | Simplicity | Risk | Why Not                                |
| ---------------------------- | ----- | ---------- | ---- | -------------------------------------- |
| Polish existing widgets      | 2/5   | 5/5        | 1/5  | Doesn't solve text-wall problem        |
| Full dashboard rebuild       | 5/5   | 1/5        | 4/5  | Over-scoped, high risk                 |
| **Body map + insight cards** | 4/5   | 3/5        | 2/5  | **Selected** - best balance            |
| Chat-based AI coach          | 4/5   | 2/5        | 5/5  | Different product direction, premature |

### Module Boundaries

```
Analytics Page (Orchestrator)
├── BodyMapWidget (NEW)
│   ├── Interface: { recoveryData: MuscleRecovery[] }
│   ├── Hides: SVG rendering, heat calculation, touch handling
│   └── Replaces: RecoveryDashboardWidget
│
├── InsightCardsSection (NEW)
│   ├── Interface: { insights: InsightCard[] }
│   ├── Hides: Card prioritization, rendering variants
│   └── Replaces: AIInsightsCard (markdown)
│
├── TodaysFocusCard (NEW)
│   ├── Interface: { readyMuscles: string[], suggestedExercises: Exercise[] }
│   ├── Hides: Recommendation algorithm
│   └── Replaces: FocusSuggestionsWidget
│
├── ProgressiveOverloadWidget (KEEP)
│   └── Improve: Chart interactions, trend indicators
│
├── PRCard (KEEP)
│   └── Improve: Celebration animations, context
│
├── QuickStatsBar (KEEP)
│   └── Improve: Add sparklines, trend arrows
│
└── ActivityHeatmap (KEEP)
    └── No changes needed
```

### Data Model Changes

```typescript
// NEW: Structured insight cards (replaces markdown reports)
insightCards: defineTable({
  userId: v.string(),
  type: v.union(
    v.literal("volume_trend"),
    v.literal("recovery_ready"),
    v.literal("plateau_detected"),
    v.literal("streak_update"),
    v.literal("daily_summary"),
    v.literal("weekly_synthesis")
  ),
  headline: v.string(),        // "Chest volume up 18%"
  context: v.string(),         // "42 sets this week vs 36 last week"
  action: v.optional(v.string()), // "Consider deload next week"
  actionLink: v.optional(v.string()), // "/log?muscle=chest"
  priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
  expiresAt: v.optional(v.number()), // Auto-dismiss stale insights
  generatedAt: v.number(),
  metadata: v.optional(v.object({
    // Type-specific data for rich rendering
    muscleGroups: v.optional(v.array(v.string())),
    exercises: v.optional(v.array(v.string())),
    delta: v.optional(v.number()),
    trend: v.optional(v.union(v.literal("up"), v.literal("down"), v.literal("stable"))),
  })),
})
  .index("by_user", ["userId"])
  .index("by_user_type", ["userId", "type"])
  .index("by_expires", ["expiresAt"]),

// NEW: Daily summaries (for history page)
dailySummaries: defineTable({
  userId: v.string(),
  date: v.string(),           // "2025-12-09" (YYYY-MM-DD)
  totalSets: v.number(),
  totalVolume: v.number(),
  exercisesWorked: v.array(v.string()),
  muscleGroupsHit: v.array(v.string()),
  prsAchieved: v.number(),
  narrative: v.optional(v.string()), // LLM-generated summary
  shareableImageUrl: v.optional(v.string()), // Gemini-generated graphic
  generatedAt: v.number(),
})
  .index("by_user_date", ["userId", "date"]),
```

---

## Implementation Phases

### Phase 1: Body Map + Widget Consolidation (MVP)

- [ ] Add `react-body-highlighter` dependency
- [ ] Create `BodyMapWidget` component (front/back views, heat intensity)
- [ ] Wire to existing `getRecoveryStatus` query
- [ ] Remove `RecoveryDashboardWidget` from analytics page
- [ ] Consolidate `FocusSuggestionsWidget` into "Training Focus" section under body map
- [ ] Test on mobile (touch targets, dark mode)

### Phase 2: Insight Cards Architecture

- [ ] Define `insightCards` schema in Convex
- [ ] Create `InsightCard` component (headline, context, action, priority)
- [ ] Create `InsightCardsSection` with priority ordering
- [ ] Build insight generators:
  - [ ] Volume trend detector (compare this week vs last)
  - [ ] Recovery ready detector (muscle groups at 72hr+)
  - [ ] Streak update (on change)
- [ ] Replace `AIInsightsCard` (markdown) with new card system
- [ ] Add "Today's Focus" card to dashboard homepage

### Phase 3: AI Report Reimagining

- [ ] Update LLM prompt engineering (data-grounded, no generic praise)
- [ ] Restructure weekly report format (structured sections, deltas)
- [ ] Add daily micro-insight generation (lightweight, frequent)
- [ ] Implement "Today's Focus" recommendation algorithm
- [ ] Plateau detection + breakthrough suggestions

### Phase 4: Daily Summaries + History Integration

- [ ] Define `dailySummaries` schema
- [ ] Build daily summary generator (end-of-day aggregation)
- [ ] Add summary cards to History page timeline
- [ ] (Future) Gemini shareable graphic generation

---

## Risks & Mitigation

| Risk                                               | Likelihood | Impact | Mitigation                                                 |
| -------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------- |
| Body map library doesn't support all muscle groups | Medium     | High   | Audit library capabilities upfront, fallback to custom SVG |
| AI insight costs exceed budget                     | Low        | Medium | Precompute where possible, rate limit, use cheaper models  |
| Insight cards feel spammy                          | Medium     | Medium | Priority ordering, dismissible, expiration, max 5 visible  |
| Breaking existing analytics users                  | Low        | High   | Feature flag rollout, A/B test                             |

---

## Key Decisions

### D1: Body Map Library

**Decision**: Use `react-body-highlighter` (giavinh79/react-body-highlighter)
**Alternatives**: Custom SVG, anatomical 3D model
**Rationale**: Proven React library, supports front/back views, polygon selection, good dark mode support. Custom SVG would be weeks of work for marginal benefit.

### D2: Insight Card vs Markdown

**Decision**: Structured insight cards with typed schema
**Alternatives**: Keep markdown with better prompts, hybrid approach
**Rationale**: Type-safe, testable, predictable rendering. Markdown is uncontrolled output that can break UI assumptions. Cards enable one-tap actions.

### D3: AI Prompt Philosophy

**Decision**: Data-grounded, no generic praise, specific numbers always
**Alternatives**: Cheerleader tone, coach personality
**Rationale**: Research shows "Great job!" is AI slop. Users want: "Chest volume up 18% (42 sets vs 36). Consider deload." Direct, evidence-based, actionable.

### D4: Recovery + Focus Consolidation

**Decision**: Merge into single visual section
**Alternatives**: Keep separate, add third widget
**Rationale**: Both widgets show muscle group status with different framings. One body map with "ready/recovering/overdue" covers both use cases with less UI.

---

## Test Scenarios

### Body Map Widget

- [ ] Renders front view with all major muscle groups
- [ ] Renders back view toggle
- [ ] Heat intensity reflects days since training (gray → orange → red)
- [ ] Tap muscle group shows detail popover
- [ ] Handles "never trained" muscle groups gracefully
- [ ] Works in dark mode (contrast sufficient)
- [ ] Touch targets meet 44px minimum

### Insight Cards

- [ ] Cards render with headline, context, action
- [ ] Priority ordering: critical → high → medium → low
- [ ] Maximum 5 cards visible (expandable)
- [ ] Dismissible cards persist dismissal state
- [ ] Expired cards auto-remove
- [ ] Action links navigate correctly

### AI Insights

- [ ] Generated insights cite specific numbers
- [ ] No generic praise phrases ("Great job", "Keep it up")
- [ ] Comparisons include baseline (vs last week, vs personal best)
- [ ] Each insight has exactly one actionable recommendation
- [ ] Token usage within budget

### Daily Summaries

- [ ] Generates for days with logged sets
- [ ] Skips days with no activity
- [ ] Appears in history timeline at correct position
- [ ] Narrative summarizes key stats

---

## Appendix: Insight Card Types

```typescript
// Volume Trend
{
  type: "volume_trend",
  headline: "Chest volume up 18%",
  context: "42 sets this week vs 36 last week",
  action: "Consider deload next week",
  priority: "medium",
  metadata: { muscleGroups: ["Chest"], delta: 18, trend: "up" }
}

// Recovery Ready
{
  type: "recovery_ready",
  headline: "Legs ready to train",
  context: "72hr recovery complete. Last: Dec 6",
  action: "Start leg workout",
  actionLink: "/log?muscle=legs",
  priority: "high",
  metadata: { muscleGroups: ["Quadriceps", "Hamstrings", "Glutes"] }
}

// Plateau Detected
{
  type: "plateau_detected",
  headline: "Bench press stalled 3 weeks",
  context: "185lbs × 8 unchanged. Volume at 12 sets/week.",
  action: "Try: +30% volume spike or add pause reps",
  priority: "high",
  metadata: { exercises: ["Bench Press"], delta: 0 }
}

// Today's Focus
{
  type: "todays_focus",
  headline: "Ready: Chest + Triceps",
  context: "Both 72hr+ recovered, undertrained this week",
  action: "Start workout",
  actionLink: "/log",
  priority: "critical",
  metadata: { muscleGroups: ["Chest", "Triceps"], exercises: ["Bench Press", "Dips", "Overhead Press"] }
}
```

---

## Appendix: LLM Prompt Template

```typescript
const INSIGHT_SYSTEM_PROMPT = `You are a strength coach analyzing workout data.

RULES:
1. Always cite specific numbers (sets, reps, weights, percentages)
2. Compare to baselines (yesterday, last week, personal best)
3. One actionable recommendation per insight
4. Use "you" language, present tense
5. Concise: 1-2 sentences max per field
6. NEVER use: "Great job", "Keep it up", "You're crushing it", "Amazing work"

TONE: Direct, evidence-based, slightly technical. Like a coach reviewing your training log.

FORMAT: Return JSON matching InsightCard schema.

EXAMPLES:
headline: "Chest volume up 18%"
context: "42 sets this week vs 36 last week"
action: "Consider deload next week to optimize recovery"

BAD (generic praise):
headline: "You're doing great!" ❌
context: "Keep training hard!" ❌
action: "Stay motivated!" ❌
`;
```

---

## Expert Review Synthesis

### Jobs Review: Radical Simplicity Challenge

**Key Critique**: Spec adds complexity instead of removing it. Body map should BE the entire analytics page, not a widget within it.

**Accepted Feedback**:

- ✅ **Cut Daily Summaries (Phase 4)** - Users know what they did yesterday
- ✅ **Body map IS the interface** - Not a widget, the whole page
- ✅ **Two-color system** - Gray (don't train) vs Green (train). Not 4 states.
- ✅ **Touch targets 88px** - Thumb-sized for gym use, not 44px minimum
- ✅ **ONE insight maximum** - Not 5 cards, show the most important one
- ✅ **Ship Phase 1 only, then listen** - Don't overbuild

**Deferred/Debated**:

- ⚠️ Insight cards vs no text at all - Keep minimal insight cards but reduce to 1-3
- ⚠️ "Progress Mode" swipe - Good idea but Phase 2 if body map succeeds

**Jobs Verdict**: "Trust the body map. Everything else is noise."

### UX Advocate Review: 23 Issues Identified

**Critical (Must Fix Pre-Launch)**:

- Body map touch targets underspecified → Add FR1.1-1.5 (44-88px targets, haptic feedback)
- Insight dismissal missing undo → Add FR3.3-3.5 (toast with undo, soft delete)
- "Never trained" empty state lacks action → Add FR1.5 (Get Started card)
- Front/Back toggle needs 44px buttons → Add FR1.8-1.10

**High Priority**:

- Body map loading state missing → Add skeleton with "Loading..."
- AI generation error states missing → Add rate limit, timeout, insufficient data states
- Page layout hierarchy unclear → Add wireframe to spec

**Accessibility**:

- Body map needs keyboard navigation → Add FR1.11-1.17
- Dark mode contrast fails WCAG AA → Lighten colors for gym lighting

### Data Integrity Review: 5 Critical Issues

**Must Fix**:

1. **Deduplication for dailySummaries** - Upsert pattern, not insert
2. **Cleanup cron for expired insights** - Prevent unbounded growth
3. **Cascade delete for user deletion** - GDPR compliance
4. **Exercise IDs not names** - Prevent stale references
5. **Validate delta against Infinity/NaN** - Edge case in first-week users

**Missing Indexes**:

- Add `by_user_priority` for priority filtering
- Add `by_user_generated` for recency sorting

---

## Revised Scope (Post-Review)

### Phase 1: Body Map as Primary Interface (MVP)

**Dramatically Simplified**:

- Full-screen body map replaces entire analytics section
- **Two-color system**: Gray (recovering/never) vs Safety Orange (ready to train)
- Tap muscle → minimal popover: days since, last weight×reps, "Train Now" button
- 88px touch targets for major muscle groups
- Front/Back toggle: 44px buttons, top-right
- Loading skeleton preserves layout
- "Never trained" empty state with action

**Remove from MVP**:

- ~~FocusSuggestionsWidget~~ (merged into body map)
- ~~RecoveryDashboardWidget~~ (replaced by body map)
- ~~InsightCardsSection~~ (defer to Phase 2)
- ~~Daily Summaries~~ (cut entirely)

**Keep**:

- QuickStatsBar (streak, PRs) - above body map
- ActivityHeatmap - below body map
- ProgressiveOverloadWidget - below heatmap
- PRCard - at bottom

### Phase 2: Single Insight Card (If Phase 1 Succeeds)

**Minimal insight system**:

- Show ONE insight card, the most important
- Types: "Today's Focus", "Plateau Detected", "Volume Trend"
- Priority: critical only, hide medium/low
- Dismissible with undo toast
- Generate on page load, cache aggressively

### Phase 3: AI Improvements (Deferred)

- Better prompt engineering
- Plateau detection
- Weekly synthesis

---

## Updated Data Model

```typescript
// REVISED: Simpler insight cards
insightCards: defineTable({
  userId: v.string(),
  type: v.union(
    v.literal("todays_focus"),
    v.literal("plateau_detected"),
    v.literal("volume_trend")
  ),
  headline: v.string(),
  context: v.string(),
  action: v.optional(v.string()),
  actionLink: v.optional(v.string()),
  priority: v.union(v.literal("critical"), v.literal("high")), // Removed medium/low
  dismissed: v.optional(v.boolean()), // Soft delete for undo
  expiresAt: v.number(), // Required, not optional
  generatedAt: v.number(),
  metadata: v.optional(v.object({
    muscleGroups: v.optional(v.array(v.string())),
    exerciseIds: v.optional(v.array(v.id("exercises"))), // IDs not names
    delta: v.optional(v.number()),
    trend: v.optional(v.union(v.literal("up"), v.literal("down"), v.literal("stable"))),
  })),
})
  .index("by_user", ["userId"])
  .index("by_user_priority", ["userId", "priority"])
  .index("by_user_generated", ["userId", "generatedAt"])
  .index("by_expires", ["expiresAt"]),

// REMOVED: dailySummaries table (per Jobs review)
```

---

## Updated Implementation Checklist

### Phase 1: Body Map MVP

**Setup**:

- [ ] Add `react-body-highlighter` dependency
- [ ] Audit library: does it support all 12 major muscle groups?

**Body Map Component**:

- [ ] Full-width body map (front view default)
- [ ] Two-color heat system: gray vs safety-orange
- [ ] 88px touch targets for major groups, 60px for smaller
- [ ] Haptic feedback on tap (navigator.vibrate)
- [ ] Front/Back toggle: 44px buttons, top-right
- [ ] Tap → popover: muscle name, days since, last set, "Train Now" button

**Accessibility**:

- [ ] Keyboard navigation (Tab through muscles)
- [ ] Screen reader announcements (aria-live)
- [ ] Dark mode contrast ≥4.5:1 (lighten safety-orange)

**Empty States**:

- [ ] "Never trained" → "Get Started" card with suggested first workout
- [ ] Loading → skeleton with body outline + spinner

**Integration**:

- [ ] Replace RecoveryDashboardWidget
- [ ] Replace FocusSuggestionsWidget
- [ ] Wire to existing `getRecoveryStatus` query

**Test on Device**:

- [ ] iPhone 14 Pro in gym lighting (dim, overhead)
- [ ] Sweaty finger taps register correctly
- [ ] Body map readable at arm's length

### Phase 2: Single Insight Card (Gate: Phase 1 succeeds)

- [ ] Schema migration: add insightCards table
- [ ] Insight generator: "Today's Focus" based on recovery
- [ ] Single card component (headline, context, action)
- [ ] Dismissal with 5s undo toast
- [ ] Cleanup cron for expired insights

---

## Success Metrics (Phase 1)

| Metric                | Target                   | Measurement                                   |
| --------------------- | ------------------------ | --------------------------------------------- |
| Time-to-understanding | <3s                      | User testing: "What muscle should you train?" |
| Tap success rate      | >95%                     | Analytics: taps that open popover vs mis-taps |
| Body map usage        | >50% of analytics visits | Vercel Analytics event                        |
| User satisfaction     | Qualitative              | "Does this help you decide what to train?"    |

**Decision Point**: If Phase 1 metrics met after 2 weeks, proceed to Phase 2. Otherwise, iterate on body map.
