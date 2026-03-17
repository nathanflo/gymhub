/**
 * migrate.ts – one-time localStorage → Supabase migration.
 * Called on first successful login. Safe to re-run (upsert with onConflict: "id").
 */

import { supabase } from "./supabase";
import { WorkoutSession } from "@/types/session";
import { Workout } from "@/types/workout";
import { BodyweightEntry } from "@/types/bodyweight";
import { WellnessEntry } from "@/types/wellness";
import { WorkoutTemplate } from "@/types/template";

const MIGRATED_KEY = "gymhub_migrated";

function readLS<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function runMigrationIfNeeded(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_KEY) === "true") return;

  const sessions: WorkoutSession[] = readLS("gymhub_sessions");
  const workouts: Workout[] = readLS("gymhub_workouts");
  const templates: WorkoutTemplate[] = readLS("gymhub_templates");
  const bwEntries: BodyweightEntry[] = readLS("gymhub_bodyweight");
  const wellnessEntries: WellnessEntry[] = readLS("gymhub_wellness");

  const sessionRows = sessions.map((s) => ({
    id: s.id,
    user_id: userId,
    date: s.date.slice(0, 10),
    title: s.title,
    workout_type: s.workoutType,
    energy_level: s.energyLevel,
    notes: s.notes,
    bodyweight: s.bodyweight ?? null,
    distance: s.distance ?? null,
    duration: s.duration ?? null,
    intervals: s.intervals ?? null,
    exercises: s.exercises,
  }));

  const workoutRows = workouts.map((w) => ({
    id: w.id,
    user_id: userId,
    date: w.date.slice(0, 10),
    exercise: w.exercise,
    workout_type: w.workoutType,
    energy_level: w.energyLevel,
    notes: w.notes,
    rpe: w.rpe ?? null,
    weight: w.weight ?? null,
    sets: w.sets ?? null,
    reps: w.reps ?? null,
    distance: w.distance ?? null,
    duration: w.duration ?? null,
    intervals: w.intervals ?? null,
  }));

  const templateRows = templates.map((t) => ({
    id: t.id,
    user_id: userId,
    name: t.name,
    workout_type: t.workoutType,
    exercises: t.exercises,
    distance: t.distance ?? null,
    duration: t.duration ?? null,
    intervals: t.intervals ?? null,
  }));

  const bwRows = bwEntries.map((e) => ({
    id: e.id,
    user_id: userId,
    date: e.date.slice(0, 10),
    weight: e.weight,
  }));

  const wellnessRows = wellnessEntries.map((e) => ({
    id: e.id,
    user_id: userId,
    date: e.date,
    sleep: e.sleep ?? null,
    hydration: e.hydration ?? null,
    caffeine: e.caffeine ?? null,
    mood: e.mood ?? null,
    soreness: e.soreness ?? null,
    notes: e.notes ?? null,
  }));

  await Promise.all([
    sessions.length > 0
      ? supabase.from("workout_sessions").upsert(sessionRows, { onConflict: "id" })
      : Promise.resolve(),
    workouts.length > 0
      ? supabase.from("workouts").upsert(workoutRows, { onConflict: "id" })
      : Promise.resolve(),
    templates.length > 0
      ? supabase.from("workout_templates").upsert(templateRows, { onConflict: "id" })
      : Promise.resolve(),
    bwEntries.length > 0
      ? supabase.from("bodyweight_entries").upsert(bwRows, { onConflict: "id" })
      : Promise.resolve(),
    wellnessEntries.length > 0
      ? supabase.from("wellness_entries").upsert(wellnessRows, { onConflict: "id" })
      : Promise.resolve(),
  ]);

  localStorage.setItem(MIGRATED_KEY, "true");
}
