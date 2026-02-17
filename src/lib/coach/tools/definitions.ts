export const COACH_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "log_set",
      description:
        "Log a workout set. Exactly one of reps or duration_seconds is required. Use reps for rep-based movements and duration_seconds for timed holds.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          exercise_name: { type: "string" },
          reps: { type: "number" },
          duration_seconds: { type: "number" },
          weight: { type: "number" },
          unit: { type: "string", enum: ["lbs", "kg"] },
        },
        required: ["exercise_name"],
        oneOf: [{ required: ["reps"] }, { required: ["duration_seconds"] }],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_summary",
      description: "Get today's workout totals and top exercises.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_exercise_report",
      description: "Get a focused report and trend for a specific exercise.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          exercise_name: { type: "string" },
        },
        required: ["exercise_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_focus_suggestions",
      description:
        "Get prioritized suggestions for what the user should work on today based on imbalance and recency.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_weight_unit",
      description: "Set local default weight unit preference.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          unit: { type: "string", enum: ["lbs", "kg"] },
        },
        required: ["unit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_sound",
      description: "Enable or disable local tactile sound preference.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          enabled: { type: "boolean" },
        },
        required: ["enabled"],
      },
    },
  },
] as const;
