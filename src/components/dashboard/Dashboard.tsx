"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop";
import { DashboardMobile } from "@/components/dashboard/DashboardMobile";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { FirstRunExperience } from "@/components/dashboard/first-run-experience";
import { ProfileNudgeBanner } from "@/components/dashboard/profile-nudge-banner";
import { PageLayout } from "@/components/layout/page-layout";
import { useDashboard } from "@/hooks/useDashboard";
import { useMobileViewport } from "@/hooks/useMobileViewport";

export function Dashboard(): React.ReactElement | null {
  const isMobile = useMobileViewport();
  const dashboard = useDashboard({ isMobile });
  const { isHydrated, todaysSets, exercises } = dashboard;
  const currentUser = useQuery(api.users.getCurrentUser);

  const title = isMobile ? undefined : "Today";

  if (!isHydrated) {
    return (
      <PageLayout title={title} fullHeight={isMobile}>
        <DashboardSkeleton isMobile={isMobile} />
      </PageLayout>
    );
  }

  if (todaysSets === undefined || exercises === undefined) {
    return null;
  }

  // First-run: no exercises yet
  if (exercises.length === 0) {
    return (
      <PageLayout title={title} fullHeight={isMobile}>
        <FirstRunExperience
          onExerciseCreated={dashboard.handleFirstExerciseCreated}
        />
      </PageLayout>
    );
  }

  // Normal dashboard view
  const sharedProps = {
    todaysSets,
    unit: dashboard.unit,
    exerciseGroups: dashboard.exerciseGroups,
    exerciseMap: dashboard.exerciseMap,
    activeExercisesByRecency: dashboard.activeExercisesByRecency,
    formRef: dashboard.formRef,
    historyRef: dashboard.historyRef,
    isHydrated,
    handleDeleteSet: dashboard.handleDeleteSet,
    handleRepeatSet: dashboard.handleRepeatSet,
    handleSetLogged: dashboard.handleSetLogged,
    handleUndo: dashboard.handleDeleteSet, // Same operation: delete the set
    handleUndoDelete: dashboard.handleUndoDelete,
    handlePRFlash: dashboard.handlePRFlash,
    handleHapticFeedback: dashboard.handleHapticFeedback,
  } as const;

  return (
    <PageLayout title={title} fullHeight={isMobile}>
      <ProfileNudgeBanner user={currentUser} />
      {isMobile ? (
        <DashboardMobile
          {...sharedProps}
          formOpen={dashboard.formOpen}
          setFormOpen={dashboard.setFormOpen}
        />
      ) : (
        <DashboardDesktop {...sharedProps} />
      )}
    </PageLayout>
  );
}
