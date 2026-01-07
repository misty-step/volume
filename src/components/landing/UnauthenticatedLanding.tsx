"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Timer, Trophy, Sparkles, ChevronDown } from "lucide-react";
import { BrutalistButton, BrutalistCard } from "@/components/brutalist";
import { motionPresets } from "@/lib/brutalist-motion";

const features = [
  {
    icon: Timer,
    title: "Log sets in seconds",
    description: "Minimal taps to record reps and weight. No friction, just progress.",
  },
  {
    icon: Trophy,
    title: "Track your PRs",
    description: "Automatic personal record detection. Every win gets celebrated.",
  },
  {
    icon: Sparkles,
    title: "AI-powered insights",
    description: "Weekly reports analyze your volume, frequency, and gains.",
  },
];

export function UnauthenticatedLanding() {
  const router = useRouter();

  return (
    <div className="relative w-full bg-concrete-black">
      {/* Hero Section - Full Viewport */}
      <section className="relative min-h-[100dvh] w-full overflow-hidden">
        {/* Background Image - The Monolith Foundation */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-01.jpeg"
            alt="Gym interior"
            fill
            priority
            className="object-cover contrast-125 opacity-60"
            quality={90}
          />
          {/* Grain/Noise Texture Overlay */}
          <div className="absolute inset-0 concrete-texture opacity-50 mix-blend-overlay" />
          {/* Vignette for focus */}
          <div className="absolute inset-0 bg-radial-gradient-fade" />
        </div>

        {/* Main Content Layer */}
        <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4">
          {/* Massive Title - Blending into reality */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full flex flex-col justify-center items-center overflow-hidden select-none"
          >
            <h1
              className="font-display font-black text-[23vw] leading-none tracking-wide text-white mix-blend-overlay whitespace-nowrap"
              style={{
                textShadow: "0 0 40px rgba(0,0,0,0.5)",
              }}
            >
              VOLUME
            </h1>
            {/* Value Proposition Tagline */}
            <p className="mt-4 text-lg md:text-2xl text-concrete-white/80 font-mono tracking-wide text-center">
              Track every rep. Beat every PR.
            </p>
          </motion.div>

          {/* Primary Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12"
          >
            <BrutalistButton
              variant="danger"
              size="lg"
              onClick={() => router.push("/sign-up")}
              className="text-xl md:text-2xl px-8 md:px-12 py-6 md:py-8 border-4 tracking-widest hover:scale-105 transition-transform"
            >
              START LOGGING
            </BrutalistButton>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{
              opacity: { delay: 1, duration: 0.5 },
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="w-8 h-8 text-concrete-white/60" />
          </motion.div>
        </main>
      </section>

      {/* Features Section */}
      <section className="relative py-16 md:py-24 px-4 bg-concrete-black">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-black text-concrete-white tracking-wide">
              WHY VOLUME?
            </h2>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            variants={motionPresets.listStagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {features.map(({ icon: Icon, title, description }) => (
              <motion.div key={title} variants={motionPresets.cardEntrance}>
                <BrutalistCard className="p-6 md:p-8 text-center h-full">
                  <Icon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-safety-orange" strokeWidth={1.5} />
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                    {title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {description}
                  </p>
                </BrutalistCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center mt-12 md:mt-16"
          >
            <BrutalistButton
              variant="danger"
              size="lg"
              onClick={() => router.push("/sign-up")}
              className="text-lg md:text-xl px-8 py-6 border-4 tracking-widest hover:scale-105 transition-transform"
            >
              GET STARTED FREE
            </BrutalistButton>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
