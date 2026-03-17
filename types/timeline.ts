import { Workout } from "./workout";
import { BodyweightEntry } from "./bodyweight";
import { WorkoutSession } from "./session";

/**
 * Discriminated union for the unified activity timeline.
 * `date` is hoisted to the top level so sorting never needs to reach into `data`.
 *
 * Future variants:
 * - { kind: "photo"; date: string; data: ProgressPhoto }
 * - { kind: "wellness"; date: string; data: WellnessEntry }
 */
export type TimelineEntry =
  | { kind: "workout"; date: string; data: Workout }
  | { kind: "session"; date: string; data: WorkoutSession }
  | { kind: "bodyweight"; date: string; data: BodyweightEntry };
