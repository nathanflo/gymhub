/**
 * progress.ts – pure derivation functions for the Progress page.
 * No localStorage access — receives data as arguments so these are
 * easy to test and reusable by future AI insights features.
 */

import { Workout } from "@/types/workout";
import { BodyweightEntry } from "@/types/bodyweight";
import { PersonalRecord } from "@/types/progress";
import { TimelineEntry } from "@/types/timeline";
import { WorkoutSession, WorkoutExercise } from "@/types/session";

// ─── Personal Records ─────────────────────────────────────────────────────────

/**
 * Derive PRs from legacy single-exercise workouts.
 * Skips entries with empty names, zero, negative, or invalid weights.
 */
export function getPRs(workouts: Workout[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();

  for (const w of workouts) {
    if (!w.exercise.trim()) continue;
    if (!w.weight || w.weight <= 0 || isNaN(w.weight)) continue;

    const key = w.exercise.trim().toLowerCase();
    const existing = map.get(key);

    if (!existing || w.weight > existing.weight) {
      map.set(key, {
        exercise: w.exercise.trim(),
        weight: w.weight,
        date: w.date,
        workoutId: w.id,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.exercise.localeCompare(b.exercise)
  );
}

/**
 * Derive PRs from workout sessions.
 * Only weight_reps exercises contribute to PRs. lbs are converted to kg for
 * consistent comparison. Plates are skipped (no meaningful kg equivalent).
 */
export function getPRsFromSessions(sessions: WorkoutSession[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (!exercise.name.trim()) continue;

      const mode = exercise.mode ?? "weight_reps";
      if (mode !== "weight_reps") continue;

      const unit = exercise.unit ?? "kg";
      if (unit === "plates") continue;

      const toKg = (w: number) => unit === "lbs" ? w * 0.453592 : w;

      for (const set of exercise.sets) {
        if (set.type === "warmup") continue;
        if (!set.weight || set.weight <= 0 || isNaN(set.weight)) continue;

        const weightKg = toKg(set.weight);
        const key = exercise.name.trim().toLowerCase();
        const existing = map.get(key);

        if (!existing || weightKg > existing.weight) {
          map.set(key, {
            exercise: exercise.name.trim(),
            weight: Math.round(weightKg * 100) / 100,
            date: session.date,
            workoutId: session.id,
          });
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.exercise.localeCompare(b.exercise)
  );
}

/**
 * Merge PRs from legacy workouts and sessions.
 * Highest weight per exercise wins across both sources.
 * Future: pass to AI insights for trend analysis.
 */
export function getAllPRs(
  workouts: Workout[],
  sessions: WorkoutSession[]
): PersonalRecord[] {
  const all = [...getPRs(workouts), ...getPRsFromSessions(sessions)];
  const map = new Map<string, PersonalRecord>();

  for (const pr of all) {
    const key = pr.exercise.trim().toLowerCase();
    const existing = map.get(key);
    if (!existing || pr.weight > existing.weight) {
      map.set(key, pr);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.exercise.localeCompare(b.exercise)
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/**
 * Merge legacy workouts, sessions, and bodyweight entries into a single timeline,
 * sorted newest first.
 * `sessions` defaults to [] so existing call sites without sessions still compile.
 */
export function getTimeline(
  workouts: Workout[],
  sessions: WorkoutSession[] = [],
  bodyweightEntries: BodyweightEntry[]
): TimelineEntry[] {
  const workoutEntries: TimelineEntry[] = workouts.map((w) => ({
    kind: "workout",
    date: w.date,
    data: w,
  }));

  const sessionEntries: TimelineEntry[] = sessions.map((s) => ({
    kind: "session",
    date: s.date,
    data: s,
  }));

  const bwEntries: TimelineEntry[] = bodyweightEntries.map((e) => ({
    kind: "bodyweight",
    date: e.date,
    data: e,
  }));

  return [...workoutEntries, ...sessionEntries, ...bwEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/**
 * Format an exercise as a compact summary line, branched by tracking mode.
 * Examples:
 *   weight_reps:   "3×8 (70,80,90 kg)" or "3×8 (100 lbs)"
 *   reps_only:     "3×10" or "3×8–12"
 *   duration_only: "5 min" (single) or "3×2 min" (uniform) or "2 min, 3 min" (varied)
 *   freeform:      freeformNote text (caller prepends exercise name)
 */
export function formatExerciseSummary(exercise: WorkoutExercise): string {
  const { sets } = exercise;
  const mode = exercise.mode ?? "weight_reps";

  if (mode === "freeform") {
    return exercise.freeformNote?.trim() ?? "";
  }

  if (mode === "reps_only") {
    if (!sets.length) return "";
    const repValues = sets.map((s) => s.reps ?? 0).filter((r) => r > 0);
    if (!repValues.length) return "";
    const minReps = Math.min(...repValues);
    const maxReps = Math.max(...repValues);
    const repStr = minReps === maxReps ? String(minReps) : `${minReps}–${maxReps}`;
    return `${sets.length}×${repStr}`;
  }

  if (mode === "duration_only") {
    if (!sets.length) return "";
    const durations = sets.map((s) => s.duration ?? "").filter(Boolean);
    if (!durations.length) return "";
    if (sets.length === 1) return durations[0];
    const unique = [...new Set(durations)];
    if (unique.length === 1) return `${sets.length}×${unique[0]}`;
    return durations.join(", ");
  }

  // weight_reps (default)
  if (!sets.length) return "";
  const unit = exercise.unit ?? "kg";

  const repValues = sets.map((s) => s.reps ?? 0);
  const minReps = Math.min(...repValues);
  const maxReps = Math.max(...repValues);
  const repStr = minReps === maxReps ? String(minReps) : `${minReps}–${maxReps}`;

  // Round weights to 1dp to avoid float noise, then deduplicate + sort
  const roundedWeights = sets
    .map((s) => (s.weight !== undefined ? Math.round(s.weight * 10) / 10 : null))
    .filter((w): w is number => w !== null);
  const uniqueWeights = [...new Set(roundedWeights)].sort((a, b) => a - b);
  const weightStr = uniqueWeights
    .map((w) => (w % 1 === 0 ? String(w) : w.toFixed(1)))
    .join(",");

  return `${sets.length}×${repStr} (${weightStr} ${unit})`;
}
