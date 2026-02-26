export const COACH_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "log_set",
      description:
        "Log a workout set. Exactly one of reps or duration_seconds is required. Use reps for rep-based movements and duration_seconds (integer seconds) for timed holds. Preserve exact user numbers; do not round.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          exercise_name: { type: "string" },
          reps: { type: "integer", minimum: 1, maximum: 1000 },
          duration_seconds: { type: "integer", minimum: 1, maximum: 86400 },
          weight: { type: "number", minimum: 0, maximum: 5000 },
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
  {
    type: "function",
    function: {
      name: "show_workspace",
      description:
        "Show workspace capability catalog and starter interactive components.",
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
      name: "get_history_overview",
      description: "Get recent workout history and set ids.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: { type: "integer", minimum: 5, maximum: 100 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_analytics_overview",
      description: "Get streak, PR, overload, and focus overview.",
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
      name: "get_exercise_library",
      description: "List exercise library including archived items.",
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
      name: "rename_exercise",
      description: "Rename an active exercise.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          exercise_name: { type: "string" },
          new_name: { type: "string" },
        },
        required: ["exercise_name", "new_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "merge_exercise",
      description:
        "Consolidate duplicate exercises by moving all historical sets from source_exercise into target_exercise, then archiving the source.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          source_exercise: { type: "string" },
          target_exercise: { type: "string" },
        },
        required: ["source_exercise", "target_exercise"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_exercise",
      description: "Archive an active exercise.",
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
      name: "restore_exercise",
      description: "Restore an archived exercise.",
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
      name: "update_exercise_muscle_groups",
      description: "Update muscle groups for an exercise.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          exercise_name: { type: "string" },
          muscle_groups: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 8,
          },
        },
        required: ["exercise_name", "muscle_groups"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_set",
      description: "Delete a set by set_id or latest set for an exercise.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          set_id: { type: "string" },
          exercise_name: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_settings_overview",
      description: "Get profile preferences and billing status.",
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
      name: "update_preferences",
      description: "Update user goals and coaching preferences.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          goals: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "build_muscle",
                "lose_weight",
                "maintain_fitness",
                "get_stronger",
              ],
            },
          },
          custom_goal: { type: "string" },
          training_split: { type: "string" },
          coach_notes: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_report_history",
      description: "List recent AI report history records.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 30 },
        },
      },
    },
  },
] as const;
