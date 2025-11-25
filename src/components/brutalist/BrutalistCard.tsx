"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface BrutalistCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "danger" | "accent";
  textured?: boolean;
}

export const BrutalistCard = forwardRef<HTMLDivElement, BrutalistCardProps>(
  (
    { className, variant = "default", textured = false, children, ...props },
    ref
  ) => {
    const variantStyles = {
      default: "border-concrete-black dark:border-concrete-white",
      danger: "border-danger-red",
      accent: "border-safety-orange",
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
        className={cn(
          "border-3 bg-background transition-shadow duration-150",
          "hover:shadow-[0_0_0_1px_rgba(232,234,237,0.15)]",
          variantStyles[variant],
          textured && "concrete-texture",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

BrutalistCard.displayName = "BrutalistCard";
