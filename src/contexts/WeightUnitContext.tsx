"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type WeightUnit = "lbs" | "kg";

interface WeightUnitContextType {
  unit: WeightUnit;
  toggleUnit: () => void;
  setUnit: (unit: WeightUnit) => void;
}

const WeightUnitContext = createContext<WeightUnitContextType | undefined>(
  undefined
);

export function WeightUnitProvider({ children }: { children: ReactNode }) {
  // Lazy initialization to prevent SSR hydration mismatch
  const [unit, setUnit] = useState<WeightUnit>(() => {
    // During SSR, window is undefined - use default
    if (typeof window === "undefined") return "lbs";

    // On client, read from localStorage
    try {
      const stored = localStorage.getItem("weightUnit");
      if (stored === "kg" || stored === "lbs") {
        return stored;
      }
    } catch (error) {
      // localStorage might be blocked (private mode, etc.)
      console.warn(
        "Failed to read weight unit preference from localStorage:",
        error
      );
    }

    return "lbs";
  });

  const toggleUnit = () => {
    setUnit((prev) => {
      const next = prev === "lbs" ? "kg" : "lbs";
      // Save to localStorage with error handling
      try {
        localStorage.setItem("weightUnit", next);
      } catch (error) {
        // localStorage might be blocked (private mode, quota exceeded, etc.)
        console.warn(
          "Failed to save weight unit preference to localStorage:",
          error
        );
      }
      return next;
    });
  };

  const setUnitAndSave = (newUnit: WeightUnit) => {
    setUnit(newUnit);
    // Save to localStorage with error handling
    try {
      localStorage.setItem("weightUnit", newUnit);
    } catch (error) {
      console.warn(
        "Failed to save weight unit preference to localStorage:",
        error
      );
    }
  };

  return (
    <WeightUnitContext.Provider
      value={{ unit, toggleUnit, setUnit: setUnitAndSave }}
    >
      {children}
    </WeightUnitContext.Provider>
  );
}

export function useWeightUnit() {
  const context = useContext(WeightUnitContext);
  if (!context) {
    throw new Error("useWeightUnit must be used within WeightUnitProvider");
  }
  return context;
}
