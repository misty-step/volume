import type { MetadataRoute } from "next";
import { COACH_HOME_PATH, DASHBOARD_PATH } from "@/lib/coach/routes";

const marketingRoutes = ["/", "/sign-in", "/sign-up"];
const appRoutes = [
  COACH_HOME_PATH,
  DASHBOARD_PATH,
  "/analytics",
  "/history",
  "/settings",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://volume.fitness";

  return [...marketingRoutes, ...appRoutes].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
