import type { QueryCtx, MutationCtx } from "../_generated/server";
import {
  validateReps as coreValidateReps,
  validateWeight as coreValidateWeight,
  validateDuration as coreValidateDuration,
  validateExerciseName as coreValidateExerciseName,
} from "../../packages/core/src/validation";

/**
 * Validate reps input.
 * Rejects non-integers, non-positive values, or values over 1000.
 *
 * @param reps - Number of repetitions
 * @throws Error if validation fails
 */
export function validateReps(reps: number): void {
  const result = coreValidateReps(reps);
  if (!result.valid) {
    throw new Error(result.error);
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

  const result = coreValidateWeight(weight);
  if (!result.valid) {
    throw new Error(result.error);
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
      throw new Error(
        "Unit must be 'lbs' or 'kg' when weight is provided—choose a unit or clear the weight."
      );
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

  const result = coreValidateDuration(duration);
  if (!result.valid) {
    throw new Error(result.error);
  }

  // Round to nearest second
  return Math.round(duration);
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
  const result = coreValidateExerciseName(name);
  if (!result.valid) {
    throw new Error(result.error);
  }

  return name.trim();
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
