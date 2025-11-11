"use client";

import Link from "next/link";
import { forwardRef, type HTMLAttributes } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { fadeInUp, scaleIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { FINAL_CTA_CONTENT } from "./constants";

export interface FinalCTAProps extends HTMLAttributes<HTMLElement> {}

export const FinalCTA = forwardRef<HTMLElement, FinalCTAProps>(
  function FinalCTA({ className, ...props }, ref) {
    const handleCtaClick = (label: string) => {
      trackEvent("Marketing CTA Click", {
        placement: "final",
        label,
      });
    };

    return (
      <section
        ref={ref}
        className={cn(
          "relative overflow-hidden border-b bg-background",
          className
        )}
        {...props}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-96 -translate-y-1/2 bg-gradient-to-b from-primary/10 via-transparent to-primary/10 blur-3xl" />
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          className="relative mx-auto max-w-4xl rounded-3xl border border-white/10 bg-slate-950 px-6 py-16 text-center text-white shadow-2xl sm:px-10"
          aria-labelledby="final-cta-heading"
        >
          <motion.p
            variants={fadeInUp}
            className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70"
          >
            {FINAL_CTA_CONTENT.eyebrow}
          </motion.p>
          <motion.h2
            id="final-cta-heading"
            variants={fadeInUp}
            className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {FINAL_CTA_CONTENT.headline}
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-lg text-white/80">
            {FINAL_CTA_CONTENT.subheadline}
          </motion.p>
          <motion.div
            variants={fadeInUp}
            className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button asChild size="comfortable">
              <Link
                href={FINAL_CTA_CONTENT.primaryCta.href}
                onClick={() =>
                  handleCtaClick(FINAL_CTA_CONTENT.primaryCta.label)
                }
              >
                {FINAL_CTA_CONTENT.primaryCta.label}
              </Link>
            </Button>
            <Button variant="secondary" asChild size="comfortable">
              <Link
                href={FINAL_CTA_CONTENT.secondaryCta.href}
                onClick={() =>
                  handleCtaClick(FINAL_CTA_CONTENT.secondaryCta.label)
                }
              >
                {FINAL_CTA_CONTENT.secondaryCta.label}
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>
    );
  }
);
