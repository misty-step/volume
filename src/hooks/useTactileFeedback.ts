"use client";

import { useRef, useCallback, useEffect } from "react";
import { useAnimation } from "framer-motion";
import { setSoundData, playTactileSound } from "@/lib/tactile-audio";
import { TACTILE_CLICK_SOUND } from "@/lib/sounds/click";
import { useTactileSoundPreference } from "./useTactileSoundPreference";

const THROTTLE_MS = 300;

export interface UseTactileFeedbackOptions {
  disabled?: boolean;
}

export interface UseTactileFeedbackReturn {
  triggerTactile: () => void;
  animationControls: ReturnType<typeof useAnimation>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

/**
 * Tactile feedback for button presses: click sound, haptic, and pulse animation.
 * Respects user's sound preference, prefers-reduced-motion, and throttling (300ms).
 */
export function useTactileFeedback(
  options: UseTactileFeedbackOptions = {}
): UseTactileFeedbackReturn {
  const { disabled = false } = options;
  const animationControls = useAnimation();
  const { soundEnabled, setSoundEnabled } = useTactileSoundPreference();

  const lastTriggerRef = useRef<number>(0);
  const prefersReducedMotion = useRef<boolean>(false);

  useEffect(() => {
    setSoundData(TACTILE_CLICK_SOUND);

    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  }, []);

  const triggerTactile = useCallback(() => {
    if (disabled) return;

    const now = Date.now();
    if (now - lastTriggerRef.current < THROTTLE_MS) return;
    lastTriggerRef.current = now;

    // Sound (playTactileSound handles lazy initialization)
    if (soundEnabled) {
      playTactileSound();
    }

    // Haptic (not supported on iOS Safari)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Fail silently
      }
    }

    // Animation
    if (!prefersReducedMotion.current) {
      animationControls.start({
        scale: [1, 0.97, 1],
        transition: { duration: 0.15, ease: [0.4, 0.0, 0.2, 1] },
      });
    }
  }, [disabled, soundEnabled, animationControls]);

  return {
    triggerTactile,
    animationControls,
    soundEnabled,
    setSoundEnabled,
  };
}
