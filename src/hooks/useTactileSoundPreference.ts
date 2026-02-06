"use client";

import { useState, useCallback } from "react";

const SOUND_ENABLED_KEY = "tactileSoundEnabled";

/** Manages tactile sound preference (persisted to localStorage). Default: on. */
export function useTactileSoundPreference(): {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
} {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(SOUND_ENABLED_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    } catch {
      // localStorage blocked
    }
  }, []);

  return { soundEnabled, setSoundEnabled };
}
