import { WorkoutType } from "./workout";
import { WorkoutExercise } from "./session";

export interface WorkoutTemplate {
  id: string;
  name: string;         // from session.title
  workoutType: WorkoutType;
  exercises: WorkoutExercise[];
  // Run fields (when workoutType === "Run")
  distance?: number;
  duration?: string;
  intervals?: string;
}
