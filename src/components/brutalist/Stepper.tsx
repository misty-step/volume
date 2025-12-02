import { useEffect, useMemo, useState } from "react";
import { BrutalistButton } from "./BrutalistButton";
import { cn } from "@/lib/utils";

export interface StepperProps {
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  getStep?: (value: number) => number;
  disabled?: boolean;
  label: string;
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * Brutalist numeric stepper with large tap targets and optional smart step calculation.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 1,
  getStep,
  disabled = false,
  label,
  formatValue,
  className,
}: StepperProps) {
  const current = value ?? min;

  const computedStep = useMemo(
    () => (getStep ? getStep(current) : step),
    [current, getStep, step]
  );

  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const [announcement, setAnnouncement] = useState(
    formatValue ? formatValue(current) : String(current)
  );

  useEffect(() => {
    setAnnouncement(formatValue ? formatValue(current) : String(current));
  }, [current, formatValue]);

  const handleChange = (delta: number) => {
    const next = clamp(current + delta);
    onChange(next);
  };

  const atMin = current <= min;
  const atMax = current >= max;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrutalistButton
        variant="outline"
        size="icon"
        aria-label={`Decrease ${label}`}
        disabled={disabled || atMin}
        onClick={() => handleChange(-computedStep)}
        data-testid="stepper-decrement"
      >
        -
      </BrutalistButton>

      <div className="flex flex-col items-center">
        <span
          className="text-2xl font-mono tabular-nums"
          aria-live="polite"
          data-testid="stepper-value"
        >
          {formatValue ? formatValue(current) : current}
        </span>
        <span className="sr-only" data-testid="stepper-announcement">
          {announcement}
        </span>
      </div>

      <BrutalistButton
        variant="outline"
        size="icon"
        aria-label={`Increase ${label}`}
        disabled={disabled || atMax}
        onClick={() => handleChange(computedStep)}
        data-testid="stepper-increment"
      >
        +
      </BrutalistButton>
    </div>
  );
}
