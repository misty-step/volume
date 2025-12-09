"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { BrutalistButton } from "@/components/brutalist";

export function UnauthenticatedLanding() {
  const router = useRouter();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-concrete-black">
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
      <main className="relative z-10 flex h-full flex-col items-center justify-center">
        {/* Massive Title - Blending into reality */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full flex justify-center items-center overflow-hidden select-none"
        >
          <h1
            className="font-display font-black text-[23vw] leading-none tracking-wide text-white mix-blend-overlay whitespace-nowrap"
            style={{
              textShadow: "0 0 40px rgba(0,0,0,0.5)",
            }}
          >
            VOLUME
          </h1>
        </motion.div>

        {/* Primary Action - The Anchor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute bottom-20"
        >
          <BrutalistButton
            variant="danger"
            size="lg"
            onClick={() => router.push("/sign-up")}
            className="text-2xl px-12 py-8 border-4 tracking-widest hover:scale-105 transition-transform"
          >
            START LOGGING
          </BrutalistButton>
        </motion.div>
      </main>
    </div>
  );
}
