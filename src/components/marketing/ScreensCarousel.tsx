"use client";

import {
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

import { fadeInUp, scaleIn, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SCREEN_SLIDES } from "./constants";

const AUTO_ADVANCE_MS = 6500;

export interface ScreensCarouselProps extends HTMLAttributes<HTMLElement> {}

export const ScreensCarousel = forwardRef<HTMLElement, ScreensCarouselProps>(
  function ScreensCarousel({ className, ...props }, ref) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
      if (prefersReducedMotion || isPaused) {
        return;
      }

      const id = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % SCREEN_SLIDES.length);
      }, AUTO_ADVANCE_MS);

      return () => clearInterval(id);
    }, [isPaused, prefersReducedMotion]);

    const activeSlide = useMemo(
      () => SCREEN_SLIDES[activeIndex],
      [activeIndex]
    );

    return (
      <section
        ref={ref}
        className={cn("border-b bg-muted/20", className)}
        {...props}
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="space-y-6"
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={() => setIsPaused(false)}
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground"
            >
              Product preview
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              See the flow in motion.
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-muted-foreground"
            >
              Rotate through Today, Analytics, and AI recap views. Hover or
              focus to pause the carousel, then pick a screen to explore.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-wrap gap-3">
              {SCREEN_SLIDES.map((slide, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                    aria-current={isActive}
                  >
                    {slide.title}
                  </button>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className="absolute -inset-6 rounded-[32px] bg-primary/20 blur-3xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[28px] border border-border bg-background shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden />
                <span
                  className="h-2 w-2 rounded-full bg-yellow-300"
                  aria-hidden
                />
                <span
                  className="h-2 w-2 rounded-full bg-emerald-400"
                  aria-hidden
                />
                <p className="ml-3 text-sm font-medium text-muted-foreground">
                  {activeSlide.title}
                </p>
              </div>
              <div className="grid gap-6 px-6 py-8">
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {activeSlide.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeSlide.callout}
                  </p>
                </div>
                <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {activeSlide.statLabel}
                  </p>
                  <p className="text-4xl font-semibold text-foreground">
                    {activeSlide.statValue}
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <MockMetric
                      label="Consistency"
                      value="On track"
                      trend="Stable streak"
                    />
                    <MockMetric
                      label="Recovery"
                      value="Dialed"
                      trend="RPE holding 7-8"
                    />
                    <MockMetric
                      label="AI Note"
                      value="Shift Friday pulls lighter"
                      trend=""
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <MiniCard
                    title="Heatmap"
                    value="92%"
                    description="Week-over-week intensity"
                  />
                  <MiniCard
                    title="Sets logged"
                    value="48"
                    description="Last 7 days"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }
);

function MockMetric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-muted-foreground/80 text-xs uppercase tracking-[0.2em]">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
      {trend ? (
        <p className="text-xs text-muted-foreground/80">{trend}</p>
      ) : null}
    </div>
  );
}

function MiniCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
