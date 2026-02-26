"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ExerciseStats } from "@/lib/stats-calculator";
import { Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { motionPresets } from "@/lib/brutalist-motion";
import { BRUTALIST_TYPOGRAPHY } from "@/config/design-tokens";

interface DailyStatsCardProps {
  exerciseStats: ExerciseStats[];
}

export function DailyStatsCard({ exerciseStats }: DailyStatsCardProps) {
  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="text-lg">{"Today's Progress"}</CardTitle>
      </CardHeader>
      <CardContent>
        {exerciseStats.length > 0 ? (
          <>
            {/* Desktop: Table layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-display uppercase text-xs tracking-wider">
                      Exercise
                    </TableHead>
                    <TableHead className="text-right font-display uppercase text-xs tracking-wider">
                      Reps
                    </TableHead>
                    <TableHead className="text-right font-display uppercase text-xs tracking-wider">
                      Sets
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exerciseStats.map((exercise, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-display uppercase">
                        {exercise.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <motion.span
                          className={
                            BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.number
                          }
                          variants={motionPresets.numberReveal}
                          initial="initial"
                          animate="animate"
                        >
                          {exercise.reps}
                        </motion.span>
                      </TableCell>
                      <TableCell className="text-right">
                        <motion.span
                          className={
                            BRUTALIST_TYPOGRAPHY.pairings.setMetric.number
                          }
                          variants={motionPresets.numberReveal}
                          initial="initial"
                          animate="animate"
                        >
                          {exercise.sets}
                        </motion.span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Card layout */}
            <motion.div
              className="md:hidden space-y-2"
              variants={motionPresets.listStagger}
              initial="initial"
              animate="animate"
            >
              {exerciseStats.map((exercise, idx) => (
                <motion.div
                  key={idx}
                  variants={motionPresets.cardEntrance}
                  className="border-3 border-concrete-black dark:border-concrete-white p-3 bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="font-display uppercase tracking-wide">
                    {exercise.name}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <motion.span
                      className={
                        BRUTALIST_TYPOGRAPHY.pairings.analyticsMetric.number
                      }
                      variants={motionPresets.numberReveal}
                    >
                      {exercise.reps}
                    </motion.span>
                    <span
                      className={BRUTALIST_TYPOGRAPHY.pairings.setMetric.text}
                    >
                      reps
                    </span>
                    <span className="text-concrete-gray">•</span>
                    <motion.span
                      className={BRUTALIST_TYPOGRAPHY.pairings.setMetric.number}
                      variants={motionPresets.numberReveal}
                    >
                      {exercise.sets}
                    </motion.span>
                    <span
                      className={BRUTALIST_TYPOGRAPHY.pairings.setMetric.text}
                    >
                      sets
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        ) : (
          <div className="py-8 text-center">
            <Dumbbell className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No sets logged yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
