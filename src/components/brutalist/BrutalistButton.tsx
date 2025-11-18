"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const brutalistButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap uppercase tracking-wider font-display text-lg font-bold border-3 transition-all duration-75 disabled:pointer-events-none disabled:opacity-50 btn-press",
  {
    variants: {
      variant: {
        danger:
          "bg-danger-red text-white border-concrete-black hover:bg-danger-red/90 active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]",
        accent:
          "bg-safety-orange text-white border-concrete-black hover:bg-safety-orange/90 active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]",
        outline:
          "bg-transparent border-concrete-black dark:border-concrete-white hover:bg-concrete-black/10 dark:hover:bg-concrete-white/10",
        ghost:
          "border-0 hover:bg-concrete-black/10 dark:hover:bg-concrete-white/10",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-base",
        lg: "h-16 px-8 py-4 text-xl",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "danger",
      size: "default",
    },
  }
);

export interface BrutalistButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof brutalistButtonVariants> {
  asChild?: boolean;
}

const BrutalistButton = React.forwardRef<
  HTMLButtonElement,
  BrutalistButtonProps
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(brutalistButtonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
BrutalistButton.displayName = "BrutalistButton";

export { BrutalistButton, brutalistButtonVariants };
