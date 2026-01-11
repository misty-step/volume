# src/hooks

Custom React hooks for the Volume app. Each hook encapsulates a specific concern.

## Data Fetching

| Hook | Purpose |
|------|---------|
| `useLastSet` | Fetches most recent set + history for an exercise. Server-side filtered. |
| `useExerciseCardData` | Complete analytics for exercise cards: sessions, deltas, PRs, sparklines. |
| `useDayPagedHistory` | Paginated workout history grouped by day with totals. |

## Form State

| Hook | Purpose |
|------|---------|
| `useQuickLogForm` | Form state for logging sets. Handles validation, PR detection, celebrations. |

## Environment

| Hook | Purpose |
|------|---------|
| `useMobileViewport` | Responsive breakpoint detection. SSR-safe. |
| `useTimezoneSync` | Syncs browser timezone to backend on mount. Auth-aware. |

## Testing

Hooks with business logic have `.test.ts` files. Type tests use `.test-d.ts`.

Run tests: `pnpm test src/hooks`
