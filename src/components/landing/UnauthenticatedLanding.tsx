"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { brutalistMotion } from "@/lib/brutalist-motion";
import { BrutalistButton } from "@/components/brutalist";
import { trackEvent } from "@/lib/analytics";

const FAQ_ITEMS = [
  {
    question: "Is there a free plan?",
    answer: "Yes. Track unlimited workouts on the free tier while we iterate.",
  },
  {
    question: "Do you support weights and timers?",
    answer: "Log reps, weight, and time—Volume records units with every set.",
  },
  {
    question: "Will my data sync across devices?",
    answer: "Your sets stay in sync automatically; no manual exports required.",
  },
];

export function UnauthenticatedLanding() {
  const router = useRouter();

  const getDeviceTag = () =>
    typeof window !== "undefined" && window.innerWidth < 768
      ? "mobile"
      : "desktop";

  const handlePrimaryCta = () => {
    void trackEvent("Marketing CTA Click", {
      placement: "hero",
      label: "get started",
    });
    router.push("/sign-up");
  };

  const handleNavClick = (target: string) => {
    void trackEvent("Marketing Nav Click", {
      target,
      device: getDeviceTag(),
    });
  };

  const handleFaqToggle = (question: string, isOpen: boolean) => {
    void trackEvent("Marketing FAQ Toggle", { question, isOpen });
  };

  return (
    <div className="min-h-screen flex flex-col bg-concrete-black text-concrete-white">
      {/* Hero Section - Full height */}
      <main className="flex-1 grid lg:grid-cols-2">
        {/* Left: Brand + Messaging */}
        <section className="relative p-8 lg:p-16 flex items-center justify-center concrete-texture">
          <motion.div
            className="w-full max-w-2xl space-y-8"
            variants={brutalistMotion.staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Logo mark - three bars */}
            <motion.div
              variants={brutalistMotion.weightDrop}
              className="flex items-center gap-2 mb-8"
            >
              <div className="flex items-center gap-1 border-3 border-concrete-white p-2">
                <div className="w-2 h-6 bg-concrete-white" />
                <div className="w-2 h-10 bg-concrete-white" />
                <div className="w-2 h-14 bg-concrete-white" />
              </div>
            </motion.div>

            {/* Hero headline */}
            <motion.h1
              variants={brutalistMotion.mechanicalSlide}
              className="font-display text-hero leading-none tracking-tight"
            >
              VOLUME
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={brutalistMotion.mechanicalSlide}
              className="text-2xl lg:text-3xl font-mono uppercase tracking-wide border-l-4 border-danger-red pl-4"
            >
              SIMPLE LOGGING.
              <br />
              POWERFUL INSIGHTS.
            </motion.p>

            {/* Feature list */}
            <motion.ul
              variants={brutalistMotion.mechanicalSlide}
              className="space-y-3 font-mono text-lg"
            >
              {[
                "DESIGNED FOR SPEED",
                "AI-POWERED ANALYTICS",
                "REAL-TIME SYNC",
                "MOBILE-FIRST",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-danger-red text-2xl leading-none">
                    ▪
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </motion.ul>
          </motion.div>
        </section>

        {/* Right: Conversion CTAs */}
        <section className="relative p-8 lg:p-16 bg-concrete-white flex items-center justify-center">
          <motion.div
            className="w-full max-w-md space-y-8"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Primary CTA */}
            <div className="space-y-6">
              <BrutalistButton
                variant="danger"
                size="lg"
                onClick={handlePrimaryCta}
                className="w-full text-2xl py-8"
              >
                GET STARTED →
              </BrutalistButton>

              {/* Secondary sign-in link */}
              <p className="text-center font-mono text-sm text-concrete-black">
                ALREADY HAVE AN ACCOUNT?{" "}
                <Link
                  href="/sign-in"
                  className="text-danger-red font-bold"
                  onClick={() => handleNavClick("/sign-in")}
                >
                  SIGN IN
                </Link>
              </p>
            </div>

            {/* Trust indicators */}
            <div className="border-t-3 border-concrete-black pt-8 space-y-3 text-center">
              <p className="font-display text-xl tracking-wide text-concrete-black">
                START FREE
              </p>
              <p className="font-mono text-sm text-concrete-gray uppercase">
                NO CREDIT CARD REQUIRED
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* FAQ Section */}
      <section className="border-t-3 border-concrete-white bg-concrete-black px-8 py-10 lg:px-16 lg:py-14">
        <h2 className="font-display text-3xl uppercase tracking-wide mb-6">
          FAQ
        </h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="border-3 border-concrete-white/60 bg-concrete-black px-4 py-3"
              onToggle={(event) =>
                handleFaqToggle(
                  item.question,
                  (event.target as HTMLDetailsElement).open
                )
              }
            >
              <summary className="font-mono text-sm uppercase tracking-wide cursor-pointer flex items-center justify-between">
                {item.question}
                <span aria-hidden className="pl-2">
                  +
                </span>
              </summary>
              <p className="pt-2 text-sm text-concrete-gray leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-concrete-white py-6 px-8 lg:px-16">
        <p className="font-mono text-sm uppercase tracking-wide">
          © {new Date().getFullYear()} VOLUME
        </p>
      </footer>
    </div>
  );
}
