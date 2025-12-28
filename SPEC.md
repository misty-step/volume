# AI Reports 2.0: Structured, Visual, Actionable

## Problem Statement

Current AI reports are walls of markdown text that bury insights. Users want quick answers ("How am I doing?"), visual confirmation of progress, and one specific next action—not paragraphs to parse. The reports feel like reading a textbook when they should feel like talking to a coach.

## Strategic Context

**Priority**: Medium-low. This is competitive parity (Strong/Fitbod already have structured reports), not differentiation. Ship after critical gaps: monetization, offline-first, templates. However, well-executed reports with Brutalist visual treatment could become a brand signature.

## User Persona

### Primary: The Consistent Lifter
- **Context**: Checks reports after workouts or on rest days to assess progress
- **Pain Point**: Current reports require reading 400 words to find 3 useful insights
- **Goal**: Quickly understand "What's working? What should I change?"
- **Success**: Glances at report, gets the picture in 10 seconds, knows ONE next action

## User Stories & Acceptance Criteria

### Story 1: As a lifter, I want key numbers at a glance so I can see my week instantly

**Acceptance Criteria**:
- [ ] Three key metrics displayed as cards: volume, workout count, streak
- [ ] Numbers are prominent, labels are secondary
- [ ] No trend arrows in v1 (just the numbers)

### Story 2: As a lifter, I want PRs celebrated so I feel progress emotionally

**Acceptance Criteria**:
- [ ] PR section is the visual highlight of the report (the "gasp moment")
- [ ] Shows exercise name, new record, and improvement from previous best
- [ ] Shows progression narrative: "185 → 205 → 225 lbs in 3 months"
- [ ] Suggests next milestone: "At this pace, 250 lbs by March"
- [ ] Empty state is motivational: "No PRs this week—but volume is up. PRs often follow."

### Story 3: As a lifter, I want ONE clear action so I know exactly what to do next

**Acceptance Criteria**:
- [ ] Single action, not a list of 2-3 options
- [ ] Directive tone: "Add a leg day Wednesday" not "consider adding"
- [ ] Brief rationale: "Your push volume is 2x your leg volume"
- [ ] No hedging—coaches don't hedge

### Story 4: As a lifter, I want period context so I know what timeframe I'm viewing

**Acceptance Criteria**:
- [ ] Report shows period label: "Dec 16-22, 2024" not just "Weekly"
- [ ] Navigation shows period in context: "Dec 16-22 | 1 of 5 reports"

## Technical Approach: Structured JSON

### Current Flow
```
Metrics → AI Prompt → Markdown String → ReactMarkdown render
```

### New Flow
```
Metrics → AI Prompt → Structured JSON → React Components render
```

### AI Output Schema (v2) — Simplified

```typescript
interface AIReportV2 {
  version: "2.0";

  // Period metadata
  period: {
    type: "weekly";           // v1 is weekly only
    startDate: string;        // "2024-12-16"
    endDate: string;          // "2024-12-22"
    label: string;            // "Dec 16-22, 2024"
  };

  // Section 1: Key Numbers (3 cards)
  metrics: {
    volume: { value: string; unit: string };      // "24,500", "lbs"
    workouts: { value: number };                  // 5
    streak: { value: number };                    // 7
  };

  // Section 2: PR Celebration (the gasp moment)
  pr: {
    hasPR: boolean;
    exercise?: string;                            // "Bench Press"
    type?: "weight" | "reps";                     // "weight"
    value?: string;                               // "225 lbs"
    previousBest?: string;                        // "215 lbs"
    improvement?: string;                         // "+10 lbs"
    progression?: string;                         // "185 → 205 → 225 lbs over 3 months"
    nextMilestone?: string;                       // "At this pace, 250 lbs by March"
    // Empty state message when hasPR: false
    emptyMessage?: string;                        // "No PRs this week—volume up though!"
  };

  // Section 3: ONE Action (not a list)
  action: {
    directive: string;                            // "Add a leg day Wednesday"
    rationale: string;                            // "Push volume is 2x leg volume"
  };
}
```

**What we cut** (per Jobs review):
- ❌ TL;DR bullets with sentiment — copy carries sentiment
- ❌ Trend arrows — ship numbers first, add comparison later
- ❌ Trends section — info belongs in action rationale
- ❌ Multiple actions — ONE clear directive
- ❌ Daily/monthly — weekly only for v1

## UX Flow

### Report Card Component Structure (v1 Simplified)

```
┌─────────────────────────────────────────────┐
│ Dec 16-22, 2024                      Weekly │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 24.5K   │ │    5    │ │    7    │       │
│  │ lbs     │ │workouts │ │  streak │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🏆 BENCH PRESS PR                          │
│                                             │
│     225 lbs                                 │
│     ─────────────────────────────           │
│     185 → 205 → 225 lbs over 3 months       │
│                                             │
│     Previous: 215 lbs (+10 lbs)             │
│     Next milestone: 250 lbs by March        │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ✅ Add a leg day Wednesday.                │
│                                             │
│  Your push volume is 2x your leg volume.    │
│                                             │
└─────────────────────────────────────────────┘
```

**Design notes**:
- PR section is the visual star—largest, most prominent
- Numbers are big; labels are small and muted
- ONE action with rationale, no list
- Period label at top so user knows what they're viewing

### Key Interactions
- Report navigation between historical reports (already exists)
- Remove daily/monthly tabs for v1 (weekly only)

## Success Metrics

| Metric | Current | Target | How Measured |
|--------|---------|--------|--------------|
| Time to insight | ~30s (parse markdown) | <10s (scan cards) | User testing |
| Emotional response | None (informational) | "Gasp moment" on PR | Qualitative |
| Actionability | Generic advice | ONE specific action | Content audit |

## Accessibility Requirements (per UX review)

### Must-Have for v1
- [ ] **PR section uses icon + text**, not just trophy emoji (screen readers)
- [ ] **Loading skeleton** with fixed heights to prevent layout shift
- [ ] **Period labels** clearly visible ("Dec 16-22" not just "Weekly")
- [ ] **Focus states** on any interactive elements
- [ ] **Reduced motion** respected if user prefers

### Empty States
- **No PRs**: "No PRs this week—but volume is up. PRs often follow volume increases."
- **No data**: "Not enough data to generate insights. Log a few workouts first."

## Implementation Components

### New Components Needed
1. `MetricsRow` - Three number cards (volume, workouts, streak)
2. `PRCelebration` - The "gasp moment" celebration card with progression
3. `ActionDirective` - Single action + rationale
4. `AIReportCardV2` - Orchestrates sections, handles version detection

### Prompt Engineering Changes
- Output format: JSON (not markdown)
- Simpler schema = fewer tokens = lower cost
- Validation via Zod; fallback to v1 markdown if parse fails
- Prompt instructs AI to calculate progression narrative and milestone

### Migration Strategy
1. Add `reportVersion` field to aiReports schema
2. New weekly reports generate as v2 JSON in `structuredContent` field
3. Old reports keep `content` field, render with markdown
4. Component detects version and renders appropriately

## Non-Goals (v1)

- **Daily/monthly reports**: Weekly only; expand after validation
- **Trend arrows on metrics**: Ship numbers first
- **Sentiment color coding**: Copy carries sentiment
- **Multiple actions**: ONE directive
- **Chart libraries**: Cards only, no Recharts
- **Shareable PR cards**: Future polish

## Future Enhancements (v2+)

After v1 validates, consider:
- Daily + monthly report types
- Trend comparison (vs last week/month)
- Animated PR celebration (confetti?)
- Shareable social cards for PRs
- Body diagram visualization
- Trend sparklines in metric cards

## Open Questions for Architect

1. **PR progression calculation**: AI generates narrative, or compute from stored PR history?
2. **Milestone projection**: AI guesses "250 lbs by March"—acceptable accuracy?
3. **Zod validation**: Strict (reject bad JSON) or coerce (best-effort parse)?
4. **Token cost**: Simpler schema should reduce output tokens—verify
5. **Backwards compat**: Old reports with markdown still render correctly?
