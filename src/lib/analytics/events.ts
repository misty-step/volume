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

export type EventMeta = {
  description: string;
  // We use string[] here because extracting keys at runtime from interface is hard,
  // so we enforce it via tests/linting against the interface.
  required: readonly string[];
  piiFields?: readonly string[];
  owner: "growth" | "product" | "platform";
  rollout?: "beta" | "ga";
};

/**
 * Runtime metadata for events.
 *
 * Used for documentation generation, linting, and runtime validation (dev mode).
 */
export const EventDefinitions: Record<AnalyticsEventName, EventMeta> = {
  "Exercise Created": {
    description: "User creates a new custom exercise",
    required: ["exerciseId"],
    piiFields: ["userId"],
    owner: "product",
    rollout: "ga",
  },
  "Exercise Deleted": {
    description: "User deletes an exercise",
    required: ["exerciseId"],
    piiFields: ["userId"],
    owner: "product",
    rollout: "ga",
  },
  "Set Logged": {
    description: "User logs a set for an exercise",
    required: ["setId", "exerciseId", "reps"],
    piiFields: ["userId"],
    owner: "product",
    rollout: "ga",
  },
  "Workout Session Started": {
    description: "User begins a new workout session",
    required: ["sessionId"],
    piiFields: ["userId"],
    owner: "product",
    rollout: "ga",
  },
  "Workout Session Completed": {
    description: "User finishes a workout session",
    required: ["sessionId", "durationMs", "setCount"],
    piiFields: ["userId"],
    owner: "product",
    rollout: "ga",
  },
  "Marketing Page View": {
    description: "Visitor views a marketing page",
    required: ["path"],
    owner: "growth",
    rollout: "ga",
  },
  "Marketing CTA Click": {
    description: "Visitor clicks a Call to Action button",
    required: ["placement", "label"],
    owner: "growth",
    rollout: "ga",
  },
  "Marketing FAQ Toggle": {
    description: "Visitor expands or collapses an FAQ item",
    required: ["question", "isOpen"],
    owner: "growth",
    rollout: "ga",
  },
  "Marketing Nav Click": {
    description: "Visitor clicks a navigation link",
    required: ["target", "device"],
    owner: "growth",
    rollout: "ga",
  },
};
