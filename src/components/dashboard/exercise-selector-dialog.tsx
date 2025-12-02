import { useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BrutalistButton } from "@/components/brutalist";
import { cn } from "@/lib/utils";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { Exercise } from "@/types/domain";

export interface ExerciseSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  selectedId: string | null;
  onSelect: (exerciseId: string) => void;
  onCreateNew: () => void;
}

const triggerButton = (
  selectedExercise: Exercise | undefined,
  open: boolean,
  isSubmitting: boolean
) => (
  <BrutalistButton
    type="button"
    variant="outline"
    role="combobox"
    aria-expanded={open}
    className={cn(
      "w-full h-12 justify-between font-mono normal-case",
      !selectedExercise && "text-muted-foreground"
    )}
    disabled={isSubmitting}
    data-testid="exercise-selector-trigger"
  >
    {selectedExercise?.name || "SELECT..."}
    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
  </BrutalistButton>
);

const commandList = (
  exercises: Exercise[],
  selectedId: string | null,
  onSelect: (exerciseId: string) => void,
  onCreateNew: () => void,
  close: () => void
) => (
  <Command>
    <CommandInput
      placeholder="Search exercises..."
      autoFocus
      data-testid="exercise-search"
    />
    <CommandList>
      <CommandEmpty>No exercises found.</CommandEmpty>
      <CommandGroup>
        {exercises.map((exercise) => (
          <CommandItem
            key={exercise._id}
            value={exercise.name}
            onSelect={() => {
              onSelect(exercise._id as string);
              close();
            }}
            data-testid={`exercise-option-${exercise._id}`}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                selectedId === exercise._id ? "opacity-100" : "opacity-0"
              )}
            />
            {exercise.name}
          </CommandItem>
        ))}
        <CommandItem
          value="CREATE_NEW"
          onSelect={() => {
            close();
            onCreateNew();
          }}
          className="border-t"
          data-testid="exercise-create-new"
        >
          + Create New
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

export function ExerciseSelectorDialog({
  open,
  onOpenChange,
  exercises,
  selectedId,
  onSelect,
  onCreateNew,
}: ExerciseSelectorDialogProps) {
  const isMobile = useMobileViewport();
  const selectedExercise = useMemo(
    () => exercises.find((ex) => ex._id === selectedId),
    [exercises, selectedId]
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {triggerButton(selectedExercise, open, false)}
        </DialogTrigger>
        <DialogContent
          className={cn(
            "fixed inset-0 z-50 flex max-w-none translate-x-0 translate-y-0 flex-col border-t-3 border-concrete-black dark:border-concrete-white bg-background p-0 shadow-none",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom pb-safe"
          )}
        >
          <div className="flex items-center justify-between border-b-3 border-concrete-black dark:border-concrete-white p-4">
            <span className="font-display text-lg uppercase tracking-wide">
              Select Exercise
            </span>
            <DialogClose asChild>
              <BrutalistButton
                variant="ghost"
                size="icon"
                aria-label="Close"
                data-testid="exercise-dialog-close"
              >
                <X className="h-4 w-4" />
              </BrutalistButton>
            </DialogClose>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {commandList(exercises, selectedId, onSelect, onCreateNew, () =>
              onOpenChange(false)
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {triggerButton(selectedExercise, open, false)}
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {commandList(exercises, selectedId, onSelect, onCreateNew, () =>
          onOpenChange(false)
        )}
      </PopoverContent>
    </Popover>
  );
}
