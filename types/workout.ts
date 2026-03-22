/**
 * Core workout entry type.
 *
 * Future additions:
 * - muscleGroups: string[]      (for AI insights + filtering)
 * - mediaUrls: string[]         (for progress photos)
 * - mood: string                (for wellness tracking)
 * - playlistId: string          (for Gym Set DJ integration)
 */

export type WorkoutType = "Push" | "Pull" | "Legs" | "Run" | "Full Body" | "Other" | "Yoga";
export type EnergyLevel = "Low" | "Medium" | "High";

export interface Workout {
  id: string;                 // UUID – unique identifier per entry
  date: string;               // ISO 8601 timestamp
  exercise: string;           // lifts: "Squat"; runs: "Morning Run", "5K Race"
  workoutType: WorkoutType;   // used by AI insights + Gym Set DJ
  energyLevel: EnergyLevel;  // subjective energy – used for AI load analysis
  notes: string;              // free-text, empty string if unused
  rpe?: number;               // Rate of Perceived Exertion 1–10 (lifting only for now)

  // Lifting fields — present when workoutType !== "Run"
  weight?: number;            // in kg
  sets?: number;
  reps?: number;

  // Run fields — present when workoutType === "Run"
  distance?: number;          // km
  duration?: string;          // free text: "31:45" or "45 min"
  intervals?: string;         // optional, e.g. "4 x 400m"
}
