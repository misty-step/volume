# src/lib

Pure functions and utilities. No React dependencies (except `brutalist-motion.ts` which exports Framer Motion variants).

## Domain Logic

| File                         | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| `pr-detection.ts`            | Real-time PR detection (weight/reps/volume)           |
| `historical-pr-detection.ts` | Retroactive PR analysis for history views             |
| `set-suggestion-engine.ts`   | Progressive overload suggestions (double progression) |
| `exercise-insights.ts`       | Session grouping, deltas, sparkline data              |
| `exercise-grouping.ts`       | Group exercises by muscle/category                    |
| `exercise-metrics.ts`        | Exercise-level aggregations                           |
| `exercise-sorting.ts`        | Sort exercises by recency/name                        |
| `streak-calculator.ts`       | Workout streak detection                              |
| `stats-calculator.ts`        | User stats (total volume, PRs, etc.)                  |

## Date & Units

| File                 | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `date-utils.ts`      | Relative time, date math, timezone handling     |
| `date-formatters.ts` | Display formatting ("Today", "Yesterday", etc.) |
| `weight-utils.ts`    | lbs/kg conversion, normalization                |
| `number-utils.ts`    | Numeric formatting                              |

## Observability

| File                 | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `analytics.ts`       | Event tracking, user context (Vercel Analytics + Sentry) |
| `analytics-utils.ts` | Analytics helpers                                        |
| `sentry.ts`          | Sentry configuration factory with PII scrubbing          |
| `error-handler.ts`   | Mutation error handling with toast notifications         |

## UI Support

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `brutalist-motion.ts` | Framer Motion variants (golden ratio timing) |
| `motion.ts`           | Additional motion presets                    |
| `layout-constants.ts` | Shared layout dimensions                     |

## Infrastructure

| File                    | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `lefthook-validator.ts` | Validates `.lefthook.yml` configuration |
| `environment.ts`        | Environment detection (dev/prod/test)   |
| `version.ts`            | Build version info                      |
| `utils.ts`              | General utilities (cn, etc.)            |

## Testing

Each file has a corresponding `.test.ts`. Type tests use `.test-d.ts` suffix.

Run tests: `bun run test src/lib`
