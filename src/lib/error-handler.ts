import { toast } from "sonner";

/**
 * Centralized error handler for Convex mutations.
 * Logs errors for debugging and shows user-friendly toast notifications.
 *
 * @param error - Error object or unknown error
 * @param context - Context string describing the operation (e.g., "Log Set", "Create Exercise")
 */
export function handleMutationError(error: unknown, context: string): void {
  // Extract error message
  const message = error instanceof Error ? error.message : "Unknown error";

  // Log for debugging (sanitize in production to prevent info disclosure)
  if (process.env.NODE_ENV === "production") {
    console.error(`[${context}]: ${message}`);
  } else {
    console.error(`[${context}]:`, error);
  }

  // Map to user-friendly message and show toast
  const userMessage = getUserFriendlyMessage(message);
  toast.error(userMessage, {
    duration: 4000,
  });
}

/**
 * Maps technical error messages to user-friendly ones.
 * Validation errors are already user-friendly and pass through unchanged.
 *
 * @param errorMessage - Technical error message
 * @returns User-friendly error message
 */
function getUserFriendlyMessage(errorMessage: string): string {
  // Authentication errors
  if (errorMessage.includes("Not authenticated")) {
    return "Please sign in to continue";
  }

  // Authorization errors
  if (errorMessage.includes("Not authorized")) {
    return "You don't have permission for this action";
  }

  // Validation errors (already user-friendly, pass through)
  if (
    errorMessage.includes("Reps must") ||
    errorMessage.includes("Weight must") ||
    errorMessage.includes("Unit must") ||
    errorMessage.includes("Exercise name") ||
    errorMessage.includes("Duration must")
  ) {
    return errorMessage;
  }

  // Not found errors
  if (errorMessage.includes("not found")) {
    return "Item not found. It may have been deleted.";
  }

  // Duplicate errors (already user-friendly)
  if (errorMessage.includes("already exists")) {
    return errorMessage;
  }

  // Generic fallback
  return "Something went wrong. Please try again.";
}
