"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  KeyboardEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DurationInputProps {
  value?: number;
  onChange: (seconds?: number) => void;
  disabled?: boolean;
  onEnter?: () => void;
  className?: string;
  "data-testid"?: string;
}

/**
 * Composite MM:SS input that keeps seconds as the single external value.
 * Encapsulates parsing/clamping logic so callers only reason about seconds.
 */
export const DurationInput = forwardRef<HTMLInputElement, DurationInputProps>(
  function DurationInput(
    {
      value,
      onChange,
      disabled,
      onEnter,
      className,
      "data-testid": testId,
    }: DurationInputProps,
    ref
  ) {
    const minutesRef = useRef<HTMLInputElement>(null);
    const secondsRef = useRef<HTMLInputElement>(null);
    const [minutesValue, setMinutesValue] = useState("");
    const [secondsValue, setSecondsValue] = useState("");
    const baseId = useId();
    const minutesId = `${baseId}-minutes`;
    const secondsId = `${baseId}-seconds`;

    // Mirror controlled seconds value into the two display fields
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
      if (value === undefined || Number.isNaN(value)) {
        setMinutesValue("");
        setSecondsValue("");
        return;
      }
      const mins = Math.floor(value / 60);
      const secs = value % 60;
      setMinutesValue(mins > 0 ? String(mins) : "");
      setSecondsValue(secs > 0 ? String(secs) : "");
    }, [value]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useImperativeHandle(ref, () => minutesRef.current as HTMLInputElement);

    const emitChange = (minsText: string, secsText: string) => {
      const mins = minsText === "" ? 0 : parseInt(minsText, 10) || 0;
      let secs = secsText === "" ? 0 : parseInt(secsText, 10) || 0;
      secs = clampSeconds(secs);
      const total = mins * 60 + secs;
      onChange(total > 0 ? total : undefined);
    };

    const handleMinutesChange = (value: string) => {
      // strip non-digits to guard against copy/paste noise
      const sanitized = value.replace(/[^0-9]/g, "");
      setMinutesValue(sanitized);
      emitChange(sanitized, secondsValue);
    };

    const handleSecondsChange = (value: string) => {
      const sanitized = value.replace(/[^0-9]/g, "");
      const clamped =
        sanitized === ""
          ? ""
          : String(clampSeconds(parseInt(sanitized, 10) || 0));
      setSecondsValue(clamped);
      emitChange(minutesValue, clamped);
    };

    const handleMinutesKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        secondsRef.current?.focus();
      }
    };

    const handleSecondsKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onEnter?.();
      }
    };

    return (
      <div
        className={cn(
          "grid grid-cols-[minmax(90px,1fr)_auto_minmax(90px,1fr)] items-center gap-2",
          className
        )}
        data-testid={testId}
      >
        <div>
          <label className="sr-only" htmlFor={minutesId}>
            Minutes
          </label>
          <Input
            id={minutesId}
            ref={minutesRef}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="MM"
            value={minutesValue}
            onChange={(e) => handleMinutesChange(e.target.value)}
            onKeyDown={handleMinutesKeyDown}
            className="h-[46px] tabular-nums"
            disabled={disabled}
            data-testid={testId ? `${testId}-minutes` : undefined}
          />
        </div>
        <span className="text-lg font-semibold text-muted-foreground text-center select-none">
          :
        </span>
        <div>
          <label className="sr-only" htmlFor={secondsId}>
            Seconds
          </label>
          <Input
            id={secondsId}
            ref={secondsRef}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="SS"
            value={secondsValue}
            onChange={(e) => handleSecondsChange(e.target.value)}
            onKeyDown={handleSecondsKeyDown}
            className="h-[46px] tabular-nums"
            disabled={disabled}
            data-testid={testId ? `${testId}-seconds` : undefined}
          />
        </div>
      </div>
    );
  }
);

function clampSeconds(value: number) {
  if (value < 0) return 0;
  if (value > 59) return 59;
  return value;
}
