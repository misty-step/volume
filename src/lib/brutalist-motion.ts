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
        duration: PRECISION_TIMING.FAST,
        ease: [0.9, 0.1, 0.3, 0.9],
      },
    },
    exit: {
      y: 20,
      opacity: 0,
      transition: { duration: PRECISION_TIMING.SNAP },
    },
  } as Variants,

  // Mechanical slide
  mechanicalSlide: {
    initial: { x: -100, opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: PRECISION_TIMING.FAST,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
    exit: {
      x: 100,
      opacity: 0,
      transition: { duration: PRECISION_TIMING.SNAP },
    },
  } as Variants,

  // Explosive pop (for celebrations)
  explosivePop: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: PRECISION_TIMING.FAST,
        ease: [0.2, 1, 0.3, 1],
      },
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: { duration: PRECISION_TIMING.SNAP },
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
        delayChildren: PRECISION_TIMING.MICRO,
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
        duration: PRECISION_TIMING.SNAP,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  } as Variants,

  // Button press (click interaction)
  buttonPress: {
    tap: {
      scale: 0.95,
      transition: { duration: PRECISION_TIMING.MICRO },
    },
  } as Variants,

  // Focus expand (sharp focus state)
  focusExpand: {
    focus: {
      scale: 1.02,
      transition: {
        duration: PRECISION_TIMING.MICRO,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  } as Variants,
};

/**
 * Tactile Feedback Animation
 *
 * For use with useAnimation() imperative API.
 * Triggered on button press for tactile feedback.
 *
 * @example
 * ```tsx
 * const controls = useAnimation();
 * const handleClick = () => controls.start(tactilePulse);
 *
 * <motion.div animate={controls}>
 *   <Button onClick={handleClick}>Click me</Button>
 * </motion.div>
 * ```
 */
export const tactilePulse = {
  scale: [1, 0.97, 1],
  transition: {
    duration: PRECISION_TIMING.MICRO, // 0.146s - under 200ms constraint
    ease: [0.4, 0.0, 0.2, 1], // ease-out
  },
};

/**
 * Motion Presets - Reusable animation patterns for common UI contexts
 *
 * Use these presets for consistent motion vocabulary across the app.
 * Each preset is a complete Framer Motion variants object ready to use.
 *
 * # When to Use Each Preset
 *
 * ## cardEntrance
 * Use for: Dashboard cards, analytics widgets, modal dialogs, detail views
 * Effect: Gentle fade + slide up from below with golden ratio timing
 * Example: Analytics cards appearing on page load, stat cards on dashboard
 *
 * ## listStagger
 * Use for: Exercise lists, set history, workout logs, any vertical list
 * Effect: Sequential reveal with staggered timing (50ms delay between items)
 * Example: Exercise list on /exercises page, set history on /history page
 * Note: Apply to parent container, pair with cardEntrance on list items
 *
 * ## numberReveal
 * Use for: Numeric counters, stat updates, weight inputs, PR celebrations
 * Effect: Scale + fade reveal with emphasis on numeric importance
 * Example: PR badge appearing, form input focusing, stat updating
 *
 * @example
 * // Card entrance on dashboard
 * <motion.div variants={motionPresets.cardEntrance} initial="initial" animate="animate">
 *   <StatCard />
 * </motion.div>
 *
 * @example
 * // List stagger on exercise list
 * <motion.div variants={motionPresets.listStagger} initial="initial" animate="animate">
 *   {exercises.map(ex => (
 *     <motion.div key={ex.id} variants={motionPresets.cardEntrance}>
 *       <ExerciseCard exercise={ex} />
 *     </motion.div>
 *   ))}
 * </motion.div>
 *
 * @example
 * // Number reveal on PR achievement
 * <motion.span variants={motionPresets.numberReveal} initial="initial" animate="animate">
 *   315 lbs
 * </motion.span>
 */
export const motionPresets = {
  /**
   * Card Entrance - For dashboard cards, widgets, and detail views
   * Gentle fade + slide up with golden ratio BASE timing (0.618s)
   */
  cardEntrance: {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: PRECISION_TIMING.BASE,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: PRECISION_TIMING.FAST,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  } as Variants,

  /**
   * List Stagger - For vertical lists (exercises, sets, workouts)
   * Apply to parent container, pair with cardEntrance on children
   * 50ms stagger delay creates smooth sequential reveal
   */
  listStagger: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05, // 50ms between each item
        delayChildren: PRECISION_TIMING.MICRO, // 146ms before first item
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.03, // Faster exit (30ms)
        staggerDirection: -1, // Exit in reverse order
      },
    },
  } as Variants,

  /**
   * Number Reveal - For numeric metrics, counters, and stats
   * Scale + fade with emphasis on importance of numeric data
   * Slightly more dramatic than cardEntrance for numeric prominence
   */
  numberReveal: {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: PRECISION_TIMING.FAST,
        ease: [0.2, 1, 0.3, 1], // Explosive easing for numeric emphasis
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: PRECISION_TIMING.SNAP,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  } as Variants,
};
