"use client";

import { forwardRef, useEffect, useState, type HTMLAttributes } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { TESTIMONIALS } from "./constants";

const AUTO_ADVANCE_MS = 7000;

export interface TestimonialsProps extends HTMLAttributes<HTMLElement> {}

export const Testimonials = forwardRef<HTMLElement, TestimonialsProps>(
  function Testimonials({ className, ...props }, ref) {
    const [activeIndex, setActiveIndex] = useState(0);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
      if (reducedMotion) return;

      const id = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
      }, AUTO_ADVANCE_MS);

      return () => clearInterval(id);
    }, [reducedMotion]);

    return (
      <section
        ref={ref}
        className={cn("border-b bg-muted/10", className)}
        aria-label="Testimonials"
        {...props}
      >
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground"
            >
              Testimonials
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Loved by lifters who care about real progress.
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-muted-foreground"
            >
              Volume keeps crews accountable and solo lifters honest by pairing
              fast logging with high-signal insights.
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-6 md:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div key={testimonial.name} variants={scaleIn}>
                <TestimonialCard
                  testimonial={testimonial}
                  isActive={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-8 flex justify-center gap-2">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show testimonial ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-2.5 w-6 rounded-full bg-muted transition",
                  index === activeIndex && "bg-primary"
                )}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }
);

function TestimonialCard({
  testimonial,
  isActive,
  onMouseEnter,
}: {
  testimonial: (typeof TESTIMONIALS)[number];
  isActive: boolean;
  onMouseEnter: () => void;
}) {
  return (
    <Card
      className={cn(
        "h-full border border-border/60 bg-background/90 p-6 transition",
        isActive ? "shadow-xl" : "opacity-70 hover:opacity-100"
      )}
      onMouseEnter={onMouseEnter}
    >
      <p className="text-base text-foreground/90">“{testimonial.quote}”</p>
      <div className="mt-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{testimonial.name}</p>
        <p>{testimonial.role}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">
          {testimonial.metric}
        </p>
      </div>
    </Card>
  );
}
