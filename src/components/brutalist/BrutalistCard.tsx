"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { motionPresets } from "@/lib/brutalist-motion";

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
        variants={motionPresets.cardEntrance}
        initial="initial"
        animate="animate"
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
