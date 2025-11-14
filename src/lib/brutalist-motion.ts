import { Variants } from "framer-motion";

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
};
