import { toast } from "sonner";
import { type PRResult } from "@/lib/pr-detection";

export function showPRCelebration(
  exerciseName: string,
  prResult: PRResult,
  unit: string = "lbs"
): void {
  const { type, currentValue, previousValue } = prResult;

  let description: string;
  switch (type) {
    case "weight":
      description = `${currentValue} ${unit} (previous: ${previousValue} ${unit})`;
      break;
    case "volume":
      description = `${currentValue} ${unit} total volume (previous: ${previousValue} ${unit})`;
      break;
    case "reps":
      description = `${currentValue} reps (previous: ${previousValue} reps)`;
      break;
  }

  toast.success(`🎉 NEW PR! ${exerciseName}`, {
    description,
    duration: 5000,
    icon: "🏆",
  });
}
