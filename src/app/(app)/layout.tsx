import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { PaywallGate, TrialBanner } from "@/components/subscription";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <PaywallGate>
      <TrialBanner />
      <div className="relative min-h-dvh flex flex-col">
        <div className="hatch-pattern" />
        <Nav initialUserId={userId} />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
        <Footer />
      </div>
    </PaywallGate>
  );
}
