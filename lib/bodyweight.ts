/**
 * bodyweight.ts – Supabase wrapper for bodyweight entries.
 * Replaces the localStorage implementation from Phase 1–8.
 */

import { BodyweightEntry } from "@/types/bodyweight";
import { supabase } from "./supabase";

function toEntry(row: any): BodyweightEntry {
  return {
    id: row.id,
    date: row.date,
    weight: row.weight,
  };
}

/** Read all bodyweight entries, newest first. */
export async function getBodyweightEntries(): Promise<BodyweightEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("bodyweight_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data.map(toEntry);
}

/** Append a new bodyweight entry. */
export async function saveBodyweightEntry(entry: BodyweightEntry): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  await supabase.from("bodyweight_entries").insert({
    id: entry.id,
    user_id: user.id,
    date: entry.date.slice(0, 10),
    weight: entry.weight,
  });
}

/** Return the most recent bodyweight (kg) logged today, or undefined. */
export async function getTodayBodyweight(): Promise<number | undefined> {
  const entries = await getBodyweightEntries();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayEntry = entries.find(e => e.date === today);
  return todayEntry?.weight;
}

/** Remove a bodyweight entry by id. */
export async function deleteBodyweightEntry(id: string): Promise<void> {
  await supabase.from("bodyweight_entries").delete().eq("id", id);
}
