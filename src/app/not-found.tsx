"use client";

import { BrutalistButton } from "@/components/brutalist/BrutalistButton";
import { motion } from "framer-motion";
import Link from "next/link";

/**
 * Custom 404 Not Found page with brutalist repetitive text pattern
 *
 * Design Philosophy:
 * - Brutalist maximalism: raw repetition creates visual texture
 * - Hypnotic pattern reinforces "you are lost" feeling
 * - Heavy text stroke for contrast (no boxes)
 * - Striking, memorable aesthetic unique among workout apps
 *
 * Accessibility:
 * - role="alert" announces error to screen readers
 * - aria-live="polite" for non-intrusive announcement
 * - aria-hidden on repetitive background text (prevents screen reader spam)
 * - Semantic HTML with clear focus hierarchy
 * - autoFocus on primary CTA for keyboard navigation
 * - High contrast maintained throughout
 */
export default function NotFound() {
  // Generate repeating text pattern for background
  const repeatText = "PAGE NOT FOUND  ";
  const patternRows = 30; // Number of rows to fill viewport

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-background"
      role="alert"
      aria-live="polite"
    >
      {/* Repetitive Background Pattern - Full Viewport Height */}
      <div
        className="absolute inset-0 flex flex-col justify-between overflow-hidden opacity-20 select-none pointer-events-none"
        aria-hidden="true"
      >
        {Array.from({ length: patternRows }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: i % 2 === 0 ? -100 : 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              duration: 0.618,
              delay: i * 0.02,
              ease: [0.6, 0.05, 0.01, 0.9],
            }}
            className="whitespace-nowrap font-display text-4xl md:text-6xl uppercase tracking-wider text-foreground"
            style={{
              // Offset every other row for staggered pattern
              marginLeft: i % 2 === 0 ? "0" : "-10%",
            }}
          >
            {repeatText.repeat(10)}
          </motion.div>
        ))}
      </div>

      {/* Centered 404 + Button */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.618,
            delay: 0.3,
            ease: [0.6, 0.05, 0.01, 0.9],
          }}
          className="flex flex-col items-center gap-8"
        >
          {/* 404 Number - Heavy Text Stroke */}
          <h1
            className="font-display text-9xl md:text-[12rem] font-black leading-none tracking-tight"
            style={{
              color: "hsl(var(--background))",
              textShadow: `
                -4px -4px 0 hsl(var(--foreground)),
                 4px -4px 0 hsl(var(--foreground)),
                -4px  4px 0 hsl(var(--foreground)),
                 4px  4px 0 hsl(var(--foreground)),
                -8px  0   0 hsl(var(--foreground)),
                 8px  0   0 hsl(var(--foreground)),
                 0   -8px 0 hsl(var(--foreground)),
                 0    8px 0 hsl(var(--foreground))
              `,
            }}
          >
            404
          </h1>

          {/* Primary Action */}
          <BrutalistButton variant="danger" size="lg" autoFocus asChild>
            <Link href="/today">RETURN HOME</Link>
          </BrutalistButton>
        </motion.div>
      </div>
    </div>
  );
}
