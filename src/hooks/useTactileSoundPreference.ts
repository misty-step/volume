"use client";

import { useState, useCallback } from "react";

// localStorage key for sound preference (shared with useTactileFeedback)
const SOUND_ENABLED_KEY = "tactileSoundEnabled";

/**
 * Hook for managing tactile sound preference
 *
 * Use this in Settings to toggle the sound preference.
 * The actual sound playback is handled by useTactileFeedback.
 *
 * @example
 * ```tsx
 * const { soundEnabled, setSoundEnabled } = useTactileSoundPreference();
 *
 * <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
 * ```
 */
export function useTactileSoundPreference() {
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

  // Update localStorage when preference changes
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    } catch {
      // localStorage might be blocked
    }
  }, []);

  return {
    soundEnabled,
    setSoundEnabled,
  };
}
