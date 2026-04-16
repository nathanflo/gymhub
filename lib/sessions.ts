/**
 * sessions.ts – Supabase wrapper for WorkoutSession entries.
 * Replaces the localStorage implementation from Phase 1–8.
 */

import { WorkoutSession } from "@/types/session";
import { supabase } from "./supabase";

// ── In-memory session cache ───────────────────────────────────────────────────
// Avoids redundant Supabase round-trips within a single page session.
// Invalidated whenever a session is written or deleted.
let _cache: WorkoutSession[] | null = null;
let _cacheAt = 0;
const CACHE_TTL = 30_000; // 30 s

export function invalidateSessions(): void {
  _cache = null;
  _cacheAt = 0;
}

function toSession(row: any): WorkoutSession {
  const isYoga = row.workout_type === "Yoga";
  const isRun = row.workout_type === "Run";
  const rawExercises = Array.isArray(row.exercises) ? row.exercises : [];
  const yogaRaw = isYoga && rawExercises[0]?._yogaSession ? rawExercises[0] : null;
  const runMeta = isRun && rawExercises[0]?._runMeta ? rawExercises[0] : null;

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
    exercises: isYoga || runMeta ? [] : rawExercises,
    yogaStyle: yogaRaw?.style ?? undefined,
    yogaCustomStyle: yogaRaw?.customStyle ?? undefined,
    yogaDurationMinutes: yogaRaw?.durationMinutes ?? undefined,
    yogaIntention: yogaRaw?.intention ?? undefined,
    yogaSource: yogaRaw?.source ?? undefined,
    yogaMobilityRating: yogaRaw?.mobilityRating ?? undefined,
    yogaFlexibilityRating: yogaRaw?.flexibilityRating ?? undefined,
    yogaClarityRating: yogaRaw?.clarityRating ?? undefined,
    runSubtype: runMeta?.subtype ?? undefined,
    runIntervalWork: runMeta?.work ?? undefined,
    runIntervalRecover: runMeta?.recover ?? undefined,
    runIntervalRepeat: runMeta?.repeat ?? undefined,
    runIncline: runMeta?.incline ?? undefined,
    runSpeed: runMeta?.speed ?? undefined,
  };
}

/** Read all sessions, newest first. Results cached for 30 s; call invalidateSessions() after writes. */
export async function getSessions(): Promise<WorkoutSession[]> {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL) return _cache;

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];
  _cache = data.map(toSession);
  _cacheAt = now;
  return _cache;
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

  const { error } = await supabase.from("workout_sessions").insert({
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
      : session.workoutType === "Run" && session.runSubtype
      ? [{ _runMeta: true,
           subtype: session.runSubtype,
           work: session.runIntervalWork ?? null,
           recover: session.runIntervalRecover ?? null,
           repeat: session.runIntervalRepeat ?? null,
           incline: session.runIncline ?? null,
           speed: session.runSpeed ?? null }]
      : session.exercises,
  });
  if (error) throw new Error(`Failed to save session: ${error.message}`);
  invalidateSessions();
}

/** Remove a session by id. */
export async function deleteSession(id: string): Promise<void> {
  await supabase.from("workout_sessions").delete().eq("id", id);
  invalidateSessions();
}

/** Replace an existing session by id (preserves original date). */
export async function updateSession(updated: WorkoutSession): Promise<void> {
  const { error } = await supabase
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
        : updated.workoutType === "Run" && updated.runSubtype
        ? [{ _runMeta: true,
             subtype: updated.runSubtype,
             work: updated.runIntervalWork ?? null,
             recover: updated.runIntervalRecover ?? null,
             repeat: updated.runIntervalRepeat ?? null,
             incline: updated.runIncline ?? null,
             speed: updated.runSpeed ?? null }]
        : updated.exercises,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updated.id);
  if (error) throw new Error(`Failed to update session: ${error.message}`);
  invalidateSessions();
}
