"use client";

import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BrutalistCard } from "@/components/brutalist/BrutalistCard";
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
import {
  numberDisplayClasses,
  labelDisplayClasses,
} from "@/lib/typography-utils";

interface DailyStatsCardProps {
  exerciseStats: ExerciseStats[];
}

export function DailyStatsCard({ exerciseStats }: DailyStatsCardProps) {
  return (
    <BrutalistCard className="p-6">
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
                      <TableCell
                        className={`text-right ${numberDisplayClasses.large}`}
                      >
                        {exercise.reps}
                      </TableCell>
                      <TableCell
                        className={`text-right ${numberDisplayClasses.default}`}
                      >
                        {exercise.sets}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Card layout */}
            <div className="md:hidden space-y-2">
              {exerciseStats.map((exercise, idx) => (
                <div
                  key={idx}
                  className="border-3 border-concrete-black dark:border-concrete-white p-3 bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="font-display uppercase tracking-wide">
                    {exercise.name}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={numberDisplayClasses.large}>
                      {exercise.reps}
                    </span>
                    <span className={labelDisplayClasses.default}>reps</span>
                    <span className="text-concrete-gray">•</span>
                    <span className={numberDisplayClasses.default}>
                      {exercise.sets}
                    </span>
                    <span className={labelDisplayClasses.default}>sets</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <Dumbbell className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No sets logged yet</p>
          </div>
        )}
      </CardContent>
    </BrutalistCard>
  );
}
