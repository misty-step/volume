"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { motion } from "framer-motion";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { BENEFITS } from "./constants";

export interface BenefitsProps extends HTMLAttributes<HTMLElement> {}

export const Benefits = forwardRef<HTMLElement, BenefitsProps>(
  function Benefits({ className, ...props }, ref) {
    return (
      <section
        id="features"
        ref={ref}
        className={cn("border-b bg-muted/30", className)}
        {...props}
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
          >
            <motion.p
              variants={fadeInUp}
              className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground"
            >
              Why Volume
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Built for lifters who care about clarity, not bloat.
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-muted-foreground"
            >
              Every section of the app keeps you logging faster, seeing trends
              sooner, and staying consistent week over week.
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {BENEFITS.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
              >
                <BenefitCard benefit={benefit} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    );
  }
);

function BenefitCard({ benefit }: { benefit: (typeof BENEFITS)[number] }) {
  const Icon = benefit.icon;

  return (
    <Card className="h-full border-muted bg-background/80">
      <div className="flex flex-col gap-4 p-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl">{benefit.title}</CardTitle>
          <CardDescription>{benefit.description}</CardDescription>
        </div>
      </div>
    </Card>
  );
}
