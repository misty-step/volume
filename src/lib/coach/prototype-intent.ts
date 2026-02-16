export type CoachIntent =
  | {
      type: "log_set";
      exerciseName: string;
      reps?: number;
      durationSeconds?: number;
      weight?: number;
      unit?: "lbs" | "kg";
    }
  | {
      type: "today_summary";
    }
  | {
      type: "exercise_report";
      exerciseName: string;
    }
  | {
      type: "set_weight_unit";
      unit: "lbs" | "kg";
    }
  | {
      type: "set_sound";
      enabled: boolean;
    }
  | {
      type: "unknown";
      input: string;
    };

const STOPWORDS = new Set([
  "show",
  "me",
  "my",
  "the",
  "for",
  "trend",
  "history",
  "report",
  "insight",
  "insights",
  "analyze",
  "analysis",
  "of",
  "on",
  "please",
  "stats",
  "stat",
  "summary",
  "today",
  "performance",
  "how",
  "am",
  "i",
  "doing",
]);

const EXERCISE_ALIASES: Record<string, string> = {
  pushup: "Push-ups",
  pushups: "Push-ups",
  "push-up": "Push-ups",
  "push-ups": "Push-ups",
  squat: "Squats",
  squats: "Squats",
  pullup: "Pull-ups",
  pullups: "Pull-ups",
  "pull-up": "Pull-ups",
  "pull-ups": "Pull-ups",
  situp: "Sit-ups",
  situps: "Sit-ups",
  "sit-up": "Sit-ups",
  "sit-ups": "Sit-ups",
  plank: "Plank",
};

const LEADING_VERBS = /^(log|add|did|completed|complete|i did|i completed)\s+/i;

function toUnit(token: string): "lbs" | "kg" {
  return token.toLowerCase().startsWith("kg") ? "kg" : "lbs";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeExerciseAlias(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
  return EXERCISE_ALIASES[normalized] ?? toTitleCase(normalized);
}

function parseDurationUnitToSeconds(value: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit.startsWith("m")) {
    return Math.round(value * 60);
  }
  return Math.round(value);
}

function extractWeight(input: string): {
  cleaned: string;
  weight?: number;
  unit?: "lbs" | "kg";
} {
  const match = input.match(
    /^(.*?)(?:\s+(?:@|at)\s*(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs))\s*$/i
  );
  if (!match) {
    return { cleaned: input };
  }

  const rawPrefix = normalizeWhitespace(match[1] ?? "");
  const rawWeight = Number(match[2] ?? "0");
  const rawUnit = match[3] ?? "lbs";

  if (!Number.isFinite(rawWeight) || rawWeight <= 0) {
    return { cleaned: input };
  }

  return {
    cleaned: rawPrefix,
    weight: rawWeight,
    unit: toUnit(rawUnit),
  };
}

function parseLogIntent(input: string): CoachIntent | null {
  const stripped = normalizeWhitespace(input.replace(LEADING_VERBS, ""));
  const withWeight = extractWeight(stripped);
  const body = withWeight.cleaned;

  if (!body) return null;

  const durationPrefix = body.match(
    /^(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)\s+(.+)$/i
  );
  if (durationPrefix) {
    const duration = parseDurationUnitToSeconds(
      Number(durationPrefix[1]),
      durationPrefix[2] ?? "s"
    );
    const exerciseName = normalizeExerciseAlias(durationPrefix[3] ?? "");
    if (exerciseName && duration > 0) {
      return {
        type: "log_set",
        exerciseName,
        durationSeconds: duration,
        weight: withWeight.weight,
        unit: withWeight.unit,
      };
    }
  }

  const durationSuffix = body.match(
    /^(.+?)\s+for\s+(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)$/i
  );
  if (durationSuffix) {
    const duration = parseDurationUnitToSeconds(
      Number(durationSuffix[2]),
      durationSuffix[3] ?? "s"
    );
    const exerciseName = normalizeExerciseAlias(durationSuffix[1] ?? "");
    if (exerciseName && duration > 0) {
      return {
        type: "log_set",
        exerciseName,
        durationSeconds: duration,
        weight: withWeight.weight,
        unit: withWeight.unit,
      };
    }
  }

  const repsPrefix = body.match(/^(\d{1,4})\s*(?:x|reps?|rep)?\s+(.+)$/i);
  if (repsPrefix) {
    const reps = Number(repsPrefix[1]);
    const exerciseName = normalizeExerciseAlias(repsPrefix[2] ?? "");
    if (exerciseName && reps > 0) {
      return {
        type: "log_set",
        exerciseName,
        reps,
        weight: withWeight.weight,
        unit: withWeight.unit,
      };
    }
  }

  const repsSuffix = body.match(
    /^(.+?)\s+(?:x\s*)?(\d{1,4})\s*(?:reps?|rep)?$/i
  );
  if (repsSuffix) {
    const reps = Number(repsSuffix[2]);
    const exerciseName = normalizeExerciseAlias(repsSuffix[1] ?? "");
    if (exerciseName && reps > 0) {
      return {
        type: "log_set",
        exerciseName,
        reps,
        weight: withWeight.weight,
        unit: withWeight.unit,
      };
    }
  }

  return null;
}

function parseSettingIntent(input: string): CoachIntent | null {
  const unitMatch = input.match(
    /\b(?:set|switch|change)?\s*(?:my\s+)?(?:weight\s+)?unit\b.*\b(kg|kgs|lb|lbs)\b/i
  );
  if (unitMatch) {
    return {
      type: "set_weight_unit",
      unit: toUnit(unitMatch[1] ?? "lbs"),
    };
  }

  const shorthandUnitMatch = input.match(
    /\b(?:switch|change)\b.*\b(?:to|in)\s*(kg|kgs|lb|lbs)\b/i
  );
  if (shorthandUnitMatch) {
    return {
      type: "set_weight_unit",
      unit: toUnit(shorthandUnitMatch[1] ?? "lbs"),
    };
  }

  if (
    /\b(?:sound|audio|click)\b.*\b(?:off|mute|disable|disabled)\b/i.test(input)
  ) {
    return {
      type: "set_sound",
      enabled: false,
    };
  }

  if (/\b(?:sound|audio|click)\b.*\b(?:on|enable|enabled)\b/i.test(input)) {
    return {
      type: "set_sound",
      enabled: true,
    };
  }

  return null;
}

function parseSummaryIntent(input: string): CoachIntent | null {
  if (
    /\b(?:today|todays)\b/.test(input) &&
    /\b(?:summary|stats|totals?|workout|sets?|progress|doing)\b/.test(input)
  ) {
    return { type: "today_summary" };
  }

  if (/\bwhat did i do today\b/.test(input)) {
    return { type: "today_summary" };
  }

  return null;
}

function parseExerciseReportIntent(input: string): CoachIntent | null {
  if (!/\b(?:trend|history|report|insight|analysis|progress)\b/.test(input)) {
    return null;
  }

  const explicit = input.match(/\b(?:for|on|about)\s+([a-z0-9 -]+)$/i);
  const raw =
    explicit?.[1] ??
    input
      .split(" ")
      .filter((token) => !STOPWORDS.has(token))
      .join(" ");

  const exerciseName = normalizeExerciseAlias(normalizeWhitespace(raw));
  if (!exerciseName) return null;

  return {
    type: "exercise_report",
    exerciseName,
  };
}

export function normalizeExerciseLookup(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseCoachIntent(input: string): CoachIntent {
  const normalized = normalizeWhitespace(input.toLowerCase());
  if (!normalized) {
    return { type: "unknown", input };
  }

  const settingIntent = parseSettingIntent(normalized);
  if (settingIntent) return settingIntent;

  const summaryIntent = parseSummaryIntent(normalized);
  if (summaryIntent) return summaryIntent;

  const reportIntent = parseExerciseReportIntent(normalized);
  if (reportIntent) return reportIntent;

  const logIntent = parseLogIntent(normalized);
  if (logIntent) return logIntent;

  return { type: "unknown", input };
}
