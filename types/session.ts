import { WorkoutType, EnergyLevel } from "./workout";

/**
 * Phase 3+ session model — one session contains multiple exercises,
 * each with a tracking mode.
 *
 * Future additions:
 * - muscleGroups per exercise
 * - mediaUrls: string[]    (progress photos)
 * - supersetId?: string    (grouping exercises into supersets)
 * - playlistId?: string    (Gym Set DJ)
 */

export type TrackingMode = "weight_reps" | "reps_only" | "duration_only" | "freeform";
export type WeightUnit = "kg" | "lbs" | "plates";

export interface WorkoutSet {
  weight?: number;    // weight_reps mode — stored in the unit specified by exercise.unit
  reps?: number;      // weight_reps and reps_only modes
  duration?: string;  // duration_only mode (free text: "5 min", "45s")
}

export interface WorkoutExercise {
  name: string;
  mode?: TrackingMode;     // undefined → "weight_reps" for backwards compat
  unit?: WeightUnit;       // undefined → "kg" for backwards compat (weight_reps only)
  sets: WorkoutSet[];
  freeformNote?: string;   // freeform mode only; sets is [] in this case
}

export interface WorkoutSession {
  id: string;               // UUID
  date: string;             // ISO 8601
  title: string;            // e.g. "Chest / Biceps", "Lower Body"
  workoutType: WorkoutType;
  energyLevel: EnergyLevel;
  notes: string;
  exercises: WorkoutExercise[];
  bodyweight?: number;      // optional kg snapshot at session time

  // Run fields — populated when workoutType === "Run", exercises is []
  distance?: number;        // km
  duration?: string;        // free text: "31:45" or "45 min"
  intervals?: string;       // e.g. "4 x 400m"
}
