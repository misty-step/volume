"use client";

import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop";
import { DashboardMobile } from "@/components/dashboard/DashboardMobile";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { FirstRunExperience } from "@/components/dashboard/first-run-experience";
import { PageLayout } from "@/components/layout/page-layout";
import { useDashboard } from "@/hooks/useDashboard";
import { useMobileViewport } from "@/hooks/useMobileViewport";

export function Dashboard() {
  const isMobile = useMobileViewport();
  const {
    isHydrated,
    formOpen,
    setFormOpen,
    formRef,
    historyRef,
    unit,
    todaysSets,
    exercises,
    exerciseGroups,
    exerciseMap,
    activeExercisesByRecency,
    handleDeleteSet,
    handleRepeatSet,
    handleSetLogged,
    handleUndo,
    handleUndoDelete,
    handlePRFlash,
    handleHapticFeedback,
    handleFirstExerciseCreated,
  } = useDashboard({ isMobile });

  if (!isHydrated) {
    return (
      <PageLayout title={isMobile ? undefined : "Today"} fullHeight={isMobile}>
        <DashboardSkeleton isMobile={isMobile} />
      </PageLayout>
    );
  }

  if (todaysSets === undefined || exercises === undefined) {
    return null;
  }

  return (
    <PageLayout title={isMobile ? undefined : "Today"} fullHeight={isMobile}>
      {exercises.length === 0 ? (
        <FirstRunExperience onExerciseCreated={handleFirstExerciseCreated} />
      ) : isMobile ? (
        <DashboardMobile
          todaysSets={todaysSets}
          unit={unit}
          exerciseGroups={exerciseGroups}
          exerciseMap={exerciseMap}
          activeExercisesByRecency={activeExercisesByRecency}
          formOpen={formOpen}
          setFormOpen={setFormOpen}
          formRef={formRef}
          historyRef={historyRef}
          isHydrated={isHydrated}
          handleDeleteSet={handleDeleteSet}
          handleRepeatSet={handleRepeatSet}
          handleSetLogged={handleSetLogged}
          handleUndo={handleUndo}
          handleUndoDelete={handleUndoDelete}
          handlePRFlash={handlePRFlash}
          handleHapticFeedback={handleHapticFeedback}
        />
      ) : (
        <DashboardDesktop
          todaysSets={todaysSets}
          unit={unit}
          exerciseGroups={exerciseGroups}
          exerciseMap={exerciseMap}
          activeExercisesByRecency={activeExercisesByRecency}
          formRef={formRef}
          historyRef={historyRef}
          isHydrated={isHydrated}
          handleDeleteSet={handleDeleteSet}
          handleRepeatSet={handleRepeatSet}
          handleSetLogged={handleSetLogged}
          handleUndo={handleUndo}
          handleUndoDelete={handleUndoDelete}
          handlePRFlash={handlePRFlash}
          handleHapticFeedback={handleHapticFeedback}
        />
      )}
    </PageLayout>
  );
}
