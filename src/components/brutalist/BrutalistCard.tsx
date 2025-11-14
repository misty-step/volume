"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface BrutalistCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "danger" | "success";
  textured?: boolean;
}

export function BrutalistCard({
  className,
  variant = "default",
  textured = false,
  children,
  ...props
}: BrutalistCardProps) {
  const variantStyles = {
    default: "border-concrete-black dark:border-concrete-white",
    danger: "border-danger-red",
    success: "border-neon-green",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      className={cn(
        "border-3 bg-background",
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
