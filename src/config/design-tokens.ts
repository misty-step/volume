/**
 * Volume 3b Design Tokens
 * All values map to CSS custom properties in globals.css
 */

export const VOLUME_TOKENS = {
  colors: {
    accent: "hsl(var(--accent))",
    background: "hsl(var(--background))",
    card: "hsl(var(--card))",
    border: "hsl(var(--border))",
    muted: "hsl(var(--muted-foreground))",
    success: "hsl(var(--success))",
    destructive: "hsl(var(--destructive))",
  },
  typography: {
    metric: {
      value:
        "text-[1.6rem] font-bold tabular leading-none tracking-tight text-accent",
      unit: "text-[0.75em] font-normal text-muted-foreground",
    },
    eyebrow:
      "text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
    label: "text-[11px] font-normal text-muted-foreground",
    sectionTitle: "text-sm font-semibold text-foreground",
  },
  motion: {
    fadeIn: "animate-fade-in",
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  radius: {
    default: "10px",
    lg: "12px",
    chat: "18px",
  },
} as const;

// Legacy: kept for gradual migration of dashboard components
// TODO: remove once all dashboard components are updated
export const BRUTALIST_COLORS = {
  concreteBlack: "#0d0e11",
  concreteWhite: "#edf0f5",
  concreteGray: "#8c95a6",
  dangerRed: "#d94040",
  safetyOrange: "#e07a2a",
  metalEdge: "#c8cdd8",
  chromeHighlight: "#e8eaed",
  chromeShadow: "#9ca3af",
  chromeGlow: "rgba(232, 234, 237, 0.15)",
  hsl: {
    concreteBlack: "222 22% 6%",
    concreteWhite: "210 20% 92%",
    concreteGray: "214 12% 60%",
    dangerRed: "4 70% 58%",
    safetyOrange: "24 85% 57%",
    metalEdge: "220 15% 22%",
    chromeHighlight: "210 20% 92%",
    chromeShadow: "214 12% 60%",
  },
} as const;

export const BRUTALIST_SHADOWS = {
  none: "none",
  press: "inset 0 2px 4px rgba(0,0,0,0.2)",
  lift: "0 1px 3px rgba(0,0,0,0.12)",
  heavy: "0 4px 12px rgba(0,0,0,0.15)",
  dialog: "0 4px 12px rgba(0,0,0,0.15)",
} as const;

// Legacy shims for components not yet migrated in this PR.
export const BRUTALIST_TYPOGRAPHY = {
  pairings: {
    dashboardStat: {
      number: "font-mono text-4xl font-bold tabular-nums text-accent",
      label:
        "text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
    },
    setWeight: {
      number: "font-mono text-2xl font-semibold tabular-nums text-foreground",
      unit: "font-mono text-xs uppercase text-muted-foreground",
    },
    setMetric: {
      number: "font-mono text-lg tabular-nums text-foreground",
      text: "font-mono text-lg text-foreground",
    },
    analyticsMetric: {
      number: "font-mono text-2xl font-semibold tabular-nums text-accent",
      label:
        "text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
    },
    historicalMetric: {
      timestamp: "font-mono text-xs text-muted-foreground",
    },
  },
} as const;

// Legacy shim for ghost set display colors.
export const PERFORMANCE_COLORS = {
  accent: {
    primary: "hsl(var(--accent))",
    primaryGlow: "hsl(var(--accent) / 0.25)",
    primaryDim: "hsl(var(--accent) / 0.15)",
  },
} as const;
