import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();

  if (userId) {
    redirect("/today");
  }

  return children;
}
