/**
 * Validation
 */

type ValidationResult = { valid: boolean; error?: string };

const valid = (): ValidationResult => ({ valid: true });

const invalid = (error: string): ValidationResult => ({
  valid: false,
  error,
});

export function validateReps(reps: number): ValidationResult {
  if (!Number.isInteger(reps) || reps <= 0 || reps > 1000) {
    return invalid(
      "Reps must be a whole number between 1 and 1000 (no half reps—round to the nearest whole rep)."
    );
  }

  return valid();
}

export function validateWeight(weight: number): ValidationResult {
  if (!isFinite(weight) || weight < 0.1 || weight > 10000) {
    return invalid(
      "Weight must be between 0.1 and 10000—leave weight empty for bodyweight instead of entering 0."
    );
  }

  return valid();
}

export function validateDuration(duration: number): ValidationResult {
  if (!isFinite(duration) || duration <= 0 || duration > 86400) {
    return invalid(
      "Duration must be between 1 and 86400 seconds (24 hours)—restart the timer and try again."
    );
  }

  const rounded = Math.round(duration);
  if (rounded < 1) {
    return invalid(
      "Duration must be between 1 and 86400 seconds (24 hours)—restart the timer and try again."
    );
  }

  return valid();
}

export function validateExerciseName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return invalid("Exercise name cannot be empty—add at least two letters.");
  }

  if (trimmed.length < 2 || trimmed.length > 100) {
    return invalid(
      "Exercise name must be 2-100 characters; shorten or extend it."
    );
  }

  return valid();
}
