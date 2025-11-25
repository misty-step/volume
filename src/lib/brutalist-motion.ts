import { Variants } from "framer-motion";

/**
 * Precision timing constants based on golden ratio (φ ≈ 0.618)
 *
 * The golden ratio creates mathematically harmonious motion that feels
 * both precise and organic. These timings are derived from φ and its powers:
 * - BASE: φ (0.618s) - Primary motion duration
 * - FAST: φ² (0.382s) - Quick interactions
 * - SLOW: φ × 1.618 (1.0s) - Deliberate, emphasized motion
 * - SNAP: φ³ (0.236s) - Instant feedback
 * - MICRO: φ⁴ (0.146s) - Subtle transitions
 */
export const PRECISION_TIMING = {
  MICRO: 0.146, // φ⁴ - Subtle micro-interactions (hover, focus)
  SNAP: 0.236, // φ³ - Instant feedback (tap, click)
  FAST: 0.382, // φ² - Quick transitions (exit, collapse)
  BASE: 0.618, // φ   - Primary motion (entrance, expand)
  SLOW: 1.0, // φ × 1.618 - Deliberate motion (celebration, emphasis)
} as const;

export const brutalistMotion = {
  // Weight drop animation
  weightDrop: {
    initial: { y: -20, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.9, 0.1, 0.3, 0.9],
      },
    },
    exit: {
      y: 20,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  } as Variants,

  // Mechanical slide
  mechanicalSlide: {
    initial: { x: -100, opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
    exit: {
      x: 100,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  } as Variants,

  // Explosive pop (for celebrations)
  explosivePop: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: [0.2, 1, 0.3, 1],
      },
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  } as Variants,

  // Stagger children (for lists)
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  } as Variants,

  // Exercise list stagger (for settings page)
  exerciseListStagger: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  } as Variants,

  // Exercise item slide (individual list entries)
  exerciseItemSlide: {
    initial: { x: -20, opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  } as Variants,

  // Button press (click interaction)
  buttonPress: {
    tap: {
      scale: 0.95,
      transition: { duration: 0.075 },
    },
  } as Variants,

  // Focus expand (sharp focus state)
  focusExpand: {
    focus: {
      scale: 1.02,
      transition: { duration: 0.1, ease: [0.4, 0.0, 0.2, 1] },
    },
  } as Variants,
};
