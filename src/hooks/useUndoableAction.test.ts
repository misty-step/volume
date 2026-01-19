import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUndoableAction } from "./useUndoableAction";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("useUndoableAction", () => {
  const mockAction = vi.fn();
  const mockRestore = vi.fn();
  const mockCaptureState = vi.fn();
  const mockOnActionError = vi.fn();
  const mockOnRestoreError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAction.mockResolvedValue(undefined);
    mockRestore.mockResolvedValue(undefined);
    mockCaptureState.mockImplementation((item) => ({ ...item, captured: true }));
  });

  it("captures state before executing action", async () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Item deleted",
      })
    );

    const testItem = { id: "123", name: "Test" };

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.execute(testItem);
    });

    // Capture should be called first
    expect(mockCaptureState).toHaveBeenCalledWith(testItem);
    expect(mockCaptureState).toHaveBeenCalledBefore(mockAction);
    expect(success).toBe(true);
  });

  it("executes action with provided item", async () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Item deleted",
      })
    );

    const testItem = { id: "456" };

    await act(async () => {
      await result.current.execute(testItem);
    });

    expect(mockAction).toHaveBeenCalledWith(testItem);
  });

  it("shows toast with undo action on success", async () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Set deleted",
        undoDuration: 5000,
      })
    );

    await act(async () => {
      await result.current.execute({ id: "789" });
    });

    expect(toast.success).toHaveBeenCalledWith("Set deleted", {
      duration: 5000,
      action: expect.objectContaining({
        label: "Undo",
        onClick: expect.any(Function),
      }),
    });
  });

  it("restores state when undo clicked", async () => {
    const capturedData = { id: "item1", data: "original", captured: true };
    mockCaptureState.mockReturnValue(capturedData);

    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
      })
    );

    await act(async () => {
      await result.current.execute({ id: "item1", data: "original" });
    });

    // Extract the onClick handler from the toast call
    const toastCall = vi.mocked(toast.success).mock.calls[0];
    const toastOptions = toastCall[1] as { action: { onClick: () => Promise<void> } };

    // Simulate undo click
    await act(async () => {
      await toastOptions.action.onClick();
    });

    expect(mockRestore).toHaveBeenCalledWith(capturedData);
  });

  it("uses default 5000ms undo duration", async () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
        // No undoDuration specified
      })
    );

    await act(async () => {
      await result.current.execute({ id: "test" });
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Deleted",
      expect.objectContaining({ duration: 5000 })
    );
  });

  it("respects custom undo duration", async () => {
    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
        undoDuration: 10000,
      })
    );

    await act(async () => {
      await result.current.execute({ id: "test" });
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Deleted",
      expect.objectContaining({ duration: 10000 })
    );
  });

  it("sets isPending true during action execution", async () => {
    let resolveAction: () => void = () => {};
    mockAction.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveAction = resolve;
      })
    );

    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
      })
    );

    expect(result.current.isPending).toBe(false);

    let executePromise: Promise<void>;
    act(() => {
      executePromise = result.current.execute({ id: "test" });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveAction();
      await executePromise!;
    });

    expect(result.current.isPending).toBe(false);
  });

  it("returns false and calls onActionError on action failure", async () => {
    const error = new Error("Delete failed");
    mockAction.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
        onActionError: mockOnActionError,
      })
    );

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.execute({ id: "test" });
    });

    expect(success).toBe(false);
    expect(mockOnActionError).toHaveBeenCalledWith(error);
    expect(toast.success).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });

  it("calls onRestoreError on restore failure", async () => {
    const restoreError = new Error("Restore failed");
    mockRestore.mockRejectedValue(restoreError);

    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
        onRestoreError: mockOnRestoreError,
      })
    );

    await act(async () => {
      await result.current.execute({ id: "test" });
    });

    // Extract and call the undo handler
    const toastCall = vi.mocked(toast.success).mock.calls[0];
    const toastOptions = toastCall[1] as { action: { onClick: () => Promise<void> } };

    await act(async () => {
      await toastOptions.action.onClick();
    });

    expect(mockOnRestoreError).toHaveBeenCalledWith(restoreError);
  });

  it("does not throw when onRestoreError not provided", async () => {
    const restoreError = new Error("Restore failed");
    mockRestore.mockRejectedValue(restoreError);

    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
        // No onRestoreError
      })
    );

    await act(async () => {
      await result.current.execute({ id: "test" });
    });

    const toastCall = vi.mocked(toast.success).mock.calls[0];
    const toastOptions = toastCall[1] as { action: { onClick: () => Promise<void> } };

    // Should not throw even without error handler
    await expect(
      act(async () => {
        await toastOptions.action.onClick();
      })
    ).resolves.not.toThrow();
  });

  it("returns false when captureState throws an error", async () => {
    const captureError = new Error("Capture failed");
    mockCaptureState.mockImplementation(() => {
      throw captureError;
    });

    const { result } = renderHook(() =>
      useUndoableAction({
        action: mockAction,
        captureState: mockCaptureState,
        restore: mockRestore,
        successMessage: "Deleted",
        onActionError: mockOnActionError,
      })
    );

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.execute({ id: "test" });
    });

    expect(success).toBe(false);
    // Should call onActionError with the capture error
    expect(mockOnActionError).toHaveBeenCalledWith(captureError);
    // Action should not have been called since capture failed first
    expect(mockAction).not.toHaveBeenCalled();
    // isPending should be reset
    expect(result.current.isPending).toBe(false);
  });
});
