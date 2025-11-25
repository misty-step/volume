import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-75 active:scale-95 active:opacity-90 active:shadow-[inset_0_2px_4px_rgba(154,163,175,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-red disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-border shadow-sm hover:bg-primary/90 transition-shadow",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-border shadow-sm hover:bg-destructive/90",
        outline:
          "border-2 border-input bg-background hover:bg-concrete-black/5 dark:hover:bg-concrete-white/5",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-border shadow-sm hover:bg-secondary/80",
        ghost:
          "hover:bg-concrete-black/10 dark:hover:bg-concrete-white/10 active:shadow-inner",
        link: "text-primary underline-offset-4 hover:underline",
      },
      /**
       * Button size variants
       *
       * Mobile-optimized sizes (touch, comfortable) follow WCAG 2.5.5 and iOS/Android guidelines
       * for minimum 44px touch targets. See src/lib/design-tokens/mobile.ts for rationale.
       */
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
        /** 44px height - Mobile minimum touch target (iOS HIG, Material Design, WCAG 2.5.5) */
        touch: "h-11 px-4",
        /** 48px height - Recommended for primary CTAs on mobile */
        comfortable: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
