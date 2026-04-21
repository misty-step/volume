import { redirect } from "next/navigation";

export default async function ExerciseDetailPage() {
  redirect(`/coach?prompt=${encodeURIComponent("show history overview")}`);
}
