import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  BillingPanelBlock,
  ConfirmationBlock,
  DetailPanelBlock,
  EntityListBlock,
  MetricsBlock,
  QuickLogFormBlock,
  StatusBlock,
  SuggestionsBlock,
  TableBlock,
  TrendBlock,
  UndoBlock,
} from "@/components/ui/coach-block";
import type { CoachBlock } from "@/lib/coach/schema";

function buildTrendPoints(count = 14) {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    label: `D${index + 1}`,
    value: index + 1,
  }));
}

describe("StatusBlock", () => {
  it("renders title and description", () => {
    render(
      <StatusBlock
        tone="success"
        title="Set logged"
        description="Your latest set has been saved."
      />
    );

    expect(screen.getByText("Set logged")).toBeInTheDocument();
    expect(
      screen.getByText("Your latest set has been saved.")
    ).toBeInTheDocument();
  });

  it("renders without description", () => {
    render(<StatusBlock tone="info" title="Heads up" />);

    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.queryByText("No description")).not.toBeInTheDocument();
  });
});

describe("UndoBlock", () => {
  it("calls onUndo with action and turn ids", () => {
    const onUndo = vi.fn();
    render(
      <UndoBlock
        title="Undo this"
        description="Revert the last change."
        actionId="action_1"
        turnId="turn_1"
        onUndo={onUndo}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledWith("action_1", "turn_1");
  });

  it("disables the button when onUndo is missing", () => {
    render(<UndoBlock actionId="action_2" turnId="turn_2" />);

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});

describe("MetricsBlock", () => {
  it("renders metrics values", () => {
    render(
      <MetricsBlock
        title="Weekly metrics"
        metrics={[
          { label: "Sets", value: "12" },
          { label: "Volume", value: "4300", unit: "lbs" },
        ]}
      />
    );

    expect(screen.getByText("Weekly metrics")).toBeInTheDocument();
    expect(screen.getByText("Sets")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Volume")).toBeInTheDocument();
    expect(screen.getByText("4300")).toBeInTheDocument();
    expect(screen.getByText("lbs")).toBeInTheDocument();
  });

  it("renders safely with empty metrics array", () => {
    const { container } = render(
      <MetricsBlock title="No metrics yet" metrics={[]} />
    );

    expect(screen.getByText("No metrics yet")).toBeInTheDocument();
    expect(container.querySelectorAll("div.grid > div")).toHaveLength(0);
  });
});

describe("TrendBlock", () => {
  it("renders a 14-bar chart with totals", () => {
    const points = buildTrendPoints(14);
    render(
      <TrendBlock
        title="Volume"
        subtitle="Last two weeks"
        points={points}
        bestDay={14}
        total={105}
        metric="reps"
      />
    );

    expect(screen.getByText("Volume")).toBeInTheDocument();
    expect(screen.getByText("Last two weeks")).toBeInTheDocument();
    expect(screen.getByText("105 reps")).toBeInTheDocument();
    const chart = screen.getByLabelText("Volume trend chart");
    expect(chart.querySelectorAll("rect")).toHaveLength(14);
  });

  it("renders safely with empty points", () => {
    render(
      <TrendBlock
        title="Duration"
        points={[]}
        bestDay={0}
        total={120}
        metric="duration"
      />
    );

    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("2 min")).toBeInTheDocument();
    const chart = screen.getByLabelText("Duration trend chart");
    expect(chart.querySelectorAll("rect")).toHaveLength(0);
  });
});

describe("TableBlock", () => {
  it("renders rows with label, value, and meta", () => {
    render(
      <TableBlock
        title="Session Summary"
        rows={[
          { label: "Bench", value: "3 sets", meta: "Top: 185 x 5" },
          { label: "Row", value: "4 sets" },
        ]}
      />
    );

    expect(screen.getByText("Session Summary")).toBeInTheDocument();
    expect(screen.getByText("Bench")).toBeInTheDocument();
    expect(screen.getByText("3 sets")).toBeInTheDocument();
    expect(screen.getByText("Top: 185 x 5")).toBeInTheDocument();
    expect(screen.getByText("Row")).toBeInTheDocument();
    expect(screen.getByText("4 sets")).toBeInTheDocument();
  });

  it("renders safely with empty rows", () => {
    render(<TableBlock title="No rows yet" rows={[]} />);

    expect(screen.getByText("No rows yet")).toBeInTheDocument();
    expect(screen.queryByText("3 sets")).not.toBeInTheDocument();
  });
});

describe("EntityListBlock", () => {
  it("renders items and triggers onPrompt from item action", () => {
    const onPrompt = vi.fn();
    render(
      <EntityListBlock
        title="Exercises"
        description="Suggested next moves"
        onPrompt={onPrompt}
        items={[
          {
            id: "bench",
            title: "Bench Press",
            subtitle: "Chest",
            meta: "Last: 185 x 5",
            tags: ["push", "compound"],
            prompt: "Open bench details",
          },
        ]}
      />
    );

    expect(screen.getByText("Exercises")).toBeInTheDocument();
    expect(screen.getByText("Suggested next moves")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Chest")).toBeInTheDocument();
    expect(screen.getByText("Last: 185 x 5")).toBeInTheDocument();
    expect(screen.getByText("push")).toBeInTheDocument();
    expect(screen.getByText("compound")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onPrompt).toHaveBeenCalledWith("Open bench details");
  });

  it("shows empty state when items are empty", () => {
    render(
      <EntityListBlock
        title="Exercises"
        items={[]}
        emptyLabel="No tracked exercises."
        onPrompt={() => {}}
      />
    );

    expect(screen.getByText("No tracked exercises.")).toBeInTheDocument();
  });
});

describe("DetailPanelBlock", () => {
  it("renders fields and prompt chips", () => {
    const onPrompt = vi.fn();
    render(
      <DetailPanelBlock
        title="Set detail"
        description="Review details"
        fields={[
          { label: "Exercise", value: "Bench Press" },
          { label: "Top set", value: "185 x 5", emphasis: true },
        ]}
        prompts={["Show progression", "Swap exercise"]}
        onPrompt={onPrompt}
      />
    );

    expect(screen.getByText("Set detail")).toBeInTheDocument();
    expect(screen.getByText("Review details")).toBeInTheDocument();
    expect(screen.getByText("Exercise")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Top set")).toBeInTheDocument();
    expect(screen.getByText("185 x 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show progression" }));
    expect(onPrompt).toHaveBeenCalledWith("Show progression");
  });

  it("renders safely without prompts", () => {
    render(
      <DetailPanelBlock
        title="Set detail"
        fields={[{ label: "Exercise", value: "Bench Press" }]}
        prompts={[]}
        onPrompt={() => {}}
      />
    );

    expect(screen.getByText("Set detail")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show progression" })
    ).not.toBeInTheDocument();
  });
});

describe("SuggestionsBlock", () => {
  it("renders up to 3 prompts and triggers onPrompt", () => {
    const onPrompt = vi.fn();
    render(
      <SuggestionsBlock prompts={["A", "B", "C", "D"]} onPrompt={onPrompt} />
    );

    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "C" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "D" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onPrompt).toHaveBeenCalledWith("B");
  });

  it("renders safely with no prompts", () => {
    render(<SuggestionsBlock prompts={[]} onPrompt={() => {}} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("BillingPanelBlock", () => {
  const trialBlock: Extract<CoachBlock, { type: "billing_panel" }> = {
    type: "billing_panel",
    title: "Billing",
    subtitle: "Plan details",
    status: "trial",
    trialDaysRemaining: 9,
    periodEnd: "2026-03-01",
    ctaLabel: "Manage billing",
    ctaAction: "open_billing_portal",
  };

  it("renders billing data and triggers portal action", () => {
    const onClientAction = vi.fn();
    render(
      <BillingPanelBlock block={trialBlock} onClientAction={onClientAction} />
    );

    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Plan details")).toBeInTheDocument();
    expect(screen.getByText("trial")).toBeInTheDocument();
    expect(screen.getByText("Trial days left: 9")).toBeInTheDocument();
    expect(screen.getByText("Period end: 2026-03-01")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manage billing" }));
    expect(onClientAction).toHaveBeenCalledWith("open_billing_portal");
  });

  it("renders without CTA when cta fields are missing", () => {
    const block: Extract<CoachBlock, { type: "billing_panel" }> = {
      type: "billing_panel",
      title: "Billing",
      status: "active",
    };
    render(<BillingPanelBlock block={block} />);

    expect(screen.getByText("active")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /billing|upgrade|manage/i })
    ).not.toBeInTheDocument();
  });
});

describe("ConfirmationBlock", () => {
  it("triggers confirm and cancel handler paths", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onPrompt = vi.fn((prompt: string) => {
      if (prompt === "confirm delete") onConfirm();
      if (prompt === "cancel delete") onCancel();
    });

    render(
      <ConfirmationBlock
        title="Delete this set?"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        confirmPrompt="confirm delete"
        cancelPrompt="cancel delete"
        onPrompt={onPrompt}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));

    expect(onPrompt).toHaveBeenCalledWith("confirm delete");
    expect(onPrompt).toHaveBeenCalledWith("cancel delete");
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders only confirm button when cancelPrompt is not provided", () => {
    render(
      <ConfirmationBlock
        title="Confirm"
        confirmPrompt="confirm"
        onPrompt={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" })
    ).not.toBeInTheDocument();
  });
});

describe("QuickLogFormBlock", () => {
  const block: Extract<CoachBlock, { type: "quick_log_form" }> = {
    type: "quick_log_form",
    title: "Quick log",
    defaultUnit: "lbs",
  };

  it("accepts input and submits prompt with weight and selected unit", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    const exerciseInput = screen.getByLabelText("Exercise") as HTMLInputElement;
    const repsInput = screen.getByLabelText("Reps") as HTMLInputElement;
    const durationInput = screen.getByLabelText("Duration") as HTMLInputElement;
    const weightInput = screen.getByLabelText("Weight") as HTMLInputElement;
    const unitSelect = screen.getByLabelText("Unit") as HTMLSelectElement;

    fireEvent.change(exerciseInput, { target: { value: "Bench Press" } });
    fireEvent.change(repsInput, { target: { value: "8" } });
    fireEvent.change(weightInput, { target: { value: "135.5" } });
    fireEvent.change(unitSelect, { target: { value: "kg" } });

    expect(exerciseInput.value).toBe("Bench Press");
    expect(repsInput.value).toBe("8");
    expect(durationInput.value).toBe("");
    expect(weightInput.value).toBe("135.5");
    expect(unitSelect.value).toBe("kg");

    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));
    expect(onPrompt).toHaveBeenCalledWith("8 Bench Press @ 135.5 kg");
  });

  it("submits duration-based prompt", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Plank" },
    });
    fireEvent.change(screen.getByLabelText("Duration"), {
      target: { value: "90" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));

    expect(onPrompt).toHaveBeenCalledWith("90 sec Plank");
  });

  it("shows validation error when exercise is missing", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    fireEvent.change(screen.getByLabelText("Reps"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));

    expect(
      screen.getByText("Enter an exercise name before logging.")
    ).toBeInTheDocument();
    expect(onPrompt).not.toHaveBeenCalled();
  });

  it("shows validation error when reps and duration are both provided", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Bike" },
    });
    fireEvent.change(screen.getByLabelText("Reps"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Duration"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));

    expect(
      screen.getByText("Use reps or duration, not both, for one quick log.")
    ).toBeInTheDocument();
    expect(onPrompt).not.toHaveBeenCalled();
  });

  it("shows validation error for non-numeric reps", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Curl" },
    });
    fireEvent.change(screen.getByLabelText("Reps"), {
      target: { value: "10.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));
    expect(
      screen.getByText("Reps must be a whole number.")
    ).toBeInTheDocument();
    expect(onPrompt).not.toHaveBeenCalled();
  });

  it("shows validation error for non-numeric duration", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Run" },
    });
    fireEvent.change(screen.getByLabelText("Duration"), {
      target: { value: "1m30s" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));
    expect(
      screen.getByText("Duration must be in seconds.")
    ).toBeInTheDocument();

    expect(onPrompt).not.toHaveBeenCalled();
  });

  it("shows validation error for non-numeric weight", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Row" },
    });
    fireEvent.change(screen.getByLabelText("Reps"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText("Weight"), {
      target: { value: "heavy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));
    expect(screen.getByText("Weight must be numeric.")).toBeInTheDocument();

    expect(onPrompt).not.toHaveBeenCalled();
  });

  it("shows validation error when both reps and duration are empty", () => {
    const onPrompt = vi.fn();
    render(<QuickLogFormBlock block={block} onPrompt={onPrompt} />);

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "Push Up" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Set" }));

    expect(
      screen.getByText("Add reps or duration to log this set.")
    ).toBeInTheDocument();
    expect(onPrompt).not.toHaveBeenCalled();
  });
});
