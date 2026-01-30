import type { Metadata, Viewport } from "next";
import { Bebas_Neue, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WeightUnitProvider } from "@/contexts/WeightUnitContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToasterProvider } from "@/components/toaster-provider";
import { PostHogProvider } from "@/components/posthog-provider";

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
  metadataBase: new URL("https://volume.fitness"),
  applicationName: "Volume",
  authors: [{ name: "Volume" }],
  generator: "Next.js",
  keywords: ["workout", "fitness", "tracker", "volume", "training"],
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Volume",
    title: "Volume - Workout Tracker",
    description:
      "Simple workout tracking app for tracking sets, reps, and weight",
  },
  twitter: {
    card: "summary_large_image",
    title: "Volume - Workout Tracker",
    description:
      "Simple workout tracking app for tracking sets, reps, and weight",
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
          <PostHogProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <WeightUnitProvider>
                <ConvexClientProvider>{children}</ConvexClientProvider>
              </WeightUnitProvider>
            </ThemeProvider>
            <ToasterProvider />
            <SpeedInsights />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
