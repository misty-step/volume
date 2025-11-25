/**
 * Number Display Typography Utilities
 *
 * Brutalist typography system for numeric data displays.
 * Ensures consistent visual hierarchy across workout metrics:
 * - Hero: Large stats (dashboard totals, analytics highlights)
 * - Large: Prominent metrics (set weights, exercise stats)
 * - Default: Standard numbers (reps, durations)
 * - Small: Secondary metrics (timestamps, labels)
 *
 * All use JetBrains Mono with tabular-nums for column alignment.
 */

export const numberDisplayClasses = {
  /**
   * Hero numbers - Dashboard stats, analytics highlights
   * Usage: PR displays, total volume, streak counts
   */
  hero: "font-mono text-4xl font-bold text-danger-red tabular-nums",

  /**
   * Large numbers - Prominent workout metrics
   * Usage: Set weights, max lift displays, primary exercise stats
   */
  large: "font-mono text-2xl font-semibold text-danger-red tabular-nums",

  /**
   * Default numbers - Standard numeric displays
   * Usage: Reps, durations, secondary metrics
   */
  default: "font-mono text-lg text-foreground tabular-nums",

  /**
   * Small numbers - Tertiary metrics and labels
   * Usage: Historical data, timestamps, counts
   */
  small: "font-mono text-sm text-muted-foreground tabular-nums",
} as const;

/**
 * Label Display Typography Utilities
 *
 * Companion utilities for metric labels and units.
 * Designed to pair with numberDisplayClasses for complete metric displays.
 */
export const labelDisplayClasses = {
  /**
   * Hero labels - Large stat labels
   * Usage: Dashboard stat cards, analytics section headers
   */
  hero: "font-display text-base uppercase tracking-wider text-concrete-gray",

  /**
   * Large labels - Prominent metric labels
   * Usage: Set cards, exercise headers
   */
  large: "font-display text-sm uppercase tracking-wide text-concrete-gray",

  /**
   * Default labels - Standard labels
   * Usage: Form labels, inline units
   */
  default: "font-mono text-xs uppercase text-muted-foreground",

  /**
   * Small labels - Tertiary labels
   * Usage: Timestamps, helper text
   */
  small: "font-mono text-xs text-muted-foreground",
} as const;
