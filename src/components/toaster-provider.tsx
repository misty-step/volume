"use client";

import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { isMobile } from "@/lib/utils";

/**
 * Client component wrapper for Sonner Toaster with responsive positioning
 * - Mobile: top-center (avoids bottom nav)
 * - Desktop: bottom-right (familiar pattern)
 */
export function ToasterProvider() {
  // Compute initial position directly (avoid setState in useEffect)
  const [position, setPosition] = useState<"top-center" | "bottom-right">(() =>
    typeof window !== "undefined" && isMobile() ? "top-center" : "bottom-right"
  );

  useEffect(() => {
    // Update position on resize
    const handleResize = () => {
      setPosition(isMobile() ? "top-center" : "bottom-right");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Toaster
      position={position}
      className="toast-container"
      toastOptions={{
        className: "brutalist-toast",
        style: {
          background: "hsl(0 0% 0%)", // Pure black, fully opaque
          color: "white",
          border: "3px solid white",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          opacity: 1, // Explicit opacity
        },
      }}
    />
  );
}
