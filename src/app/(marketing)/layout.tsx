import { type ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://volume.fitness";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Volume — Fast workout logging with honest insights",
  description:
    "Volume helps disciplined lifters log sets in seconds and see real progress with high-signal analytics and weekly AI recaps.",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Volume — Track every set. See the trend.",
    description:
      "Log faster, stay consistent, and get weekly AI recaps that actually help you train better.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Volume marketing preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@volume",
    title: "Volume — Fast logging. Honest insights.",
    description:
      "Modern workout tracker with one-tap logging, clear analytics, and concise AI summaries.",
    images: ["/opengraph-image"],
  },
};

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();

  if (userId) {
    redirect("/today");
  }

  return children;
}
