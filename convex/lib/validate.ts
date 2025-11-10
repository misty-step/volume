import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Validate reps input.
 * Rejects non-integers, non-positive values, or values over 1000.
 *
 * @param reps - Number of repetitions
 * @throws Error if validation fails
 */
export function validateReps(reps: number): void {
  if (!Number.isInteger(reps) || reps <= 0 || reps > 1000) {
    throw new Error("Reps must be a whole number between 1 and 1000");
  }
}

/**
 * Validate and normalize weight input.
 * Returns undefined if not provided.
 * Rejects non-finite, non-positive values, or values over 10000.
 * Rounds to 2 decimal places for precision.
 *
 * @param weight - Weight value (optional)
 * @returns Rounded weight or undefined
 * @throws Error if validation fails
 */
export function validateWeight(weight: number | undefined): number | undefined {
  if (weight === undefined) {
    return undefined;
  }

  if (!isFinite(weight) || weight < 0.1 || weight > 10000) {
    throw new Error("Weight must be between 0.1 and 10000");
  }

  // Round to 2 decimal places
  return Math.round(weight * 100) / 100;
}

/**
 * Validate unit when weight is provided.
 * Requires unit to be "lbs" or "kg" if weight is present.
 *
 * @param unit - Weight unit (optional)
 * @param weight - Weight value (optional)
 * @throws Error if weight provided without valid unit
 */
export function validateUnit(
  unit: string | undefined,
  weight: number | undefined
): void {
  if (weight !== undefined) {
    if (!unit || (unit !== "lbs" && unit !== "kg")) {
      throw new Error("Unit must be 'lbs' or 'kg' when weight is provided");
    }
  }
}

/**
 * Validate duration input.
 * Returns undefined if not provided.
 * Rejects non-positive values or values over 86400 (24 hours).
 * Rounds to nearest second.
 *
 * @param duration - Duration in seconds (optional)
 * @returns Rounded duration or undefined
 * @throws Error if validation fails
 */
export function validateDuration(
  duration: number | undefined
): number | undefined {
  if (duration === undefined) {
    return undefined;
  }

  if (!isFinite(duration) || duration <= 0 || duration > 86400) {
    throw new Error("Duration must be between 1 and 86400 seconds (24 hours)");
  }

  // Round to nearest second and ensure it stays within bounds
  const rounded = Math.round(duration);
  if (rounded < 1) {
    throw new Error("Duration must be between 1 and 86400 seconds (24 hours)");
  }
  return rounded;
}

/**
 * Validate and normalize exercise name.
 * Trims whitespace and preserves original casing.
 * Rejects names shorter than 2 or longer than 100 characters.
 *
 * @param name - Exercise name
 * @returns Normalized name (trimmed, original casing preserved)
 * @throws Error if validation fails
 */
export function validateExerciseName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error("Exercise name cannot be empty");
  }

  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new Error("Exercise name must be 2-100 characters");
  }

  return trimmed;
}

/**
 * Require authentication and return user identity.
 * Throws if user is not authenticated.
 *
 * @param ctx - Query or mutation context
 * @returns User identity
 * @throws Error if not authenticated
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<{ subject: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

/**
 * Require resource ownership.
 * Throws if resource doesn't exist or doesn't belong to user.
 *
 * @param resource - Resource to check (must have userId property)
 * @param userId - User ID to verify ownership
 * @param resourceType - Type of resource for error message
 * @throws Error if resource not found or not authorized
 */
export function requireOwnership<T extends { userId: string }>(
  resource: T | null,
  userId: string,
  resourceType: string
): void {
  if (!resource) {
    throw new Error(`${resourceType} not found`);
  }
  if (resource.userId !== userId) {
    throw new Error(`Not authorized to access this ${resourceType}`);
  }
}
