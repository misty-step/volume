"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { motion } from "framer-motion";

import { fadeInUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SOCIAL_PROOF_AVATARS, SOCIAL_PROOF_BRANDS } from "./constants";

export interface SocialProofProps extends HTMLAttributes<HTMLElement> {}

export const SocialProof = forwardRef<HTMLElement, SocialProofProps>(
  function SocialProof({ className, ...props }, ref) {
    return (
      <section
        ref={ref}
        className={cn("border-b bg-background", className)}
        aria-label="Social proof"
        {...props}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="flex flex-1 flex-col gap-4"
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground"
            >
              Trusted by
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              Independent lifters, small crews, and coaches who care about
              progress.
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-base text-muted-foreground"
            >
              1,200+ workouts were logged with Volume last month. The calm
              interface keeps teams on track even on the busiest training
              blocks.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="flex flex-1 flex-col gap-6"
          >
            <motion.div variants={fadeInUp} className="flex items-center gap-3">
              <AvatarStack />
              <div>
                <p className="text-sm font-medium text-foreground">
                  3,900+ sets logged
                </p>
                <p className="text-xs text-muted-foreground">
                  Past 30 days · zero drop-offs post-week 4
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground"
            >
              {SOCIAL_PROOF_BRANDS.map((brand) => (
                <span key={brand} className="text-foreground/80">
                  {brand}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }
);

function AvatarStack() {
  return (
    <div className="flex -space-x-3">
      {SOCIAL_PROOF_AVATARS.map((person) => (
        <div
          key={person.name}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-semibold text-foreground"
          aria-label={`${person.name}, ${person.role}`}
        >
          {person.initials}
        </div>
      ))}
    </div>
  );
}
