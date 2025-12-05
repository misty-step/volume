import { BrutalistCard } from "@/components/brutalist/BrutalistCard";
import { BrutalistButton } from "@/components/brutalist/BrutalistButton";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/brutalist-motion";
import Link from "next/link";

/**
 * Custom 404 Not Found page with brutalist design
 *
 * Design Philosophy:
 * - "Failed Rep" gym metaphor transforms frustration into familiarity
 * - Minimal design: single red underline (barbell on floor) as only decorative element
 * - Restrained motion: golden ratio timing (0.618s) with mechanical easing
 * - Clear action hierarchy: one primary CTA (reset to home)
 *
 * Accessibility:
 * - role="alert" announces error to screen readers
 * - aria-live="polite" for non-intrusive announcement
 * - Semantic HTML (h1, h2, p)
 * - autoFocus on primary CTA for keyboard navigation
 * - WCAG AAA contrast: danger-red on white
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pb-safe bg-background">
      <BrutalistCard
        variant="danger"
        textured
        className="max-w-2xl w-full p-6 md:p-12"
        role="alert"
        aria-live="polite"
      >
        <motion.div
          variants={motionPresets.cardEntrance}
          initial="initial"
          animate="animate"
          className="space-y-8 text-center"
        >
          {/* 404 Hero Number with Barbell Underline */}
          <motion.div
            variants={motionPresets.numberReveal}
            className="space-y-2"
          >
            <h1 className="font-mono text-7xl md:text-9xl font-black text-danger-red tabular-nums leading-none">
              404
            </h1>
            {/* Barbell on floor (loaded bar metaphor) */}
            <div className="w-32 h-1 bg-danger-red mx-auto" />
          </motion.div>

          {/* Gym Metaphor Label */}
          <h2 className="font-display text-3xl md:text-4xl uppercase tracking-wider">
            Failed Rep
          </h2>

          {/* Explanation - Direct, Non-Apologetic */}
          <p className="font-mono text-base md:text-lg text-muted-foreground">
            Page not found. Reset and try again from home.
          </p>

          {/* Primary Action - Auto-focused for Keyboard Nav */}
          <BrutalistButton variant="danger" size="lg" autoFocus asChild>
            <Link href="/today">RESET TO HOME →</Link>
          </BrutalistButton>

          {/* Technical Detail for Debugging */}
          <p className="font-mono text-sm text-muted-foreground/60">/404</p>
        </motion.div>
      </BrutalistCard>
    </div>
  );
}
