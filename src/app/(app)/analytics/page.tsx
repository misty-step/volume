import { redirect } from "next/navigation";
import { buildCoachPromptPath } from "@/lib/coach/routes";

export default function AnalyticsPage() {
  redirect(buildCoachPromptPath("show analytics overview"));
}
