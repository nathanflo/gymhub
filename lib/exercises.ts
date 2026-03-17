import { getSessions } from "./sessions";
import { getWorkouts } from "./storage";

/** Returns a sorted, case-insensitively deduplicated list of exercise names the user has logged.
 *  The first-seen display version is preserved as the canonical name. */
export function getExerciseLibrary(): string[] {
  const seen = new Map<string, string>(); // lowercase key → first-seen display value
  const add = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  };
  getSessions().forEach((s) => s.exercises.forEach((e) => add(e.name)));
  getWorkouts().forEach((w) => add(w.exercise));
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
