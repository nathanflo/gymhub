/**
 * wellness.ts – Supabase wrapper for wellness entries.
 * Replaces the localStorage implementation from Phase 1–8.
 */

import { WellnessEntry } from "@/types/wellness";
import { supabase } from "./supabase";

function toEntry(row: any): WellnessEntry {
  return {
    id: row.id,
    date: row.date,
    sleep: row.sleep ?? undefined,
    hydration: row.hydration ?? undefined,
    caffeine: row.caffeine ?? undefined,
    mood: row.mood ?? undefined,
    soreness: row.soreness ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function getWellnessEntries(): Promise<WellnessEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wellness_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(toEntry);
}

export async function getWellnessForDate(date: string): Promise<WellnessEntry | undefined> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;

  const { data, error } = await supabase
    .from("wellness_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (error || !data) return undefined;
  return toEntry(data);
}

export async function saveWellnessEntry(entry: WellnessEntry): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("wellness_entries").upsert(
    {
      id: entry.id,
      user_id: user.id,
      date: entry.date,
      sleep: entry.sleep ?? null,
      hydration: entry.hydration ?? null,
      caffeine: entry.caffeine ?? null,
      mood: entry.mood ?? null,
      soreness: entry.soreness ?? null,
      notes: entry.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );
}

export async function deleteWellnessEntry(id: string): Promise<void> {
  await supabase.from("wellness_entries").delete().eq("id", id);
}
