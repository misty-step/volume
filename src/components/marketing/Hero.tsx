"use client";

import Link from "next/link";
import { forwardRef, type HTMLAttributes } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { fadeInUp, scaleIn, slideIn, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { HERO_STATS } from "./constants";

export interface HeroProps extends HTMLAttributes<HTMLElement> {}

export const Hero = forwardRef<HTMLElement, HeroProps>(function Hero(
  { className, ...props },
  ref
) {
  const handleCtaClick = (label: string) => {
    trackEvent("Marketing CTA Click", {
      placement: "hero",
      label,
    });
  };

  return (
    <section
      id="why-volume"
      ref={ref}
      className={cn(
        "relative overflow-hidden border-b bg-gradient-to-b from-slate-950 via-slate-950 to-background text-white dark:text-white",
        className
      )}
      {...props}
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:px-8 lg:py-28">
        <motion.div
          className="space-y-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.p
            variants={fadeInUp}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/70"
          >
            Fast logging · Honest insights
          </motion.p>

          <motion.div variants={fadeInUp} className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Track every set. See the trend.
            </h1>
            <p className="text-lg text-white/80">
              A workout tracker built for the seconds between sets. Log fast,
              stay consistent, and get weekly AI notes that actually help you
              train better.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button asChild size="comfortable">
              <Link
                href="/sign-up"
                onClick={() => handleCtaClick("Get Started — free")}
              >
                Get Started — free
              </Link>
            </Button>
            <Button variant="secondary" asChild size="comfortable">
              <Link
                href="#how-it-works"
                onClick={() => handleCtaClick("See how it works")}
              >
                See how it works
              </Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeInUp} className="text-sm text-white/60">
            No templates required. No credit card required.
          </motion.p>

          <motion.ul
            className="grid gap-4 text-white/80 sm:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            {HERO_STATS.map((stat) => (
              <motion.li
                key={stat.label}
                variants={scaleIn}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-2xl font-semibold text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-white/70">{stat.label}</p>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <MockDevicePreview />
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-40 h-80 bg-gradient-to-t from-background" />
    </section>
  );
});

function MockDevicePreview() {
  return (
    <motion.div
      variants={slideIn("right")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="relative mx-auto w-full max-w-[420px]"
    >
      <div
        className="absolute -inset-8 rounded-[32px] bg-primary/30 blur-3xl"
        aria-hidden
      />
      <div className="relative rounded-[32px] border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-white/70">Today</p>
            <p className="text-3xl font-semibold text-white">
              Bench + Pull Day
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-white/60">Next set</p>
            <p className="text-2xl font-semibold text-white">4 × 8 @ 135 lbs</p>
            <p className="text-sm text-white/60">Rest: 90 sec</p>
          </div>
          <div className="space-y-3 text-white/80">
            <div className="flex items-center justify-between text-sm">
              <span>Heatmap</span>
              <span className="text-white">🔥 92%</span>
            </div>
            <div className="relative h-2 rounded-full bg-white/10">
              <span className="absolute inset-y-0 left-0 w-5/6 rounded-full bg-primary" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              AI insight · “Volume is trending up 7% vs last week. Keep
              Wednesday lighter for recovery.”
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-x-8 -bottom-4 h-12 rounded-full bg-black/70 blur-2xl"
        aria-hidden
      />
    </motion.div>
  );
}
