/**
 * templates.ts – Supabase wrapper for workout templates.
 * Replaces the localStorage implementation from Phase 1–8.
 */

import { WorkoutTemplate } from "@/types/template";
import { supabase } from "./supabase";

function toTemplate(row: any): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    workoutType: row.workout_type,
    exercises: row.exercises,
    distance: row.distance ?? undefined,
    duration: row.duration ?? undefined,
    intervals: row.intervals ?? undefined,
  };
}

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(toTemplate);
}

export async function saveTemplate(template: WorkoutTemplate): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  await supabase.from("workout_templates").insert({
    id: template.id,
    user_id: user.id,
    name: template.name,
    workout_type: template.workoutType,
    exercises: template.exercises,
    distance: template.distance ?? null,
    duration: template.duration ?? null,
    intervals: template.intervals ?? null,
  });
}

export async function saveTemplateIfNew(
  template: WorkoutTemplate
): Promise<'saved' | 'duplicate'> {
  const existing = await getTemplates();
  const normalize = (name: string) => name.trim().toLowerCase();
  const toKey = (exercises: WorkoutTemplate['exercises']) =>
    exercises.map(e => normalize(e.name)).filter(Boolean).join('|');
  const key = toKey(template.exercises);
  const isDuplicate = existing.some(t => toKey(t.exercises) === key);
  if (isDuplicate) return 'duplicate';
  await saveTemplate(template);
  return 'saved';
}

export async function deleteTemplate(id: string): Promise<void> {
  await supabase.from("workout_templates").delete().eq("id", id);
}
