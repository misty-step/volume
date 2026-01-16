# AI Report Generation Flow

How workout analysis reports are generated, cached, and displayed.

## Report Types

| Type | Period | Schedule |
|------|--------|----------|
| `daily` | Last 24 hours | On-demand |
| `weekly` | Monday-Sunday | Cron + on-demand |
| `monthly` | Calendar month | Cron |

## Generation Flow

```mermaid
stateDiagram-v2
    [*] --> check_existing: Request report

    check_existing --> return_cached: Report exists
    check_existing --> fetch_data: No existing report

    fetch_data --> aggregate: Workout data fetched
    aggregate --> call_openai: Metrics computed
    call_openai --> save_report: AI response received
    save_report --> return_new: Report stored

    return_cached --> [*]
    return_new --> [*]
```

## Deduplication

Reports are keyed by `(userId, reportType, weekStartDate)`:

```typescript
const existingReportId = await ctx.runQuery(
  internal.ai.data.checkExistingReport,
  { userId, reportType, weekStartDate }
);

if (existingReportId) {
  return existingReportId; // Return cached
}
```

## Data Pipeline

```mermaid
flowchart LR
    A[sets table] --> B[Filter by date range]
    B --> C[Aggregate volume by exercise]
    B --> D[Calculate PRs]
    B --> E[Compute streaks]
    C & D & E --> F[Build AnalyticsMetrics]
    F --> G[OpenAI API]
    G --> H[Store in aiReports]
```

## Report Navigator UI States

```mermaid
stateDiagram-v2
    [*] --> loading: Component mounts

    loading --> no_reports: No reports for type
    loading --> show_report: Reports exist

    show_report --> show_report: Navigate prev/next
    show_report --> show_report: Change report type

    no_reports --> [*]: Show empty state
```

## Cron Schedule

From `/convex/crons.ts`:

- Weekly reports: Triggered via cron for subscribed users
- Report generation is idempotent (deduplication prevents duplicates)

## Report Versions

| Version | Content Field | Renderer |
|---------|--------------|----------|
| `1.0` (default) | `content` (markdown) | `AIInsightsCard` |
| `2.0` | `structuredContent` (JSON) | `AIReportCardV2` |

## Files

- `/convex/ai/generate.ts` - Report generation action
- `/convex/ai/generateV2.ts` - V2 structured reports
- `/convex/ai/data.ts` - Data fetching queries
- `/convex/ai/openai.ts` - OpenAI API wrapper
- `/src/components/analytics/report-navigator.tsx` - UI navigation
- `/src/components/analytics/ai-insights-card.tsx` - V1 renderer
- `/src/components/analytics/report-v2/` - V2 renderer
