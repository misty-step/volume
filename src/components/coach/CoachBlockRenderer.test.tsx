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
});
