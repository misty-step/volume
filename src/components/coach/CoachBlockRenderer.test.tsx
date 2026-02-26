import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../test/utils";
import { CoachBlockRenderer } from "./CoachBlockRenderer";

describe("CoachBlockRenderer", () => {
  it("renders undo blocks and calls onUndo with action and turn ids", async () => {
    const onUndo = vi.fn();

    render(
      <CoachBlockRenderer
        block={{
          type: "undo",
          actionId: "action_123",
          turnId: "turn_456",
          title: "Undo this log",
          description: "Revert the logged set.",
        }}
        onPrompt={() => {}}
        onUndo={onUndo}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onUndo).toHaveBeenCalledWith("action_123", "turn_456");
  });

  it("renders billing panel and triggers client action", async () => {
    const onClientAction = vi.fn();

    render(
      <CoachBlockRenderer
        block={{
          type: "billing_panel",
          status: "trial",
          title: "Subscription",
          ctaLabel: "Upgrade",
          ctaAction: "open_checkout",
        }}
        onPrompt={() => {}}
        onClientAction={onClientAction}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Upgrade" }));
    expect(onClientAction).toHaveBeenCalledWith("open_checkout");
  });

  it("renders quick log form and submits prompt", async () => {
    const onPrompt = vi.fn();

    render(
      <CoachBlockRenderer
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
