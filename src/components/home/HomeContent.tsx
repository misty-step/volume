"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { UnauthenticatedLanding } from "@/components/landing/UnauthenticatedLanding";

// Lazy load dashboard so logged-out visitors avoid downloading heavy data widgets
const Dashboard = dynamic(() =>
  import("@/components/dashboard/Dashboard").then((mod) => ({
    default: mod.Dashboard,
  }))
);

type ResolverInput = {
  initialSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null | undefined;
};

export function resolveSignedInState({
  initialSignedIn,
  isLoaded,
  userId,
}: ResolverInput) {
  return isLoaded ? Boolean(userId) : initialSignedIn;
}

type HomeContentProps = {
  initialSignedIn: boolean;
};

export function HomeContent({ initialSignedIn }: HomeContentProps) {
  const { isLoaded, userId } = useAuth();

  const shouldShowDashboard = resolveSignedInState({
    initialSignedIn,
    isLoaded,
    userId,
  });

  return shouldShowDashboard ? <Dashboard /> : <UnauthenticatedLanding />;
}
