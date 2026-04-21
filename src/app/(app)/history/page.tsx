import { redirect } from "next/navigation";
import { buildCoachPromptPath } from "@/lib/coach/routes";

export default function HistoryPage() {
  redirect(buildCoachPromptPath("show history overview"));
}
