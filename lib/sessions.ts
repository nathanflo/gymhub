/**
 * sessions.ts – localStorage wrapper for WorkoutSession entries.
 * Mirrors lib/storage.ts exactly. Swap to a real DB by replacing these functions.
 */

import { WorkoutSession } from "@/types/session";

const SESSIONS_KEY = "gymhub_sessions";

/** Read all sessions, newest first. */
export function getSessions(): WorkoutSession[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];

  try {
    const sessions: WorkoutSession[] = JSON.parse(raw);
    return sessions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}

/** Append a new session. */
export function saveSession(session: WorkoutSession): void {
  if (typeof window === "undefined") return;

  const existing = getSessions();
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([...existing, session]));
}

/** Remove a session by id. */
export function deleteSession(id: string): void {
  if (typeof window === "undefined") return;

  const updated = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
}

/** Replace an existing session by id (preserves original date). */
export function updateSession(updated: WorkoutSession): void {
  if (typeof window === "undefined") return;

  const all = getSessions().map((s) => (s.id === updated.id ? updated : s));
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
}
