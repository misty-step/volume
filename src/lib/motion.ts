/**
 * Framer Motion animation variants with consistent timing.
 * All animations respect prefers-reduced-motion automatically.
 */

import { type Variants } from "framer-motion";

/** Shared animation timing and easing */
export const MOTION_CONFIG = {
  duration: 0.6,
  ease: [0.21, 0.47, 0.32, 0.98] as const, // Custom bezier for smooth acceleration
  staggerDelay: 0.1,
} as const;

/** Fade in with upward slide animation */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_CONFIG.duration,
      ease: MOTION_CONFIG.ease,
    },
  },
};

/** Slide in animation (use for alternating reveals or directional emphasis) */
export const slideIn = (direction: "left" | "right" = "left"): Variants => ({
  hidden: {
    opacity: 0,
    x: direction === "left" ? -32 : 32,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: MOTION_CONFIG.duration,
      ease: MOTION_CONFIG.ease,
    },
  },
});

/** Scale in animation (use for buttons, cards, and elements that should "pop") */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION_CONFIG.duration,
      ease: MOTION_CONFIG.ease,
    },
  },
};

/** Container variant for staggered child animations */
export const staggerContainer: Variants = {
  visible: {
    transition: {
      staggerChildren: MOTION_CONFIG.staggerDelay,
    },
  },
};
