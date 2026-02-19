# src/components/dashboard

Main workout tracking interface. This is the app's primary screen.

## Entry Point

`Dashboard.tsx` - Orchestrates the home page. Shows today's workout with exercise groups, set logging form, and daily totals.

## Component Hierarchy

```
Dashboard
├── DailyTotalsBanner       # Summary stats for today
├── QuickLogForm            # Log reps/weight (imperative handle)
├── GroupedSetHistory       # Today's sets grouped by exercise
│   └── ExerciseSetGroup    # Single exercise with expandable sets
│       ├── PRBadge         # Personal record indicators
│       └── SessionDelta    # Trend arrows vs previous session
└── FirstRunExperience      # Onboarding for new users
```

## Key Components

| Component                      | Responsibility                                             |
| ------------------------------ | ---------------------------------------------------------- |
| `quick-log-form.tsx`           | Form state, validation, PR detection, celebratory feedback |
| `exercise-set-group.tsx`       | Expandable exercise card with repeat/delete actions        |
| `exercise-selector-dialog.tsx` | Modal for choosing exercise (mobile-friendly)              |
| `ghost-set-display.tsx`        | Suggestion UI for progressive overload                     |
| `duration-input.tsx`           | Time-based exercise input (mm:ss)                          |

## Subdirectory

### workout-context-carousel/

Charts and detail panels for expanded exercise view.

- `data-block.tsx` - Key metrics display
- `bar-chart.tsx` - Volume visualization
- `details-section.tsx` - Session breakdown

## Data Flow

1. `Dashboard` fetches today's sets + all exercises via Convex
2. Sets grouped by exercise using `exercise-grouping.ts`
3. `ExerciseSetGroup` uses `useExerciseCardData` hook for PR/delta enrichment
4. `QuickLogForm` uses `useQuickLogForm` hook for form state

## Testing

```bash
bun run test src/components/dashboard
```
