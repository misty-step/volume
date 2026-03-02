import type { Config } from "tailwindcss";

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--card-elevated))",
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
          bg: "hsl(var(--success-bg))",
          border: "hsl(var(--success-border))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
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
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        chat: "var(--radius-chat)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
      },
      spacing: {
        gutter: "24px",
        section: "64px",
      },
      fontSize: {
        "display-lg": [
          "clamp(3rem, 8vw, 5rem)",
          { lineHeight: "0.95", fontWeight: "800", letterSpacing: "-0.02em" },
        ],
        "display-md": [
          "clamp(2rem, 6vw, 3.5rem)",
          { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.01em" },
        ],
        "heading-lg": ["1.875rem", { lineHeight: "1.3", fontWeight: "700" }],
        "heading-md": ["1.5rem", { lineHeight: "1.4", fontWeight: "600" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.5", fontWeight: "600" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "sheet-slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0.9" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "sheet-slide-down": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0.9" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "pr-flash": {
          "0%, 100%": { filter: "invert(0)" },
          "50%": { filter: "invert(1)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-4px)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "sheet-slide-up":
          "sheet-slide-up 0.4s cubic-bezier(0.21, 0.47, 0.32, 0.98)",
        "sheet-slide-down": "sheet-slide-down 0.25s cubic-bezier(0.4, 0, 1, 1)",
        shake: "shake 0.382s cubic-bezier(0.4, 0.0, 0.2, 1)",
        "pr-flash": "pr-flash 0.3s ease-in-out",
        "fade-in": "fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-dot": "bounce-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
