"use client";

import { motion } from "framer-motion";
import type { RefObject } from "react";
import type { DeletedSetData } from "@/components/dashboard/exercise-set-group";
import {
  QuickLogForm,
  type QuickLogFormHandle,
} from "@/components/dashboard/quick-log-form";
import { GroupedSetHistory } from "@/components/dashboard/grouped-set-history";
import { DailyTotalsBanner } from "@/components/dashboard/DailyTotalsBanner";
import { LAYOUT } from "@/lib/layout-constants";
import { motionPresets } from "@/lib/brutalist-motion";
import type { ExerciseGroup } from "@/lib/exercise-grouping";
import type { Exercise, Set as WorkoutSet, WeightUnit } from "@/types/domain";
import { type Id } from "../../../convex/_generated/dataModel";

export interface DashboardDesktopProps {
  todaysSets: WorkoutSet[];
  unit: WeightUnit;
  exerciseGroups: ExerciseGroup[];
  exerciseMap: Map<Id<"exercises">, Exercise>;
  activeExercisesByRecency: Exercise[];
  formRef: RefObject<QuickLogFormHandle | null>;
  historyRef: RefObject<HTMLDivElement | null>;
  isHydrated: boolean;
  handleDeleteSet: (setId: Id<"sets">) => Promise<void>;
  handleRepeatSet: (set: WorkoutSet) => void;
  handleSetLogged: () => void;
  handleUndo: (setId: Id<"sets">) => Promise<void>;
  handleUndoDelete: (setData: DeletedSetData) => Promise<void>;
  handlePRFlash: () => void;
  handleHapticFeedback: () => void;
}

export function DashboardDesktop({
  todaysSets,
  unit,
  exerciseGroups,
  exerciseMap,
  activeExercisesByRecency,
  formRef,
  historyRef,
  isHydrated,
  handleDeleteSet,
  handleRepeatSet,
  handleSetLogged,
  handleUndo,
  handleUndoDelete,
  handlePRFlash,
  handleHapticFeedback,
}: DashboardDesktopProps) {
  return (
    <motion.div
      className={LAYOUT.section.spacing}
      variants={motionPresets.listStagger}
      initial="initial"
      animate="animate"
    >
      {/* Daily Totals Banner - above form on desktop */}
      <motion.div variants={motionPresets.cardEntrance}>
        <DailyTotalsBanner todaysSets={todaysSets} preferredUnit={unit} />
      </motion.div>

      {/* Quick Log Form - PRIME POSITION */}
      <motion.div variants={motionPresets.cardEntrance}>
        <QuickLogForm
          ref={formRef}
          exercises={activeExercisesByRecency}
          todaysSets={todaysSets}
          onSetLogged={handleSetLogged}
          onUndo={handleUndo}
          onPRFlash={handlePRFlash}
          onHapticFeedback={handleHapticFeedback}
        />
      </motion.div>

      {/* Today's Set History - Aggregated stats with drill-down */}
      <motion.div variants={motionPresets.cardEntrance}>
        <GroupedSetHistory
          ref={historyRef}
          exerciseGroups={exerciseGroups}
          exerciseMap={exerciseMap}
          onRepeat={handleRepeatSet}
          onDelete={handleDeleteSet}
          onUndoDelete={handleUndoDelete}
          isLoading={!isHydrated}
        />
      </motion.div>
    </motion.div>
  );
}
