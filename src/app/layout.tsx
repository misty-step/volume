import type { Metadata, Viewport } from "next";
import { Bebas_Neue, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WeightUnitProvider } from "@/contexts/WeightUnitContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsWrapper } from "@/components/analytics-wrapper";
import { ToasterProvider } from "@/components/toaster-provider";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Volume - Workout Tracker",
  description:
    "Simple workout tracking app for tracking sets, reps, and weight",
  applicationName: "Volume",
  authors: [{ name: "Volume" }],
  generator: "Next.js",
  keywords: ["workout", "fitness", "tracker", "volume", "training"],
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${bebasNeue.variable} ${jetbrainsMono.variable} ${inter.variable}`}
      >
        <body className="antialiased font-sans">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <WeightUnitProvider>
              <ConvexClientProvider>{children}</ConvexClientProvider>
            </WeightUnitProvider>
          </ThemeProvider>
          <ToasterProvider />
          <AnalyticsWrapper />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
