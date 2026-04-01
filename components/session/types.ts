import { TrackingMode, WeightUnit } from "@/types/session";
import { WorkoutType, EnergyLevel } from "@/types/workout";

// ─── Draft types ──────────────────────────────────────────────────────────────
// Numeric fields stored as strings to avoid controlled-input NaN issues.

export interface DraftSet {
  weight: string;
  reps: string;
  duration: string;
  type?: "warmup" | "drop";
}

export interface DraftExercise {
  name: string;
  mode: TrackingMode;
  unit: WeightUnit;
  sets: DraftSet[];
  freeformNote: string;
  note?: string;    // undefined = hidden, "" or string = textarea shown
  target?: string;  // guidance from recommended templates (e.g. "8–12 reps")
  completed?: boolean;  // draft-only, not persisted to WorkoutExercise
}

export interface SessionFormState {
  title: string;
  workoutType: WorkoutType;
  energyLevel: EnergyLevel;
  notes: string;
  bodyweight: string;
  exercises: DraftExercise[];
  // Run fields
  distance: string;
  duration: string;
  intervals: string;
  // Structured run fields (V2)
  runSubtype: "easy" | "intervals" | "incline" | "tempo" | "long" | "custom";
  runIntervalWork: string;
  runIntervalRecover: string;
  runIntervalRepeat: string;
  runIncline: string;
  runSpeed: string;
  dateTime?: string;
  // Yoga fields
  yogaStyle: string;
  yogaCustomStyle: string;
  yogaDurationMinutes: string;
  yogaIntention: string;
  yogaSource: string;
  yogaMobilityRating: string;
  yogaFlexibilityRating: string;
  yogaClarityRating: string;
}

// ─── Factories ────────────────────────────────────────────────────────────────

export const emptySet = (): DraftSet => ({ weight: "", reps: "", duration: "" });
export const emptyExercise = (): DraftExercise => ({
  name: "",
  mode: "weight_reps",
  unit: "kg",
  sets: [emptySet()],
  freeformNote: "",
});
export const emptySessionForm = (): SessionFormState => ({
  title: "",
  workoutType: "Push",
  energyLevel: "Medium",
  notes: "",
  bodyweight: "",
  exercises: [emptyExercise()],
  distance: "",
  duration: "",
  intervals: "",
  runSubtype: "easy",
  runIntervalWork: "",
  runIntervalRecover: "",
  runIntervalRepeat: "",
  runIncline: "",
  runSpeed: "",
  yogaStyle: "Flow",
  yogaCustomStyle: "",
  yogaDurationMinutes: "",
  yogaIntention: "",
  yogaSource: "",
  yogaMobilityRating: "",
  yogaFlexibilityRating: "",
  yogaClarityRating: "",
});
