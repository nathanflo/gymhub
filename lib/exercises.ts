import { getSessions } from "./sessions";
import { getWorkouts } from "./storage";

export const STARTER_EXERCISES: string[] = [
  "Bench Press",
  "Incline Dumbbell Press",
  "Shoulder Press",
  "Lat Pulldown",
  "Seated Cable Row",
  "Bicep Curl",
  "Tricep Pushdown",
  "Squat",
  "Leg Press",
  "Romanian Deadlift",
  "Leg Curl",
  "Leg Extension",
  "Calf Raise",
  "Lateral Raise",
  "Pec Fly",
  "Treadmill Run",
  "Outdoor Run",
];

/** Returns a deduplicated list of exercise names: user-logged exercises first, then starter
 *  exercises to fill in. The first-seen display version is preserved as the canonical name. */
export async function getExerciseLibrary(): Promise<string[]> {
  const seen = new Map<string, string>(); // lowercase key → first-seen display value
  const add = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  };
  const [sessions, workouts] = await Promise.all([getSessions(), getWorkouts()]);
  sessions.forEach((s) => s.exercises.forEach((e) => add(e.name)));
  workouts.forEach((w) => add(w.exercise));
  STARTER_EXERCISES.forEach(add);
  return Array.from(seen.values());
}
