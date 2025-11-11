import type { MetadataRoute } from "next";

const marketingRoutes = ["/", "/sign-in", "/sign-up", "/pricing"];
const appRoutes = ["/today", "/analytics", "/history", "/settings"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://volume.fitness";

  return [...marketingRoutes, ...appRoutes].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
