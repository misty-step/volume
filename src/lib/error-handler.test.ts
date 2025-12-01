import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleMutationError } from "./error-handler";
import { toast } from "sonner";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("handleMutationError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("production logging", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("logs sanitized error message only (no full error object)", () => {
      const error = new Error("Test error message");
      handleMutationError(error, "Test Operation");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Test Operation]: Test error message"
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("does not log stack traces in production", () => {
      const error = new Error("Production error");
      handleMutationError(error, "Create Exercise");

      // Should only log string, not error object (which includes stack)
      const loggedArg = consoleErrorSpy.mock.calls[0][0];
      expect(typeof loggedArg).toBe("string");
      expect(loggedArg).not.toContain("stack");
    });
  });

  describe("development logging", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("logs full error object with stack trace", () => {
      const error = new Error("Dev error");
      handleMutationError(error, "Log Set");

      expect(consoleErrorSpy).toHaveBeenCalledWith("[Log Set]:", error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("logs error object for debugging", () => {
      const error = new Error("Test error");
      handleMutationError(error, "Delete Exercise");

      // Second argument should be the full error object
      const loggedError = consoleErrorSpy.mock.calls[0][1];
      expect(loggedError).toBe(error);
      expect(loggedError).toBeInstanceOf(Error);
    });
  });

  describe("toast notifications", () => {
    it("shows user-friendly toast message", () => {
      const error = new Error("Not authenticated");
      handleMutationError(error, "Test");

      expect(toast.error).toHaveBeenCalledWith(
        "Please sign in to continue",
        expect.objectContaining({ duration: 4000 })
      );
    });

    it("passes correct duration to toast", () => {
      const error = new Error("Some error");
      handleMutationError(error, "Test");

      expect(toast.error).toHaveBeenCalledWith(expect.any(String), {
        duration: 4000,
      });
    });
  });

  describe("error message extraction", () => {
    it("extracts message from Error instances", () => {
      const error = new Error("Specific error message");
      handleMutationError(error, "Test");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logged = consoleErrorSpy.mock.calls[0];
      expect(logged.join(" ")).toContain("Specific error message");
    });

    it('handles non-Error types with "Unknown error"', () => {
      handleMutationError("string error", "Test");

      expect(consoleErrorSpy).toHaveBeenCalled();
      // Non-Error types get "Unknown error" as message in production
      const logged = consoleErrorSpy.mock.calls[0];
      // In dev mode it logs the full object, in prod it would log "[Test]: Unknown error"
      expect(logged).toBeDefined();
    });

    it("handles null errors", () => {
      handleMutationError(null, "Test");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

describe("getUserFriendlyMessage (via handleMutationError)", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('maps "Not authenticated" to "Please sign in to continue"', () => {
    const error = new Error("Not authenticated");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Please sign in to continue",
      expect.any(Object)
    );
  });

  it('maps "Not authorized" to permission error', () => {
    const error = new Error("Not authorized to access this exercise");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "You don't have permission for this action",
      expect.any(Object)
    );
  });

  it("passes through validation errors unchanged", () => {
    const validationError = new Error("Reps must be a positive integer");
    handleMutationError(validationError, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Reps must be a positive integer",
      expect.any(Object)
    );
  });

  it("passes through weight validation errors", () => {
    const error = new Error("Weight must be a positive number");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Weight must be a positive number",
      expect.any(Object)
    );
  });

  it("passes through unit validation errors", () => {
    const error = new Error('Unit must be "lbs" or "kg"');
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      'Unit must be "lbs" or "kg"',
      expect.any(Object)
    );
  });

  it("passes through duration validation errors", () => {
    const error = new Error(
      "Duration must be between 1 and 86400 seconds (24 hours)—restart the timer and try again."
    );
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Duration must be between 1 and 86400 seconds (24 hours)—restart the timer and try again.",
      expect.any(Object)
    );
  });

  it("passes through exercise name errors", () => {
    const error = new Error("Exercise name cannot be empty");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Exercise name cannot be empty",
      expect.any(Object)
    );
  });

  it('maps "not found" errors to user-friendly message', () => {
    const error = new Error("Exercise not found");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Item not found. It may have been deleted.",
      expect.any(Object)
    );
  });

  it('passes through "already exists" errors', () => {
    const error = new Error("Exercise with this name already exists");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Exercise with this name already exists",
      expect.any(Object)
    );
  });

  it("provides generic fallback for unknown errors", () => {
    const error = new Error("Some unexpected database error");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
      expect.any(Object)
    );
  });

  it("handles empty error messages with generic fallback", () => {
    const error = new Error("");
    handleMutationError(error, "Test");

    expect(toast.error).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
      expect.any(Object)
    );
  });
});
