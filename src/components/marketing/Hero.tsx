"use client";

import Image from "next/image";
import Link from "next/link";
import { forwardRef, type HTMLAttributes } from "react";
import { motion, useReducedMotion } from "framer-motion";

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
  const shouldReduceMotion = useReducedMotion();

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
        <HeroDevice animate={!shouldReduceMotion} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-40 h-80 bg-gradient-to-t from-background" />
    </section>
  );
});

function HeroDevice({ animate }: { animate: boolean }) {
  const floatProps = animate
    ? {
        animate: { y: [0, -8, 0] },
        transition: { duration: 8, ease: "easeInOut", repeat: Infinity },
      }
    : {};

  return (
    <motion.div
      variants={slideIn("right")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="relative mx-auto w-full max-w-[440px]"
    >
      <div
        className="absolute -inset-10 rounded-[40px] bg-primary/20 blur-3xl"
        aria-hidden
      />
      <motion.div
        className="relative overflow-hidden rounded-[40px] border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl"
        {...floatProps}
      >
        <Image
          src="/images/device-mock-today.svg"
          alt="Preview of the Volume Today screen"
          width={375}
          height={812}
          priority
          className="w-full object-cover"
        />
      </motion.div>
      <div
        className="absolute inset-x-10 -bottom-6 h-16 rounded-full bg-black/70 blur-2xl"
        aria-hidden
      />
    </motion.div>
  );
}
