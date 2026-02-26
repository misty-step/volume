"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { handleMutationError } from "@/lib/error-handler";

interface FirstRunExperienceProps {
  onExerciseCreated: (exerciseId: Id<"exercises">) => void;
}

const POPULAR_EXERCISES = [
  "Push-ups",
  "Pull-ups",
  "Squats",
  "Bench Press",
  "Deadlift",
  "Rows",
];

export function FirstRunExperience({
  onExerciseCreated,
}: FirstRunExperienceProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createExercise = useAction(api.exercises.createExercise);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreateExercise = async (exerciseName: string) => {
    if (!exerciseName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const exerciseId = await createExercise({ name: exerciseName.trim() });
      onExerciseCreated(exerciseId);
    } catch (error) {
      handleMutationError(error, "Create Exercise");
      setIsCreating(false);
    }
  };

  const handleQuickCreate = (exerciseName: string) => {
    handleCreateExercise(exerciseName);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateExercise(name);
    }
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Welcome to Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-muted-foreground text-sm mb-4">
            Create your first exercise to begin tracking
          </p>
        </div>

        {/* Inline Exercise Creator */}
        <div className="mb-6 p-4 border-3 border-concrete-black dark:border-concrete-white">
          <div className="space-y-3">
            <Input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Exercise name (e.g., Push-ups)"
              disabled={isCreating}
            />
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => handleCreateExercise(name)}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>

        {/* Popular Exercises Quick Create */}
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3">
            Or select a popular exercise:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {POPULAR_EXERCISES.map((exercise) => (
              <Button
                key={exercise}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickCreate(exercise)}
                disabled={isCreating}
              >
                {exercise}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
