import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../test/utils";
import {
  BillingStateScene,
  ConfirmationPanel,
  ToneBadge,
} from "./CoachSceneBlocks";

describe("CoachSceneBlocks", () => {
  it("renders a tone badge for info state", () => {
    render(<ToneBadge tone="info" />);

    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  it("renders billing state CTA and triggers the callback", async () => {
    const onCta = vi.fn();

    render(
      <BillingStateScene
        status="trial"
        title="Membership"
        subtitle="Trial active"
        trialDaysRemaining={3}
        periodEnd="2026-04-01"
        ctaLabel="Upgrade"
        onCta={onCta}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Upgrade" }));

    expect(onCta).toHaveBeenCalled();
  });

  it("renders confirmation actions and dispatches both branches", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmationPanel
        title="Delete set?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));

    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
