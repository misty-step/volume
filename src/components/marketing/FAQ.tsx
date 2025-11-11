"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { forwardRef, useState, type HTMLAttributes } from "react";

import { trackEvent } from "@/lib/analytics";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { FAQ_ITEMS } from "./constants";

export interface FAQProps extends HTMLAttributes<HTMLElement> {}

export const FAQ = forwardRef<HTMLElement, FAQProps>(function FAQ(
  { className, ...props },
  ref
) {
  const [openItem, setOpenItem] = useState(0);

  const toggleItem = (index: number) => {
    setOpenItem((current) => {
      const nextIsOpen = current !== index;
      trackEvent("Marketing FAQ Toggle", {
        question: FAQ_ITEMS[index].question,
        isOpen: nextIsOpen,
      });
      return nextIsOpen ? index : -1;
    });
  };

  return (
    <section
      id="faq"
      ref={ref}
      className={cn("border-b bg-background", className)}
      {...props}
    >
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
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
            FAQ
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Answers for lifters who value their time.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg text-muted-foreground"
          >
            Need something else? Email hello@volume.fitness and we’ll get back
            within a day.
          </motion.p>
        </motion.div>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border/60 bg-card">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = index === openItem;
            const panelId = `faq-panel-${index}`;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => toggleItem(index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className="text-base font-medium text-foreground">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key={panelId}
                      id={panelId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.25,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                      className="overflow-hidden px-6 pb-5 text-sm text-muted-foreground"
                    >
                      <p>{item.answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
