import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[96px] w-full border-2 border-input bg-transparent px-3 py-2 text-base transition-all duration-75 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-danger-red focus-visible:border-danger-red focus-visible:shadow-[0_0_0_1px_var(--chrome-glow)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
