import { useMemo, useState } from "react";
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
  isSubmitting?: boolean;
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
    data-testid="quick-log-exercise-select"
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
  close: () => void,
  searchValue: string,
  onSearchChange: (value: string) => void
) => (
  <Command>
    <CommandInput
      placeholder="Search exercises..."
      autoFocus
      value={searchValue}
      onValueChange={onSearchChange}
      data-testid="exercise-search"
    />
    <CommandList>
      <CommandEmpty>
        <div className="flex flex-col gap-3 p-3">
          <span className="text-sm text-muted-foreground">
            No exercises found.
          </span>
          <BrutalistButton
            variant="outline"
            onClick={() => {
              close();
              onCreateNew();
            }}
            data-testid="exercise-create-empty"
          >
            Create “{searchValue || "New Exercise"}”
          </BrutalistButton>
        </div>
      </CommandEmpty>
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
  isSubmitting = false,
}: ExerciseSelectorDialogProps) {
  const isMobile = useMobileViewport();
  const [searchValue, setSearchValue] = useState("");
  const handleOpenChange = (next: boolean) => {
    if (!next) setSearchValue("");
    onOpenChange(next);
  };
  const selectedExercise = useMemo(
    () => exercises.find((ex) => ex._id === selectedId),
    [exercises, selectedId]
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {triggerButton(selectedExercise, open, isSubmitting)}
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
            {commandList(
              exercises,
              selectedId,
              onSelect,
              onCreateNew,
              () => handleOpenChange(false),
              searchValue,
              setSearchValue
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {triggerButton(selectedExercise, open, isSubmitting)}
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {commandList(
          exercises,
          selectedId,
          onSelect,
          onCreateNew,
          () => handleOpenChange(false),
          searchValue,
          setSearchValue
        )}
      </PopoverContent>
    </Popover>
  );
}
