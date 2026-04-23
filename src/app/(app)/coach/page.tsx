import { redirect } from "next/navigation";
import { COACH_HOME_PATH } from "@/lib/coach/routes";

export default function CoachCompatibilityPage() {
  redirect(COACH_HOME_PATH);
}
