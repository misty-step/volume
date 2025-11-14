"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrutalistInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const BrutalistInput = React.forwardRef<HTMLInputElement, BrutalistInputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full border-3 bg-background px-4 py-3 font-mono text-lg tabular-nums",
          "placeholder:text-concrete-gray placeholder:opacity-50",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-danger-red",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-danger-red"
            : "border-concrete-black dark:border-concrete-white",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
BrutalistInput.displayName = "BrutalistInput";

export { BrutalistInput };
