"use client";

import Link from "next/link";
import { forwardRef, useMemo, useState, type HTMLAttributes } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { PRICING_TIERS } from "./constants";

export interface PricingProps extends HTMLAttributes<HTMLElement> {}

export const Pricing = forwardRef<HTMLElement, PricingProps>(function Pricing(
  { className, ...props },
  ref
) {
  const [email, setEmail] = useState("");
  const proTier = useMemo(
    () => PRICING_TIERS.find((tier) => tier.isPopular),
    []
  );

  const handleCtaClick = (label: string) => {
    trackEvent("Marketing CTA Click", {
      placement: "pricing",
      label,
    });
  };

  const handleWaitlistSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!proTier) return;

    handleCtaClick(proTier.ctaLabel);

    // Basic mailto fallback until backend API exists
    const subject = encodeURIComponent("Volume Pro Waitlist");
    const body = encodeURIComponent(`Email: ${email || "(not provided)"}`);
    window.location.href = `${proTier.ctaHref}?subject=${subject}&body=${body}`;
  };

  return (
    <section
      id="pricing"
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
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.p
            variants={fadeInUp}
            className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Start free. Join the Pro waitlist when you need more.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg text-muted-foreground"
          >
            Free includes everything live today. Pro adds deeper analytics,
            coach tooling, and scheduled exports. We’ll invite waitlist folks
            first.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-6 md:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {PRICING_TIERS.map((tier) => (
            <motion.div key={tier.name} variants={scaleIn}>
              <Card
                className={cn(
                  "flex h-full flex-col gap-6 border-border/60 bg-card/90 p-6",
                  tier.isPopular && "border-primary/60 shadow-xl"
                )}
              >
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground/80">
                    {tier.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-semibold text-foreground">
                      {tier.price}
                    </p>
                    {tier.isPopular ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Coming soon
                      </span>
                    ) : null}
                  </div>
                  {tier.headline ? (
                    <p className="text-base font-medium text-foreground">
                      {tier.headline}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>

                <ul className="flex flex-1 flex-col gap-3 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className="mt-[2px] h-4 w-4 text-primary"
                        aria-hidden
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.isPopular && proTier ? (
                  <form className="space-y-3" onSubmit={handleWaitlistSubmit}>
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      aria-label="Email for waitlist"
                    />
                    <Button type="submit" size="comfortable" className="w-full">
                      {tier.ctaLabel}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      We’ll reach out when Pro is ready. No spam, just early
                      access.
                    </p>
                  </form>
                ) : (
                  <Button asChild size="comfortable" className="w-full">
                    <Link
                      href={tier.ctaHref}
                      onClick={() => handleCtaClick(tier.ctaLabel)}
                    >
                      {tier.ctaLabel}
                    </Link>
                  </Button>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
});
