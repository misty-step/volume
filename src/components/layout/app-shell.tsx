import { type ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { PaywallGate, TrialBanner } from "@/components/subscription";

type AppShellProps = {
  children: ReactNode;
  initialUserId?: string | null;
};

export function AppShell({ children, initialUserId }: AppShellProps) {
  return (
    <PaywallGate>
      <TrialBanner />
      <div className="relative min-h-dvh flex flex-col">
        <div className="hatch-pattern" />
        <Nav initialUserId={initialUserId} />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
        <Footer />
      </div>
    </PaywallGate>
  );
}
