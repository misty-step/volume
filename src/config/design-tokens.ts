/**
 * Brutalist Gym Design Tokens
 * Single source of truth for colors, typography, spacing, motion
 */

export const BRUTALIST_COLORS = {
  // Base palette
  concreteBlack: "#000000",
  concreteWhite: "#F5F5F5",
  concreteGray: "#808080",

  // Accent colors
  dangerRed: "#C41E3A", // Emergency button red
  safetyOrange: "#FF6B00", // Industrial/construction orange
  metalEdge: "#D1D5DB", // Chrome highlight

  // Chrome accent system (metallic highlights/shadows for precision instrument feel)
  chromeHighlight: "#E8EAED", // Bright metallic highlight
  chromeShadow: "#9CA3AF", // Subtle metallic shadow
  chromeGlow: "rgba(232, 234, 237, 0.15)", // Subtle glow for hover states

  // HSL for CSS variables
  hsl: {
    concreteBlack: "0 0% 0%",
    concreteWhite: "0 0% 96%",
    concreteGray: "0 0% 50%",
    dangerRed: "349 78% 45%",
    safetyOrange: "23 100% 50%",
    metalEdge: "210 10% 85%",
    chromeHighlight: "220 13% 91%",
    chromeShadow: "220 9% 65%",
  },
} as const;

/**
 * Brutalist Typography System
 *
 * A comprehensive typography scale for workout tracking interfaces.
 * Organized by usage context rather than arbitrary size names.
 *
 * # Core Principles
 * 1. **Numeric Clarity**: All workout metrics use monospace for alignment
 * 2. **Visual Hierarchy**: Size indicates importance, not decoration
 * 3. **Contextual Vocabulary**: Names describe usage, not measurements
 *
 * # Typography Categories
 *
 * ## Marketing/Hero Typography
 * Use for landing pages, marketing materials, and large hero sections.
 * Font: Bebas Neue (display), Inter Tight (headings)
 * Responsive sizing with clamp() for fluid scaling.
 *
 * ## Stat/Metric Typography
 * Use for ALL numeric workout data (weights, reps, durations, PRs).
 * Font: JetBrains Mono with tabular-nums for perfect column alignment.
 * Color: danger-red for primary metrics, foreground for secondary.
 *
 * ## Label Typography
 * Use for metric labels, units, and contextual information.
 * Font: Bebas Neue (hero labels), JetBrains Mono (small labels)
 * Always uppercase for industrial aesthetic.
 *
 * # When to Use Each Size
 *
 * ## stat.hero (36px)
 * - Dashboard primary stats (total volume, PR count, streak days)
 * - Analytics page highlights (monthly totals, all-time PRs)
 * - Celebration moments (new PR achieved screen)
 * ❌ Don't use for: Individual set weights, form inputs
 *
 * ## stat.large (24px)
 * - Set card weight displays (most common use case)
 * - Exercise detail page stats (best set, total volume)
 * - Analytics card primary metrics
 * ❌ Don't use for: Dashboard stats (too small), timestamps (too large)
 *
 * ## stat.default (18px)
 * - Set card reps and durations
 * - Form input unfocused state
 * - Secondary analytics metrics (average weight, set count)
 * ❌ Don't use for: Primary dashboard metrics, tiny historical data
 *
 * ## stat.small (14px)
 * - Historical list items (set history, workout logs)
 * - Inline timestamps
 * - Tertiary metrics (percentile ranks, change indicators)
 * ❌ Don't use for: Current workout logging, primary metrics
 *
 * ## label.hero (16px)
 * - Dashboard stat card labels ("TOTAL VOLUME", "PERSONAL RECORDS")
 * - Analytics section headers
 * - Empty state primary messages
 * ❌ Don't use for: Set card labels, form labels
 *
 * ## label.large (14px)
 * - Set card labels ("REPS", "WEIGHT", "DURATION")
 * - Exercise card metadata
 * - Analytics card labels
 * ❌ Don't use for: Dashboard, inline units
 *
 * ## label.default (12px)
 * - Form field labels
 * - Inline units ("kg", "lbs", "reps")
 * - Helper text
 * ❌ Don't use for: Primary labels, marketing content
 *
 * ## label.small (12px)
 * - Timestamps ("2 hours ago")
 * - Secondary metadata (deleted exercise indicators)
 * - Tertiary contextual information
 * ❌ Don't use for: Primary labels or units
 *
 * @example
 * // Dashboard stat card
 * <div>
 *   <div className={BRUTALIST_TYPOGRAPHY.pairings.dashboardStat.number}>
 *     2,450
 *   </div>
 *   <div className={BRUTALIST_TYPOGRAPHY.pairings.dashboardStat.label}>
 *     TOTAL VOLUME
 *   </div>
 * </div>
 *
 * @example
 * // Set card weight
 * <div>
 *   <span className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.number}>
 *     135
 *   </span>
 *   <span className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.unit}>
 *     lbs
 *   </span>
 * </div>
 */
export const BRUTALIST_TYPOGRAPHY = {
  fonts: {
    display: '"Bebas Neue", "Arial Black", sans-serif',
    heading: '"Inter Tight", "Arial Narrow", sans-serif',
    mono: '"JetBrains Mono", "Courier New", monospace',
    body: "system-ui, -apple-system, sans-serif",
  },

  sizes: {
    // Marketing/Hero typography
    hero: "clamp(3rem, 12vw, 8rem)", // 48-128px
    display: "clamp(2rem, 6vw, 4rem)", // 32-64px
    h1: "2.5rem", // 40px
    h2: "2rem", // 32px
    h3: "1.5rem", // 24px
    body: "1rem", // 16px
    small: "0.875rem", // 14px

    // Stat/Metric typography (monospace numbers)
    stat: {
      hero: "2.25rem", // 36px - Dashboard totals, PR displays
      large: "1.5rem", // 24px - Set weights, exercise stats
      default: "1.125rem", // 18px - Reps, durations, secondary metrics
      small: "0.875rem", // 14px - Historical data, timestamps
    },

    // Label typography (uppercase, tight tracking)
    label: {
      hero: "1rem", // 16px - Dashboard stat labels
      large: "0.875rem", // 14px - Set card labels
      default: "0.75rem", // 12px - Form labels, inline units
      small: "0.75rem", // 12px - Timestamps, helper text
    },
  },

  weights: {
    black: 900,
    bold: 700,
    semibold: 600,
    medium: 500,
    regular: 400,
  },

  letterSpacing: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.05em",
    wider: "0.1em",
  },

  /**
   * Type Pairings - Predefined combinations for specific contexts
   * Use these for consistent metric displays across the app
   */
  pairings: {
    // Dashboard hero stat card: Large number + uppercase label
    dashboardStat: {
      number: "font-mono text-4xl font-bold text-danger-red tabular-nums",
      label:
        "font-display text-base uppercase tracking-wider text-concrete-gray",
    },

    // Set card weight display: Large number + small unit
    setWeight: {
      number: "font-mono text-2xl font-semibold text-danger-red tabular-nums",
      unit: "font-mono text-xs uppercase text-muted-foreground ml-1",
    },

    // Set card reps/duration: Default number + inline text
    setMetric: {
      number: "font-mono text-lg text-foreground tabular-nums",
      text: "font-mono text-lg text-foreground",
    },

    // Analytics card metric: Large number + label
    analyticsMetric: {
      number: "font-mono text-2xl font-semibold text-danger-red tabular-nums",
      label: "font-display text-sm uppercase tracking-wide text-concrete-gray",
    },

    // Form input focused number: Hero scale + danger-red
    inputFocused: {
      number:
        "font-mono text-3xl font-bold text-danger-red tabular-nums transition-all duration-150",
    },

    // Historical list item: Small number + timestamp
    historicalMetric: {
      number: "font-mono text-sm text-muted-foreground tabular-nums",
      timestamp: "font-mono text-xs text-muted-foreground",
    },
  },
} as const;

export const BRUTALIST_SPACING = {
  grid: 8, // 8px base grid
  gutter: 24, // Component spacing
  section: 64, // Section spacing
} as const;

export const BRUTALIST_MOTION = {
  // Easing curves
  easing: {
    mechanical: [0.4, 0.0, 0.2, 1], // Sharp, industrial
    weightDrop: [0.9, 0.1, 0.3, 0.9], // Heavy impact
    explosive: [0.2, 1, 0.3, 1], // Celebration burst
  },

  // Duration presets
  duration: {
    instant: 0.1,
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
  },
} as const;

export const BRUTALIST_BORDERS = {
  width: {
    thin: "1px",
    normal: "2px",
    thick: "3px",
    heavy: "4px",
  },
  radius: {
    none: "0px",
    sm: "2px",
    md: "4px",
  },
} as const;

export const BRUTALIST_SHADOWS = {
  none: "none",
  press: "inset 0 4px 8px rgba(0,0,0,0.3)",
  lift: "4px 4px 0 0 rgba(0,0,0,1)",
  heavy: "8px 8px 0 0 rgba(0,0,0,0.3)",
  dialog: "8px 8px 0 0 rgba(0,0,0,0.3)",
} as const;

export const BRUTALIST_FOCUS = {
  ring: "ring-3 ring-danger-red ring-offset-0",
  ringSubtle: "ring-[1px] ring-danger-red ring-offset-0",
  border: "border-danger-red border-3",
  outline: "outline-none ring-3 ring-danger-red",
} as const;

export const BRUTALIST_INTERACTIVE = {
  hover: {
    light: "hover:bg-concrete-black/5",
    medium: "hover:bg-concrete-black/10",
    lightDark: "dark:hover:bg-concrete-white/5",
    mediumDark: "dark:hover:bg-concrete-white/10",
  },
  active: {
    press: "active:scale-95 active:shadow-inner",
    shadow: "active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]",
  },
} as const;
