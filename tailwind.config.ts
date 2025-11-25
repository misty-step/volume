import type { Config } from "tailwindcss";
import {
  BRUTALIST_COLORS,
  BRUTALIST_SHADOWS,
} from "./src/config/design-tokens";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Brutalist typography
      fontFamily: {
        display: ['"Bebas Neue"', '"Arial Black"', "sans-serif"],
        heading: ['"Inter Tight"', '"Arial Narrow"', "sans-serif"],
        mono: ['"JetBrains Mono"', '"Courier New"', "monospace"],
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        // Brutalist typography scale
        hero: "clamp(3rem, 12vw, 8rem)",
        display: "clamp(2rem, 6vw, 4rem)",
        // Semantic marketing typography with responsive sizing
        "display-lg": [
          "clamp(3rem, 8vw, 5rem)",
          { lineHeight: "1.1", fontWeight: "800", letterSpacing: "-0.02em" },
        ],
        "display-md": [
          "clamp(2rem, 6vw, 3.5rem)",
          { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" },
        ],
        "heading-lg": ["1.875rem", { lineHeight: "1.3", fontWeight: "700" }], // 30px
        "heading-md": ["1.5rem", { lineHeight: "1.4", fontWeight: "600" }], // 24px
        "heading-sm": ["1.25rem", { lineHeight: "1.5", fontWeight: "600" }], // 20px
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }], // 18px
        "body-base": ["1rem", { lineHeight: "1.6", fontWeight: "400" }], // 16px
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }], // 14px
      },
      // Brutalist spacing
      spacing: {
        gutter: "24px",
        section: "64px",
      },
      // Sharp borders
      borderWidth: {
        "3": "3px",
        "4": "4px",
      },
      colors: {
        // Brutalist color palette
        "concrete-black": BRUTALIST_COLORS.concreteBlack,
        "concrete-white": BRUTALIST_COLORS.concreteWhite,
        "concrete-gray": BRUTALIST_COLORS.concreteGray,
        "danger-red": BRUTALIST_COLORS.dangerRed,
        "safety-orange": BRUTALIST_COLORS.safetyOrange,
        "metal-edge": BRUTALIST_COLORS.metalEdge,
        // Chrome accent system
        "chrome-highlight": BRUTALIST_COLORS.chromeHighlight,
        "chrome-shadow": BRUTALIST_COLORS.chromeShadow,
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        brutalist: "2px",
        "brutalist-md": "4px",
      },
      boxShadow: {
        lift: BRUTALIST_SHADOWS.lift,
        "lift-dark": "4px 4px 0 0 rgba(255,255,255,0.2)",
        press: BRUTALIST_SHADOWS.press,
        heavy: BRUTALIST_SHADOWS.heavy,
        dialog: BRUTALIST_SHADOWS.dialog,
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // Industrial animations
        "weight-drop": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "50%": { transform: "translateY(2px)" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "mechanical-slide": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "concrete-fill": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "weight-drop": "weight-drop 0.4s cubic-bezier(0.9, 0.1, 0.3, 0.9)",
        "mechanical-slide":
          "mechanical-slide 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
        "concrete-fill": "concrete-fill 1s cubic-bezier(0.4, 0.0, 0.2, 1)",
        shake: "shake 0.382s cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
