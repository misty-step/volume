import type { CSSProperties } from "react";

// Deprecated: workspace-specific tokens are replaced by the main 3b token system.
// This shim exists only to avoid breaking imports during migration.
// TODO: remove once all callsites are updated.

type WorkspaceStyle = CSSProperties & Record<`--workspace-${string}`, string>;

export const workspaceBrandkit: WorkspaceStyle = {};

export const workspaceClasses = {
  shell: "bg-background text-foreground",
  surface: "rounded-[--radius] border border-border-subtle bg-card",
  subtleSurface:
    "rounded-[calc(var(--radius)-2px)] border border-border-subtle bg-card/58",
  bodyText: "text-sm leading-relaxed text-foreground",
  mutedText: "text-xs text-muted-foreground",
  eyebrow:
    "text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
  sectionTitle: "text-sm font-semibold text-foreground",
  divider: "divide-y divide-border-subtle",
  buttonBase:
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[--radius] px-3 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  buttonPrimary: "bg-accent text-accent-foreground hover:bg-accent/90",
  buttonGhost:
    "border border-border bg-transparent text-foreground hover:bg-card",
  inputBase:
    "h-11 w-full rounded-[--radius] border border-input bg-background/76 px-3 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm",
  selectBase:
    "h-11 w-full rounded-[--radius] border border-input bg-background/76 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  chipButton:
    "inline-flex min-h-[44px] items-center rounded-[calc(var(--radius)-2px)] border border-border bg-card/35 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:scale-[0.98]",
  fieldLabel:
    "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground",
  fieldHint: "text-[11px] text-muted-foreground",
  fieldError: "text-xs text-destructive",
} as const;
