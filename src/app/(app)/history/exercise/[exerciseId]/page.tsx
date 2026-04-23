import { redirect } from "next/navigation";
import { buildCoachPromptPath } from "@/lib/coach/routes";

export default async function ExerciseDetailPage() {
  redirect(buildCoachPromptPath("show history overview"));
}
