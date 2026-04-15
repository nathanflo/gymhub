import { WorkoutSession, WorkoutSet } from "@/types/session";
import { resolveKg, fmtW } from "@/lib/units";

export interface ExerciseSessionSnap {
  date: string;
  sets: WorkoutSet[];  // weights normalized to canonical kg (plates kept raw)
}

export interface ExerciseInsightsData {
  sessions: ExerciseSessionSnap[];         // up to 8, newest first
  lastSession: ExerciseSessionSnap | null;
  previousSession: ExerciseSessionSnap | null;
  bestWeight: number | null;               // canonical kg (or raw plates)
  bestSet: { weight: number; reps: number } | null;  // canonical kg (or raw plates)
  isPlates: boolean;                       // true = exercise uses plate counting
}

export function getExerciseInsights(
  exerciseName: string,
  allSessions: WorkoutSession[]
): ExerciseInsightsData {
  const key = exerciseName.trim().toLowerCase();
  const matched: ExerciseSessionSnap[] = [];
  let isPlates = false;

  for (const session of allSessions) {  // already sorted desc by date
    const ex = session.exercises.find(e => e.name.trim().toLowerCase() === key);
    if (ex && ex.sets.length > 0) {
      const exIsPlates = (ex.unit ?? "kg") === "plates";
      isPlates = exIsPlates;

      // Normalize set weights to canonical kg so display layer only needs workingUnit.
      // Plates are left as-is (raw plate count has no kg equivalent).
      const normalizedSets: WorkoutSet[] = ex.sets.map((set) => {
        if (set.weight === undefined || exIsPlates) return set;
        const kg = resolveKg(set.weight, ex.unit, ex._canonicalKg);
        return kg !== null ? { ...set, weight: kg } : set;
      });

      matched.push({ date: session.date, sets: normalizedSets });
    }
  }

  let bestWeight: number | null = null;
  let bestSet: { weight: number; reps: number } | null = null;

  for (const snap of matched) {
    for (const set of snap.sets) {
      if (set.weight !== undefined) {
        if (bestWeight === null || set.weight > bestWeight) bestWeight = set.weight;
        if (set.reps !== undefined) {
          const score = set.weight * set.reps;
          const cur = bestSet ? bestSet.weight * bestSet.reps : 0;
          if (score > cur) bestSet = { weight: set.weight, reps: set.reps };
        }
      }
    }
  }

  return {
    sessions: matched.slice(0, 8),
    lastSession: matched[0] ?? null,
    previousSession: matched[1] ?? null,
    bestWeight,
    bestSet,
    isPlates,
  };
}

/** Highest-weight set within a session snapshot. */
export function topSetOf(sets: WorkoutSet[]): WorkoutSet | null {
  return sets.reduce<WorkoutSet | null>((best, s) => {
    if (!best || (s.weight ?? 0) > (best.weight ?? 0)) return s;
    return best;
  }, null);
}

/**
 * Format a single set for display.
 * Expects set.weight to be canonical kg (normalized by getExerciseInsights).
 */
export function formatSet(
  set: WorkoutSet,
  workingUnit: "kg" | "lbs" = "kg",
  isPlates = false
): string {
  if (set.weight !== undefined && set.reps !== undefined) {
    if (isPlates) return `${set.weight} plates × ${set.reps}`;
    return `${fmtW(set.weight, workingUnit)} × ${set.reps}`;
  }
  if (set.reps !== undefined) return `${set.reps} reps`;
  if (set.duration) return set.duration;
  return "—";
}

/** Short date label: "Mar 28" */
export function shortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
