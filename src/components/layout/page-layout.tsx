import { type ReactNode } from "react";
import { LAYOUT } from "@/lib/layout-constants";

interface PageLayoutProps {
  /**
   * Page content (sections, panels, cards)
   */
  children: ReactNode;

  /**
   * Optional page title displayed as h1
   * (e.g., "Dashboard", "Workout History", "Settings")
   */
  title?: string;

  /**
   * Whether to apply max-width container (default: true)
   * Set to false for full-width pages (rare)
   */
  maxWidth?: boolean;

  /**
   * Whether to make the layout take full viewport height (default: false)
   * Useful for mobile layouts with sticky bottom elements
   */
  fullHeight?: boolean;
}

/**
 * Standard page layout component enforcing consistent spacing, padding, and structure.
 *
 * This is a DEEP MODULE:
 * - Simple interface: 3 props (children, title?, maxWidth?)
 * - Complex implementation: Handles responsive padding, safe areas, max-width, title styling
 *
 * Benefits:
 * - Hides layout complexity from pages
 * - Enforces consistency across all pages
 * - Single source of truth for page structure
 * - Prevents information leakage (pages don't know about padding/max-width internals)
 *
 * @example
 * ```tsx
 * <PageLayout title="Dashboard">
 *   <DailyStatsCard />
 *   <QuickLogForm />
 * </PageLayout>
 * ```
 */
export function PageLayout({
  children,
  title,
  maxWidth = true,
  fullHeight = false,
}: PageLayoutProps) {
  return (
    <main
      className={`flex-1 w-full flex flex-col ${LAYOUT.page.padding} ${
        maxWidth ? LAYOUT.page.maxWidth : ""
      } ${fullHeight ? "min-h-[calc(100dvh-64px)] pb-0 overflow-hidden" : ""}`}
    >
      {title && (
        <h1
          className={`text-2xl font-bold tracking-tight ${LAYOUT.page.titleSpacing}`}
        >
          {title}
        </h1>
      )}
      <div
        className={`${LAYOUT.page.spacing} ${fullHeight ? "flex-1 flex flex-col" : ""}`}
      >
        {children}
      </div>
    </main>
  );
}
