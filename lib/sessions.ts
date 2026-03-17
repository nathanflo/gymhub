/**
 * sessions.ts – Supabase wrapper for WorkoutSession entries.
 * Replaces the localStorage implementation from Phase 1–8.
 */

import { WorkoutSession } from "@/types/session";
import { supabase } from "./supabase";

function toSession(row: any): WorkoutSession {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    workoutType: row.workout_type,
    energyLevel: row.energy_level,
    notes: row.notes,
    bodyweight: row.bodyweight ?? undefined,
    distance: row.distance ?? undefined,
    duration: row.duration ?? undefined,
    intervals: row.intervals ?? undefined,
    exercises: row.exercises,
  };
}

/** Read all sessions, newest first. */
export async function getSessions(): Promise<WorkoutSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(toSession);
}

/** Append a new session. */
export async function saveSession(session: WorkoutSession): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("workout_sessions").insert({
    id: session.id,
    user_id: user.id,
    date: session.date.slice(0, 10),
    title: session.title,
    workout_type: session.workoutType,
    energy_level: session.energyLevel,
    notes: session.notes,
    bodyweight: session.bodyweight ?? null,
    distance: session.distance ?? null,
    duration: session.duration ?? null,
    intervals: session.intervals ?? null,
    exercises: session.exercises,
  });
}

/** Remove a session by id. */
export async function deleteSession(id: string): Promise<void> {
  await supabase.from("workout_sessions").delete().eq("id", id);
}

/** Replace an existing session by id (preserves original date). */
export async function updateSession(updated: WorkoutSession): Promise<void> {
  await supabase
    .from("workout_sessions")
    .update({
      date: updated.date.slice(0, 10),
      title: updated.title,
      workout_type: updated.workoutType,
      energy_level: updated.energyLevel,
      notes: updated.notes,
      bodyweight: updated.bodyweight ?? null,
      distance: updated.distance ?? null,
      duration: updated.duration ?? null,
      intervals: updated.intervals ?? null,
      exercises: updated.exercises,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updated.id);
}
