import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsListItemProps {
  /**
   * Primary text displayed prominently (e.g., exercise name)
   */
  title: ReactNode;

  /**
   * Secondary text displayed below title (e.g., date, metadata)
   */
  subtitle?: ReactNode;

  /**
   * Optional icon displayed before title
   */
  icon?: ReactNode;

  /**
   * Actions displayed on the right side (buttons, toggles, etc.)
   * Can be a single element or array of elements
   */
  actions?: ReactNode | ReactNode[];

  /**
   * Click handler for entire row (makes row interactive)
   * Note: If provided, the entire row becomes a button
   */
  onClick?: () => void;

  /**
   * Optional CSS classes for customization
   */
  className?: string;
}

/**
 * iOS Settings-style list item component
 *
 * Renders a single item in a settings list with:
 * - 44px minimum touch target height (iOS HIG)
 * - Flexible layout: icon + title/subtitle + actions
 * - Hover/active states when interactive
 * - Proper text truncation for long content
 *
 * Follows iOS Human Interface Guidelines for list rows:
 * - 16px horizontal padding
 * - 12px vertical padding
 * - Title uses bold font weight with uppercase and wide tracking
 * - Subtitle uses small text with muted color
 *
 * @example
 * ```tsx
 * <SettingsListItem
 *   title="Push-ups"
 *   subtitle="10/27/25 • 12 sets"
 *   actions={
 *     <>
 *       <Button size="sm">Edit</Button>
 *       <Button size="sm" variant="destructive">Delete</Button>
 *     </>
 *   }
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Interactive row (entire row clickable)
 * <SettingsListItem
 *   title="Add Exercise"
 *   icon={<Plus className="w-5 h-5" />}
 *   onClick={() => console.log('clicked')}
 * />
 * ```
 */
export function SettingsListItem({
  title,
  subtitle,
  icon,
  actions,
  onClick,
  className,
}: SettingsListItemProps) {
  const hasClick = !!onClick;
  const Wrapper = hasClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      type={hasClick ? "button" : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 min-h-[44px]",
        "border-b-2 border-border last:border-b-0",
        "transition-all duration-75",
        hasClick &&
          "hover:bg-concrete-black/5 dark:hover:bg-concrete-white/5 active:bg-concrete-black/10 dark:active:bg-concrete-white/10 active:shadow-inner cursor-pointer text-left",
        className
      )}
    >
      {/* Optional Leading Icon */}
      {icon && (
        <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
      )}

      {/* Content (title + subtitle) */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm leading-tight uppercase tracking-wide">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-0.5 leading-tight font-mono">
            {subtitle}
          </div>
        )}
      </div>

      {/* Trailing Actions */}
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {Array.isArray(actions)
            ? actions.map((action, i) => (
                <React.Fragment key={i}>{action}</React.Fragment>
              ))
            : actions}
        </div>
      )}
    </Wrapper>
  );
}
