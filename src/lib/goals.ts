export const GOAL_TYPES = [
  "build_muscle",
  "lose_weight",
  "maintain_fitness",
  "get_stronger",
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_LABELS: Record<GoalType, string> = {
  build_muscle: "Build muscle",
  lose_weight: "Lose weight",
  maintain_fitness: "Maintain fitness",
  get_stronger: "Get stronger",
};
