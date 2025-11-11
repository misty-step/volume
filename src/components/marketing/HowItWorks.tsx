"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { motion } from "framer-motion";

import { fadeInUp, slideIn, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { HOW_IT_WORKS_STEPS } from "./constants";

export interface HowItWorksProps extends HTMLAttributes<HTMLElement> {}

export const HowItWorks = forwardRef<HTMLElement, HowItWorksProps>(
  function HowItWorks({ className, ...props }, ref) {
    return (
      <section
        id="how-it-works"
        ref={ref}
        className={cn("border-b bg-background", className)}
        {...props}
      >
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground"
            >
              How it works
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Three steps, no fluff.
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-muted-foreground"
            >
              From first set to weekly insights, Volume removes friction so you
              can train with clarity.
            </motion.p>
          </motion.div>

          <motion.ol
            className="mt-12 space-y-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                variants={slideIn(index % 2 === 0 ? "left" : "right")}
                className="flex flex-col gap-4 rounded-3xl border border-muted bg-muted/20 px-6 py-8 sm:flex-row sm:items-start"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-base text-muted-foreground">
                    {step.description}
                  </p>
                  <p className="text-sm text-muted-foreground/80">
                    {step.detail}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>
    );
  }
);
