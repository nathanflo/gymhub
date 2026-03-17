/**
 * storage.ts – Supabase wrapper for legacy single-exercise Workout entries.
 * Replaces the localStorage implementation from Phase 1–8.
 */

import { Workout } from "@/types/workout";
import { supabase } from "./supabase";

function toWorkout(row: any): Workout {
  return {
    id: row.id,
    date: row.date,
    exercise: row.exercise,
    workoutType: row.workout_type,
    energyLevel: row.energy_level,
    notes: row.notes,
    rpe: row.rpe ?? undefined,
    weight: row.weight ?? undefined,
    sets: row.sets ?? undefined,
    reps: row.reps ?? undefined,
    distance: row.distance ?? undefined,
    duration: row.duration ?? undefined,
    intervals: row.intervals ?? undefined,
  };
}

/** Read all workouts, newest first. */
export async function getWorkouts(): Promise<Workout[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(toWorkout);
}

/** Append a new workout entry. */
export async function saveWorkout(workout: Workout): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("workouts").insert({
    id: workout.id,
    user_id: user.id,
    date: workout.date.slice(0, 10),
    exercise: workout.exercise,
    workout_type: workout.workoutType,
    energy_level: workout.energyLevel,
    notes: workout.notes,
    rpe: workout.rpe ?? null,
    weight: workout.weight ?? null,
    sets: workout.sets ?? null,
    reps: workout.reps ?? null,
    distance: workout.distance ?? null,
    duration: workout.duration ?? null,
    intervals: workout.intervals ?? null,
  });
}

/** Remove a single workout by id. */
export async function deleteWorkout(id: string): Promise<void> {
  await supabase.from("workouts").delete().eq("id", id);
}

/** Replace an existing workout by id (preserves original date). */
export async function updateWorkout(updated: Workout): Promise<void> {
  await supabase
    .from("workouts")
    .update({
      date: updated.date.slice(0, 10),
      exercise: updated.exercise,
      workout_type: updated.workoutType,
      energy_level: updated.energyLevel,
      notes: updated.notes,
      rpe: updated.rpe ?? null,
      weight: updated.weight ?? null,
      sets: updated.sets ?? null,
      reps: updated.reps ?? null,
      distance: updated.distance ?? null,
      duration: updated.duration ?? null,
      intervals: updated.intervals ?? null,
    })
    .eq("id", updated.id);
}
