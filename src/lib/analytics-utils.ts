export type WorkoutFrequency = {
  date: string;
  setCount: number;
  totalVolume: number;
};

/**
 * Filter frequency data to start from user's first workout date
 * Prevents showing empty days before user started tracking
 */
export function filterFrequencyFromFirstWorkout(
  frequencyData: WorkoutFrequency[],
  firstWorkoutDate: string | null
): WorkoutFrequency[] {
  if (!firstWorkoutDate) return frequencyData;
  // Parse ISO date string properly
  const firstDateTs = new Date(firstWorkoutDate).getTime();
  return frequencyData.filter((day) => {
    const dayTimestamp = new Date(day.date).getTime();
    return dayTimestamp >= firstDateTs;
  });
}
