import { notFound } from "next/navigation";
import { getDeploymentEnvironment } from "@/lib/environment";
import TestAnalyticsClient from "./TestAnalyticsClient";

/**
 * Analytics test page - development only.
 *
 * Guards against accidental deployment to preview/production by returning 404
 * when accessed outside development environment. This prevents synthetic events
 * and deliberate PII from undermining the privacy posture of the observability stack.
 *
 * @returns 404 in preview/production, interactive test UI in development
 */
export default function TestAnalyticsPage() {
  if (getDeploymentEnvironment() !== "development") {
    notFound();
  }

  return <TestAnalyticsClient />;
}
