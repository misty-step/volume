/**
 * Typed design token constants for use in TSX.
 * All class strings reference CSS variables defined in globals.css.
 */
export const dt = {
  metric: {
    val: "text-[1.6rem] font-bold tabular leading-none tracking-tight text-accent",
    unit: "text-[0.75em] font-normal text-muted-foreground",
  },
  eyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
  label: "text-[11px] font-normal text-muted-foreground",
  block: "rounded-[--radius] border border-border-subtle bg-card w-full",
  blockPad: "p-[10px]",
  sectionTitle: "text-sm font-semibold text-foreground",
  mutedText: "text-xs text-muted-foreground",
  bodyText: "text-sm leading-relaxed text-foreground",
  eyebrowClass:
    "text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
} as const;
