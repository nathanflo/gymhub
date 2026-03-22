/**
 * sessions.ts – Supabase wrapper for WorkoutSession entries.
 * Replaces the localStorage implementation from Phase 1–8.
 */

import { WorkoutSession } from "@/types/session";
import { supabase } from "./supabase";

function toSession(row: any): WorkoutSession {
  const isYoga = row.workout_type === "Yoga";
  const yogaRaw = isYoga && Array.isArray(row.exercises) && row.exercises[0]?._yogaSession
    ? row.exercises[0]
    : null;

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
    started_at: row.started_at ?? undefined,
    ended_at: row.ended_at ?? undefined,
    exercises: isYoga ? [] : (row.exercises ?? []),
    yogaStyle: yogaRaw?.style ?? undefined,
    yogaCustomStyle: yogaRaw?.customStyle ?? undefined,
    yogaDurationMinutes: yogaRaw?.durationMinutes ?? undefined,
    yogaIntention: yogaRaw?.intention ?? undefined,
    yogaSource: yogaRaw?.source ?? undefined,
    yogaMobilityRating: yogaRaw?.mobilityRating ?? undefined,
    yogaFlexibilityRating: yogaRaw?.flexibilityRating ?? undefined,
    yogaClarityRating: yogaRaw?.clarityRating ?? undefined,
  };
}

/** Read all sessions, newest first. */
export async function getSessions(): Promise<WorkoutSession[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(toSession);
}

/** Read a single session by id. */
export async function getSessionById(id: string): Promise<WorkoutSession | undefined> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return undefined;
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? toSession(data) : undefined;
}

/** Append a new session. */
export async function saveSession(session: WorkoutSession): Promise<void> {
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const user = authSession?.user;
  if (!user) return;

  await supabase.from("workout_sessions").insert({
    id: session.id,
    user_id: user.id,
    date: session.date,
    title: session.title,
    workout_type: session.workoutType,
    energy_level: session.energyLevel,
    notes: session.notes,
    bodyweight: session.bodyweight ?? null,
    distance: session.distance ?? null,
    duration: session.duration ?? null,
    intervals: session.intervals ?? null,
    started_at: session.started_at ?? null,
    ended_at: session.ended_at ?? null,
    exercises: session.workoutType === "Yoga"
      ? [{ _yogaSession: true,
           style: session.yogaStyle ?? null,
           customStyle: session.yogaCustomStyle ?? null,
           durationMinutes: session.yogaDurationMinutes ?? null,
           intention: session.yogaIntention ?? null,
           source: session.yogaSource ?? null,
           mobilityRating: session.yogaMobilityRating ?? null,
           flexibilityRating: session.yogaFlexibilityRating ?? null,
           clarityRating: session.yogaClarityRating ?? null }]
      : session.exercises,
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
      date: updated.date,
      title: updated.title,
      workout_type: updated.workoutType,
      energy_level: updated.energyLevel,
      notes: updated.notes,
      bodyweight: updated.bodyweight ?? null,
      distance: updated.distance ?? null,
      duration: updated.duration ?? null,
      intervals: updated.intervals ?? null,
      exercises: updated.workoutType === "Yoga"
        ? [{ _yogaSession: true,
             style: updated.yogaStyle ?? null,
             customStyle: updated.yogaCustomStyle ?? null,
             durationMinutes: updated.yogaDurationMinutes ?? null,
             intention: updated.yogaIntention ?? null,
             source: updated.yogaSource ?? null,
             mobilityRating: updated.yogaMobilityRating ?? null,
             flexibilityRating: updated.yogaFlexibilityRating ?? null,
             clarityRating: updated.yogaClarityRating ?? null }]
        : updated.exercises,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updated.id);
}
