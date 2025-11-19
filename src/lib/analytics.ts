/**
 * Analytics Module Facade
 *
 * Re-exports core functionality from the modularized analytics system.
 * This file serves as the main entry point for feature code to ensure
 * backward compatibility and simplify imports.
 */

export type {
  AnalyticsEventDefinitions,
  AnalyticsEventName,
  AnalyticsEventProperties,
} from "./analytics/events";

export { setUserContext, clearUserContext } from "./analytics/context";

export { trackEvent, reportError } from "./analytics/router";
