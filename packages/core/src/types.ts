/**
 * Shared domain types for business logic
 *
 * These types are intentionally minimal and framework-agnostic.
 * Consumers can extend or narrow these types as needed.
 */

/**
 * Minimal set data for calculations
 * Uses generic types to avoid Convex Id<> dependency
 */
export interface SetData {
  reps?: number;
  weight?: number;
  duration?: number;
  performedAt: number;
}

/**
 * Type of PR achieved
 * - 'weight': Heaviest weight lifted for this exercise
 * - 'reps': Most reps completed for this exercise
 * - 'volume': Highest volume (weight × reps) for this exercise
 */
export type PRType = "weight" | "reps" | "volume";

export interface PRResult {
  type: PRType;
  currentValue: number;
  previousValue: number;
}

/**
 * Primary metric type for exercise analysis
 */
export type MetricKind = "volume" | "reps" | "duration";

/**
 * Weight unit for conversions
 */
export type WeightUnit = "lbs" | "kg";
