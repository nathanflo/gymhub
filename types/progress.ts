/**
 * Derived progress types — computed from raw workout data, never stored.
 *
 * Future additions:
 * - volumePR: number    (sets × reps × weight — for AI load analysis)
 * - repPR: number       (highest reps at a given weight)
 */
export interface PersonalRecord {
  exercise: string;   // display name (original casing from the PR workout)
  weight: number;     // highest logged weight for this exercise
  date: string;       // ISO 8601 date of the PR
  workoutId: string;  // links back to the source Workout entry
}
