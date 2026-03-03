import { redirect } from "next/navigation";

export default async function ExerciseDetailPage() {
  redirect(`/today?prompt=${encodeURIComponent("show history overview")}`);
}
