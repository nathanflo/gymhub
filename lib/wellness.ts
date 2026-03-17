import { WellnessEntry } from "@/types/wellness";

const KEY = "gymhub_wellness";

export function getWellnessEntries(): WellnessEntry[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(KEY);
  if (!raw) return [];

  try {
    const entries: WellnessEntry[] = JSON.parse(raw);
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export function getWellnessForDate(date: string): WellnessEntry | undefined {
  return getWellnessEntries().find((e) => e.date === date);
}

export function saveWellnessEntry(entry: WellnessEntry): void {
  if (typeof window === "undefined") return;

  const all = getWellnessEntries();
  const existing = all.find((e) => e.date === entry.date);
  if (existing) {
    localStorage.setItem(KEY, JSON.stringify(all.map((e) => (e.date === entry.date ? entry : e))));
  } else {
    localStorage.setItem(KEY, JSON.stringify([...all, entry]));
  }
}

export function deleteWellnessEntry(id: string): void {
  if (typeof window === "undefined") return;

  const updated = getWellnessEntries().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
}
