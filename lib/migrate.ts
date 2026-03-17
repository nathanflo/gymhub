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

  if (sessions.length > 0) {
    const rows = sessions.map((s) => ({
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
    await supabase.from("workout_sessions").upsert(rows, { onConflict: "id" });
  }

  if (workouts.length > 0) {
    const rows = workouts.map((w) => ({
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
    await supabase.from("workouts").upsert(rows, { onConflict: "id" });
  }

  if (templates.length > 0) {
    const rows = templates.map((t) => ({
      id: t.id,
      user_id: userId,
      name: t.name,
      workout_type: t.workoutType,
      exercises: t.exercises,
      distance: t.distance ?? null,
      duration: t.duration ?? null,
      intervals: t.intervals ?? null,
    }));
    await supabase.from("workout_templates").upsert(rows, { onConflict: "id" });
  }

  if (bwEntries.length > 0) {
    const rows = bwEntries.map((e) => ({
      id: e.id,
      user_id: userId,
      date: e.date.slice(0, 10),
      weight: e.weight,
    }));
    await supabase.from("bodyweight_entries").upsert(rows, { onConflict: "id" });
  }

  if (wellnessEntries.length > 0) {
    const rows = wellnessEntries.map((e) => ({
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
    await supabase.from("wellness_entries").upsert(rows, { onConflict: "id" });
  }

  localStorage.setItem(MIGRATED_KEY, "true");
}
