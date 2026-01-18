"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useAnimation } from "framer-motion";
import {
  setSoundData,
  initAudio,
  playTactileSound,
  isAudioReady,
} from "@/lib/tactile-audio";
import { TACTILE_CLICK_SOUND } from "@/lib/sounds/click";

// localStorage key for sound preference
const SOUND_ENABLED_KEY = "tactileSoundEnabled";

// Throttle duration to prevent rapid-fire feedback
const THROTTLE_MS = 300;

export interface UseTactileFeedbackOptions {
  /** Skip feedback when true (e.g., form is submitting) */
  disabled?: boolean;
}

export interface UseTactileFeedbackReturn {
  /** Trigger tactile feedback (sound + haptic + animation) */
  triggerTactile: () => void;
  /** Framer Motion animation controls for the button */
  animationControls: ReturnType<typeof useAnimation>;
  /** Whether sound is enabled */
  soundEnabled: boolean;
  /** Toggle sound preference */
  setSoundEnabled: (enabled: boolean) => void;
}

/**
 * Hook for tactile feedback on button presses
 *
 * Provides:
 * - Click sound (if enabled and not throttled)
 * - Haptic vibration (50ms, if supported)
 * - Button pulse animation via Framer Motion controls
 *
 * Respects:
 * - User's sound preference (localStorage)
 * - prefers-reduced-motion (skips animation)
 * - Throttling (300ms between triggers)
 *
 * @example
 * ```tsx
 * const { triggerTactile, animationControls } = useTactileFeedback();
 *
 * <motion.div animate={animationControls}>
 *   <Button onClick={() => { triggerTactile(); doSomething(); }}>
 *     Click me
 *   </Button>
 * </motion.div>
 * ```
 */
export function useTactileFeedback(
  options: UseTactileFeedbackOptions = {}
): UseTactileFeedbackReturn {
  const { disabled = false } = options;

  // Animation controls (Framer Motion imperative API)
  const animationControls = useAnimation();

  // Sound preference state (lazy init from localStorage)
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true; // SSR default
    try {
      const stored = localStorage.getItem(SOUND_ENABLED_KEY);
      return stored === null ? true : stored === "true"; // Default: on
    } catch {
      return true;
    }
  });

  // Throttle ref
  const lastTriggerRef = useRef<number>(0);

  // Reduced motion check
  const prefersReducedMotion = useRef<boolean>(false);

  // Initialize sound data and check reduced motion on mount
  useEffect(() => {
    // Set sound data for audio engine
    setSoundData(TACTILE_CLICK_SOUND);

    // Check reduced motion preference
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  }, []);

  // Update localStorage when preference changes
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    } catch {
      // localStorage might be blocked
    }
  }, []);

  // Main trigger function
  const triggerTactile = useCallback(() => {
    if (disabled) return;

    // Throttle check
    const now = Date.now();
    if (now - lastTriggerRef.current < THROTTLE_MS) {
      return;
    }
    lastTriggerRef.current = now;

    // 1. Play sound (if enabled)
    if (soundEnabled) {
      // Initialize audio on first trigger (requires user gesture)
      if (!isAudioReady()) {
        initAudio().then(() => playTactileSound());
      } else {
        playTactileSound();
      }
    }

    // 2. Haptic feedback (if supported - not on iOS Safari)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Vibration might fail silently on some devices
      }
    }

    // 3. Animation (if reduced motion not preferred)
    if (!prefersReducedMotion.current) {
      // Button pulse: scale 1 → 0.97 → 1 over 150ms
      animationControls.start({
        scale: [1, 0.97, 1],
        transition: {
          duration: 0.15,
          ease: [0.4, 0.0, 0.2, 1], // ease-out
        },
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
