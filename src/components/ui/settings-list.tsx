import React, { type ReactNode } from "react";

interface SettingsListProps {
  /**
   * List items (SettingsListItem components)
   */
  children: ReactNode;
}

/**
 * iOS Settings-style list container
 *
 * Renders children with dividers between items, following iOS patterns:
 * - Dividers are automatically added between items
 * - Uses border utility for consistent theming
 * - No divider after last item
 *
 * Designed to contain SettingsListItem components.
 *
 * @example
 * ```tsx
 * <SettingsList>
 *   <SettingsListItem title="Option 1" />
 *   <SettingsListItem title="Option 2" />
 *   <SettingsListItem title="Option 3" />
 * </SettingsList>
 * ```
 */
export function SettingsList({ children }: SettingsListProps) {
  return <div className="divide-y divide-border">{children}</div>;
}
