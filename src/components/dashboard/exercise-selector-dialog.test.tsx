import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../test/utils";
import { ExerciseSelectorDialog } from "./exercise-selector-dialog";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import type { Exercise } from "@/types/domain";

// Mock viewport hook to toggle mobile/desktop behavior
vi.mock("@/hooks/useMobileViewport", () => ({
  useMobileViewport: vi.fn(),
}));

const mockExercises: Exercise[] = [
  {
    _id: "ex-1" as any,
    userId: "user-1",
    name: "Bench Press",
    createdAt: Date.now(),
    _creationTime: Date.now(),
  },
  {
    _id: "ex-2" as any,
    userId: "user-1",
    name: "Squat",
    createdAt: Date.now(),
    _creationTime: Date.now(),
  },
];

function ControlledSelector({
  onSelect,
  onCreateNew,
}: {
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ExerciseSelectorDialog
      open={open}
      onOpenChange={setOpen}
      exercises={mockExercises}
      selectedId={selectedId}
      onSelect={(id) => {
        setSelectedId(id);
        onSelect(id);
      }}
      onCreateNew={onCreateNew}
    />
  );
}

describe("ExerciseSelectorDialog", () => {
  const mockedUseMobileViewport = vi.mocked(useMobileViewport);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders popover selector on desktop and selects exercise", async () => {
    mockedUseMobileViewport.mockReturnValue(false);
    const onSelect = vi.fn();
    const onCreateNew = vi.fn();

    render(
      <ControlledSelector onSelect={onSelect} onCreateNew={onCreateNew} />
    );

    await userEvent.click(screen.getByTestId("exercise-selector-trigger"));
    const option = await screen.findByTestId("exercise-option-ex-1");
    await userEvent.click(option);

    expect(onSelect).toHaveBeenCalledWith("ex-1");
    expect(onCreateNew).not.toHaveBeenCalled();
  });

  it("renders dialog on mobile and supports create new", async () => {
    mockedUseMobileViewport.mockReturnValue(true);
    const onSelect = vi.fn();
    const onCreateNew = vi.fn();

    render(
      <ControlledSelector onSelect={onSelect} onCreateNew={onCreateNew} />
    );

    await userEvent.click(screen.getByTestId("exercise-selector-trigger"));
    expect(await screen.findByText(/select exercise/i)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("exercise-create-new"));
    expect(onCreateNew).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
