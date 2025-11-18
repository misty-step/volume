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

  // HSL for CSS variables
  hsl: {
    concreteBlack: "0 0% 0%",
    concreteWhite: "0 0% 96%",
    concreteGray: "0 0% 50%",
    dangerRed: "349 78% 45%",
    safetyOrange: "23 100% 50%",
    metalEdge: "210 10% 85%",
  },
} as const;

export const BRUTALIST_TYPOGRAPHY = {
  fonts: {
    display: '"Bebas Neue", "Arial Black", sans-serif',
    heading: '"Inter Tight", "Arial Narrow", sans-serif',
    mono: '"JetBrains Mono", "Courier New", monospace',
    body: "system-ui, -apple-system, sans-serif",
  },

  sizes: {
    hero: "clamp(3rem, 12vw, 8rem)", // 48-128px
    display: "clamp(2rem, 6vw, 4rem)", // 32-64px
    h1: "2.5rem", // 40px
    h2: "2rem", // 32px
    h3: "1.5rem", // 24px
    body: "1rem", // 16px
    small: "0.875rem", // 14px
  },

  weights: {
    black: 900,
    bold: 700,
    medium: 500,
    regular: 400,
  },

  letterSpacing: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.05em",
    wider: "0.1em",
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
