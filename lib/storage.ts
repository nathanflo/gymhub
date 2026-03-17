/**
 * storage.ts – thin wrapper around localStorage for workout persistence.
 *
 * Keeping all storage logic here means swapping to a real database later
 * only requires changes in this one file.
 *
 * Future: replace localStorage calls with fetch() calls to an API route
 * backed by Postgres / Supabase / PlanetScale.
 */

import { Workout } from "@/types/workout";

const STORAGE_KEY = "gymhub_workouts";

/** Read all workouts from localStorage, newest first. */
export function getWorkouts(): Workout[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const workouts: Workout[] = JSON.parse(raw);
    // Sort descending by date so most recent appears first
    return workouts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}

/** Append a new workout entry. */
export function saveWorkout(workout: Workout): void {
  if (typeof window === "undefined") return;

  const existing = getWorkouts();
  // Preserve existing sort order; new entry will surface at top after sort
  const updated = [...existing, workout];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Remove a single workout by id. */
export function deleteWorkout(id: string): void {
  if (typeof window === "undefined") return;

  const updated = getWorkouts().filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Replace an existing workout by id (preserves original date). */
export function updateWorkout(updated: Workout): void {
  if (typeof window === "undefined") return;

  const all = getWorkouts().map((w) => (w.id === updated.id ? updated : w));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
