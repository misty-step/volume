/**
 * Type-safe analytics event catalog.
 *
 * Serves as the single source of truth for all trackable events so
 * TypeScript can prevent typos and enforce required properties.
 */
export interface AnalyticsEventDefinitions {
  "Exercise Created": {
    exerciseId: string;
    userId?: string;
    source?: "manual" | "ai" | "import";
  };
  "Exercise Deleted": {
    exerciseId: string;
    userId?: string;
  };
  "Set Logged": {
    setId: string;
    exerciseId: string;
    userId?: string;
    reps: number;
    weight?: number;
  };
  "Workout Session Started": {
    sessionId: string;
    userId?: string;
  };
  "Workout Session Completed": {
    sessionId: string;
    userId?: string;
    durationMs: number;
    setCount: number;
  };
  "Marketing Page View": {
    path: string;
  };
  "Marketing CTA Click": {
    placement: "hero" | "final" | "navbar" | "footer" | "pricing";
    label: string;
  };
  "Marketing FAQ Toggle": {
    question: string;
    isOpen: boolean;
  };
  "Marketing Nav Click": {
    target: string;
    device: "desktop" | "mobile";
  };
}

export type AnalyticsEventName = keyof AnalyticsEventDefinitions;

/**
 * Event-specific property helper.
 *
 * Consumers must pass all required properties from event definition
 * while the helper still allows additional metadata fields (string/number/boolean).
 */
export type AnalyticsEventProperties<Name extends AnalyticsEventName> =
  AnalyticsEventDefinitions[Name] & Record<string, string | number | boolean>;

// TODO: Implement EventDefinitions metadata map as per DESIGN.md
// export const EventDefinitions: Record<AnalyticsEventName, EventMeta> = ...
