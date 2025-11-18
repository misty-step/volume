import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isNumber = type === "number";
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border-2 border-input bg-transparent px-3 py-1 text-base transition-all duration-75 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-danger-red focus-visible:border-danger-red disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isNumber && "font-mono tabular-nums",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
