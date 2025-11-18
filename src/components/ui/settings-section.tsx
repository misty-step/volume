import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  /**
   * Section title displayed above content (e.g., "EXERCISE MANAGEMENT")
   * Rendered as uppercase, muted text
   */
  title?: string;

  /**
   * Optional help text displayed below content
   * Rendered as small, muted text
   */
  footer?: string;

  /**
   * Section content (typically SettingsList component)
   */
  children: ReactNode;

  /**
   * Optional CSS classes for customization
   */
  className?: string;
}

/**
 * iOS Settings-style section component
 *
 * Creates a visually distinct section with optional header and footer,
 * wrapping content in a rounded card container with border.
 *
 * Follows iOS Human Interface Guidelines for grouped table views:
 * - Section headers: 12px top, 16px bottom padding
 * - Content wrapped in rounded, bordered container
 * - Optional footer for contextual help text
 *
 * @example
 * ```tsx
 * <SettingsSection
 *   title="PREFERENCES"
 *   footer="Changes apply immediately"
 * >
 *   <SettingsList>
 *     <SettingsListItem title="Theme" />
 *   </SettingsList>
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  title,
  footer,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-0", className)}>
      {/* Section Header */}
      {title && (
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono px-4 pt-3 pb-4">
          {title}
        </h2>
      )}

      {/* Content Container - Brutalist sharp corners, heavy border */}
      <div className="bg-card border-3 border-border overflow-hidden">
        {children}
      </div>

      {/* Footer Help Text */}
      {footer && (
        <p className="text-xs text-muted-foreground px-4 pt-2 font-mono uppercase tracking-wide">
          {footer}
        </p>
      )}
    </section>
  );
}
