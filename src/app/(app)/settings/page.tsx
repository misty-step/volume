import { redirect } from "next/navigation";
import { buildCoachPromptPath } from "@/lib/coach/routes";

export default function SettingsPage() {
  redirect(buildCoachPromptPath("show settings overview"));
}
