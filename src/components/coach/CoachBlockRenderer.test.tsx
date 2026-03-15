import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../test/utils";
import {
  StatusBlock,
  UndoBlock,
  BillingPanelBlock,
  QuickLogFormBlock,
} from "@/components/ui/coach-block";

/**
 * These tests verify visual rendering of coach block UI components is
 * unchanged after the json-render migration. The components themselves
 * are unchanged — only the orchestration layer that calls them changed
 * (from a switch statement to defineRegistry).
 */
describe("Coach block UI components", () => {
  it("renders undo blocks and calls onUndo with action and turn ids", async () => {
    const onUndo = vi.fn();

    render(
      <UndoBlock
        title="Undo this log"
        description="Revert the logged set."
        actionId="action_123"
        turnId="turn_456"
        onUndo={onUndo}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onUndo).toHaveBeenCalledWith("action_123", "turn_456");
  });

  it("renders billing panel and triggers client action", async () => {
    const onClientAction = vi.fn();

    render(
      <BillingPanelBlock
        block={{
          type: "billing_panel",
          status: "trial",
          title: "Subscription",
          ctaLabel: "Upgrade",
          ctaAction: "open_checkout",
        }}
        onClientAction={onClientAction}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Upgrade" }));
    expect(onClientAction).toHaveBeenCalledWith("open_checkout");
  });

  it("renders quick log form and submits prompt", async () => {
    const onPrompt = vi.fn();

    render(
      <QuickLogFormBlock
        block={{
          type: "quick_log_form",
          title: "Quick log",
          defaultUnit: "lbs",
        }}
        onPrompt={onPrompt}
      />
    );

    await userEvent.type(
      screen.getByPlaceholderText("Exercise name"),
      "Push-ups"
    );
    await userEvent.type(screen.getByPlaceholderText("Reps"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Log Set" }));

    expect(onPrompt).toHaveBeenCalledWith("12 Push-ups");
  });
});
