import { Id } from "../../convex/_generated/dataModel";

export type WeightUnit = "lbs" | "kg";

export interface Exercise {
  _id: Id<"exercises">;
  _creationTime?: number; // Convex system field (present on fetched documents, not locally created objects)
  userId: string;
  name: string;
  muscleGroups?: string[]; // AI-classified muscle groups (Chest, Back, Shoulders, etc.)
  createdAt: number;
  deletedAt?: number;
}

export interface Set {
  _id: Id<"sets">;
  _creationTime?: number; // Convex system field (present on fetched documents, not locally created objects)
  userId?: string; // Optional - present in schema but not always accessed in frontend
  exerciseId: Id<"exercises">;
  reps: number;
  weight?: number;
  unit?: string; // "lbs" or "kg" - stored with set for data integrity
  performedAt: number;
}
