import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Nav } from "@/components/layout/nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { PaywallGate, TrialBanner } from "@/components/subscription";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <PaywallGate>
      <TrialBanner />
      <div className="min-h-screen flex flex-col">
        <Nav initialUserId={userId} />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </div>
      <div className="md:hidden">
        <BottomNav initialUserId={userId} />
      </div>
    </PaywallGate>
  );
}
