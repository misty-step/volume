import { redirect } from "next/navigation";

type ExerciseDetailPageProps = {
  params: Promise<{ exerciseId: string }>;
};

export default async function ExerciseDetailPage({
  params,
}: ExerciseDetailPageProps) {
  const { exerciseId } = await params;
  redirect(
    `/today?prompt=${encodeURIComponent(`show history overview for exercise ${exerciseId}`)}`
  );
}
