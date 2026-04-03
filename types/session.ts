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
  weight?: number;    // canonical kg if exercise._canonicalKg; else in exercise.unit (legacy)
  reps?: number;      // weight_reps and reps_only modes
  duration?: string;  // duration_only mode (free text: "5 min", "45s")
  type?: "warmup" | "drop";  // undefined = normal set
}

export interface WorkoutExercise {
  name: string;
  mode?: TrackingMode;     // undefined → "weight_reps" for backwards compat
  unit?: WeightUnit;       // undefined → "kg" for backwards compat (weight_reps only)
  _canonicalKg?: boolean;  // true = weight values are canonical kg; unit is display pref only (new sessions)
  sets: WorkoutSet[];
  freeformNote?: string;   // freeform mode only; sets is [] in this case
  note?: string;           // per-exercise note (all modes)
  target?: string;         // optional guidance text from recommended templates (e.g. "8–12 reps")
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
  intervals?: string;       // human-readable summary e.g. "1:00 / 1:00 × 8"

  // Structured run fields (V2)
  runSubtype?: "easy" | "intervals" | "incline" | "tempo" | "long" | "custom";
  runIntervalWork?: string;    // work phase duration e.g. "1:00"
  runIntervalRecover?: string; // recovery phase duration e.g. "1:00"
  runIntervalRepeat?: number;  // repeat count e.g. 8
  runIncline?: number;         // incline percent e.g. 6
  runSpeed?: string;           // speed/pace note e.g. "6.5 km/h" or "5:10 /km"

  // Yoga fields — populated when workoutType === "Yoga", exercises is []
  yogaStyle?: string;            // "Flow" | "Vinyasa" | "Power" | "Yin" | "Stretch" | "Custom"
  yogaCustomStyle?: string;      // free text when yogaStyle === "Custom"
  yogaDurationMinutes?: number;  // minutes logged by user
  yogaIntention?: string;        // "Recovery" | "Mobility" | "Flexibility" | "Relaxation" | "Energy" | "Mindfulness"
  yogaSource?: string;           // "Self-guided" | "Guided (App/Video)" | "Class (Studio)"
  yogaMobilityRating?: number;   // 1–5
  yogaFlexibilityRating?: number;// 1–5
  yogaClarityRating?: number;    // 1–5

  started_at?: string;      // ISO 8601 — when first set was logged or Begin Workout tapped
  ended_at?: string;        // ISO 8601 — when session was saved
}
