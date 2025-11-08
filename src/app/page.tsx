import { auth } from "@clerk/nextjs/server";
import { HomeContent } from "@/components/home/HomeContent";

export default async function Home() {
  const { userId } = await auth();

  return <HomeContent initialSignedIn={Boolean(userId)} />;
}
