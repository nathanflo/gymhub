/**
 * bodyweight.ts – localStorage wrapper for bodyweight entries.
 * Mirrors the pattern in lib/storage.ts for easy future database migration.
 *
 * Future: replace with fetch() calls to an API route.
 */

import { BodyweightEntry } from "@/types/bodyweight";

const BODYWEIGHT_KEY = "gymhub_bodyweight";

/** Read all bodyweight entries, newest first. */
export function getBodyweightEntries(): BodyweightEntry[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(BODYWEIGHT_KEY);
  if (!raw) return [];

  try {
    const entries: BodyweightEntry[] = JSON.parse(raw);
    return entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}

/** Append a new bodyweight entry. */
export function saveBodyweightEntry(entry: BodyweightEntry): void {
  if (typeof window === "undefined") return;

  const existing = getBodyweightEntries();
  const updated = [...existing, entry];
  localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(updated));
}

/** Remove a bodyweight entry by id. */
export function deleteBodyweightEntry(id: string): void {
  if (typeof window === "undefined") return;

  const updated = getBodyweightEntries().filter((e) => e.id !== id);
  localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(updated));
}
