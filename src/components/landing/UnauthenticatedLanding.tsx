"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useMotionTemplate, useSpring } from "framer-motion";
import { Timer, Trophy, Sparkles, ChevronDown, Zap } from "lucide-react";
import { BrutalistButton } from "@/components/brutalist";
import { type MouseEvent, useRef } from "react";

// Hook for true cursor-tracking 3D tilt
function useCardTilt() {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  // Smooth spring physics for rotation
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Calculate rotation based on cursor distance from center (-4 to 4 degrees)
    const maxRotate = 4;
    rotateX.set(((e.clientY - centerY) / (rect.height / 2)) * -maxRotate);
    rotateY.set(((e.clientX - centerX) / (rect.width / 2)) * maxRotate);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return { ref, springRotateX, springRotateY, handleMouseMove, handleMouseLeave };
}

export function UnauthenticatedLanding() {
  // Cursor-tracking spotlight for features grid
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Per-card tilt hooks
  const heroTilt = useCardTilt();
  const prTilt = useCardTilt();
  const aiTilt = useCardTilt();

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div className="relative w-full bg-concrete-black overflow-y-auto">
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
        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4">
          {/* Massive Title - Blending into reality */}
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 1.02 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.7,
              ease: [0.6, 0.01, 0.05, 0.95],
              y: { type: "spring", damping: 12, stiffness: 100 },
            }}
            className="relative w-full flex flex-col justify-center items-center overflow-hidden select-none"
          >
            <h1
              className="font-display font-black text-[23vw] leading-none tracking-wide text-white whitespace-nowrap relative"
              style={{
                // Layered shadow: crisp near, diffuse far (creates physical mass)
                textShadow: `
                  0 2px 0 rgba(0,0,0,0.8),
                  0 4px 0 rgba(0,0,0,0.6),
                  0 8px 0 rgba(0,0,0,0.4),
                  0 16px 30px rgba(0,0,0,0.5),
                  0 0 80px rgba(196,30,58,0.12)
                `,
                WebkitTextStroke: "1px rgba(255,255,255,0.06)",
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
            whileHover={{
              scale: 1.03,
              x: 2,
              y: -2,
              transition: { duration: 0.15 },
            }}
            whileTap={{ scale: 0.97, x: 0, y: 0 }}
          >
            <BrutalistButton
              variant="danger"
              size="lg"
              asChild
              className="text-xl md:text-2xl px-8 md:px-12 py-6 md:py-8 border-4 tracking-widest relative overflow-hidden group/btn"
            >
              <Link href="/sign-up">
                <span className="relative z-10">START LOGGING</span>
                {/* Sheen micro-interaction - CSS group-hover for reliable trigger */}
                <div
                  className="absolute inset-0 bg-white/20 -skew-x-12 z-0 -translate-x-[150%] group-hover/btn:translate-x-[200%] transition-transform duration-500 ease-in-out"
                />
              </Link>
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
        </div>
      </section>

      {/* Features Section - Industrial Control Panel */}
      <section
        className="relative min-h-[100dvh] w-full bg-concrete-black overflow-hidden group/grid"
        onMouseMove={handleMouseMove}
      >
        {/* Cursor-tracking Spotlight Overlay - Always subtly visible, intensifies on hover */}
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-30 transition-opacity duration-700 ease-out group-hover/grid:opacity-100 z-0"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                600px circle at ${mouseX}px ${mouseY}px,
                rgba(196, 30, 58, 0.10),
                transparent 70%
              )
            `,
          }}
        />
        {/* Background Layer - Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #F5F5F5 1px, transparent 1px),
              linear-gradient(to bottom, #F5F5F5 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />


        {/* Content Layer */}
        <div className="relative z-10 min-h-[100dvh] flex flex-col justify-center px-4 py-8 md:py-12">
          <div className="max-w-6xl mx-auto w-full">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="mb-6 md:mb-8"
            >
              <h2 className="text-xl md:text-2xl font-display font-black text-concrete-white/60 tracking-[0.2em] uppercase">
                Specifications
              </h2>
            </motion.div>

            {/* Industrial Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

              {/* Hero Feature - Large Tile (spans 2 rows on desktop) */}
              <motion.div
                ref={heroTilt.ref}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5 }}
                onMouseMove={heroTilt.handleMouseMove}
                onMouseLeave={heroTilt.handleMouseLeave}
                className="md:col-span-2 md:row-span-2 relative group"
                style={{
                  transformPerspective: 1000,
                  rotateX: heroTilt.springRotateX,
                  rotateY: heroTilt.springRotateY,
                }}
              >
                <div className="h-full border-3 border-danger-red/40 bg-concrete-black p-6 md:p-8
                  shadow-[8px_8px_0_0_rgba(0,0,0,0.4)] hover:shadow-[12px_12px_0_0_rgba(0,0,0,0.5)]
                  transition-shadow duration-300">
                  <div className="flex flex-col md:flex-row h-full gap-6 md:gap-12">
                    {/* Left: Text content */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <Timer className="w-6 h-6 text-danger-red" strokeWidth={2} />
                      </div>
                      <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-black text-concrete-white tracking-wide mb-4">
                        LOG SETS IN SECONDS
                      </h3>
                      <p className="text-base md:text-lg text-concrete-gray max-w-sm leading-relaxed">
                        Minimal taps to record reps and weight. No friction, no clutter. Just progress.
                      </p>
                    </div>

                    {/* Right: Giant Stat - Punch-in animation */}
                    <div className="flex flex-col justify-center items-start md:items-end">
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="font-mono text-7xl md:text-8xl lg:text-9xl font-bold text-danger-red tabular-nums leading-none flex"
                      >
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3 }}
                        >
                          {"<"}
                        </motion.span>
                        <motion.span
                          initial={{ scale: 1.4, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 12,
                            delay: 0.15,
                          }}
                        >
                          3
                        </motion.span>
                      </motion.div>
                      <div className="font-display text-lg md:text-xl text-concrete-gray tracking-wider mt-2">
                        TAPS TO LOG
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Feature 2 - PRs */}
              <motion.div
                ref={prTilt.ref}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
                onMouseMove={prTilt.handleMouseMove}
                onMouseLeave={prTilt.handleMouseLeave}
                className="relative group"
                style={{
                  transformPerspective: 1000,
                  rotateX: prTilt.springRotateX,
                  rotateY: prTilt.springRotateY,
                }}
              >
                <div className="h-full border-3 border-concrete-white/20 bg-concrete-black p-6
                  shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] hover:shadow-[8px_8px_0_0_rgba(0,0,0,0.4)]
                  transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-safety-orange" strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-black text-concrete-white tracking-wide mb-2">
                    TRACK YOUR PRs
                  </h3>
                  <p className="text-sm text-concrete-gray mb-4">
                    Automatic personal record detection. Every win gets celebrated.
                  </p>
                  <div className="font-mono text-3xl md:text-4xl font-bold text-safety-orange tabular-nums">
                    AUTO
                  </div>
                  <div className="font-mono text-xs text-concrete-gray tracking-wider mt-1">
                    DETECTION
                  </div>
                </div>
              </motion.div>

              {/* Feature 3 - AI Insights */}
              <motion.div
                ref={aiTilt.ref}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                onMouseMove={aiTilt.handleMouseMove}
                onMouseLeave={aiTilt.handleMouseLeave}
                className="relative group"
                style={{
                  transformPerspective: 1000,
                  rotateX: aiTilt.springRotateX,
                  rotateY: aiTilt.springRotateY,
                }}
              >
                <div className="h-full border-3 border-concrete-white/20 bg-concrete-black p-6
                  shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] hover:shadow-[8px_8px_0_0_rgba(0,0,0,0.4)]
                  transition-shadow duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-safety-orange" strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-black text-concrete-white tracking-wide mb-2">
                    AI-POWERED INSIGHTS
                  </h3>
                  <p className="text-sm text-concrete-gray mb-4">
                    Weekly reports analyze your volume, frequency, and gains.
                  </p>
                  <div className="font-mono text-3xl md:text-4xl font-bold text-safety-orange tabular-nums">
                    7-DAY
                  </div>
                  <div className="font-mono text-xs text-concrete-gray tracking-wider mt-1">
                    ANALYSIS CYCLES
                  </div>
                </div>
              </motion.div>

              {/* CTA Tile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="md:col-span-3"
              >
                <div className="border-3 border-danger-red/50 bg-danger-red/5 p-6 md:p-8
                  flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <Zap className="w-8 h-8 text-danger-red" strokeWidth={2} />
                    <div>
                      <h3 className="font-display text-xl md:text-2xl font-black text-concrete-white tracking-wide">
                        READY TO LIFT?
                      </h3>
                      <p className="text-sm text-concrete-gray mt-1">
                        Start tracking in under 30 seconds. No credit card required.
                      </p>
                    </div>
                  </div>
                  <BrutalistButton
                    variant="danger"
                    size="lg"
                    asChild
                    className="text-lg md:text-xl px-8 py-5 border-4 tracking-widest hover:scale-105 transition-transform whitespace-nowrap"
                  >
                    <Link href="/sign-up">GET STARTED FREE</Link>
                  </BrutalistButton>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
