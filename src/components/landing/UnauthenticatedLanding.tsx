"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/brutalist-motion";
import { BrutalistButton } from "@/components/brutalist";
import { Footer } from "@/components/layout/footer";

export function UnauthenticatedLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-concrete-black text-concrete-white">
      {/* Hero Section - Full viewport height */}
      <main className="min-h-screen grid lg:grid-cols-2">
        {/* Left: Brand + Messaging */}
        <section className="relative p-8 lg:p-16 flex items-center justify-center concrete-texture">
          <motion.div
            className="w-full max-w-2xl space-y-8"
            variants={motionPresets.listStagger}
            initial="initial"
            animate="animate"
          >
            {/* Logo mark - three bars */}
            <motion.div
              variants={motionPresets.cardEntrance}
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
              variants={motionPresets.cardEntrance}
              className="font-display text-hero leading-none tracking-tight"
            >
              VOLUME
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={motionPresets.cardEntrance}
              className="text-2xl lg:text-3xl font-mono uppercase tracking-wide border-l-4 border-danger-red pl-4"
            >
              SIMPLE LOGGING.
              <br />
              POWERFUL INSIGHTS.
            </motion.p>

            {/* Feature list */}
            <motion.ul
              variants={motionPresets.cardEntrance}
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
                onClick={() => router.push("/sign-up")}
                className="w-full text-2xl py-8"
              >
                GET STARTED →
              </BrutalistButton>

              {/* Secondary sign-in link */}
              <p className="text-center font-mono text-sm text-concrete-black">
                ALREADY HAVE AN ACCOUNT?{" "}
                <Link href="/sign-in" className="text-danger-red font-bold">
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
