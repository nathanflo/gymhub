import { WorkoutSession } from "@/types/session";

export type LastSetEntry   = { weight?: number; reps?: number; duration?: string };
export type TopSetEntry    = { weight: number; reps: number; unit?: string };
export type HistoricalBest = { weight: number; repsAtWeight: number };

export type SessionIndex = {
  sortedSessions:   WorkoutSession[];
  lastSetByName:    Map<string, LastSetEntry>;
  lastTopSetByName: Map<string, TopSetEntry>;
  runsBySubtype:    Map<string, WorkoutSession[]>; // pre-sorted desc, includes all sessions of that subtype
};

/**
 * Build a lightweight index from a session array.
 * Sorts once; populates all maps in a single pass over the sorted sessions.
 * Safe to call with an already-sorted array — sort is stable and cheap in that case.
 */
export function buildSessionIndex(allSessions: WorkoutSession[]): SessionIndex {
  const sortedSessions = [...allSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const lastSetByName    = new Map<string, LastSetEntry>();
  const lastTopSetByName = new Map<string, TopSetEntry>();
  const runsBySubtype    = new Map<string, WorkoutSession[]>();

  for (const session of sortedSessions) {
    for (const ex of session.exercises) {
      const key    = ex.name.trim().toLowerCase();
      const exMode = ex.mode ?? "weight_reps";

      if (!lastSetByName.has(key)) {
        const firstValid = ex.sets.find((s) => {
          if (exMode === "weight_reps")   return s.weight !== undefined && s.reps !== undefined;
          if (exMode === "reps_only")     return s.reps !== undefined;
          if (exMode === "duration_only") return !!s.duration;
          return false;
        });
        if (firstValid) lastSetByName.set(key, firstValid);
      }

      if (!lastTopSetByName.has(key) && exMode === "weight_reps") {
        const top = ex.sets.reduce<TopSetEntry | null>((best, s) => {
          if (s.weight === undefined || s.reps === undefined) return best;
          if (!best || s.weight > best.weight) return { weight: s.weight, reps: s.reps, unit: ex.unit };
          return best;
        }, null);
        if (top) lastTopSetByName.set(key, top);
      }
    }

    if (session.workoutType === "Run") {
      const subtype = session.runSubtype ?? "custom";
      const arr = runsBySubtype.get(subtype) ?? [];
      arr.push(session);
      runsBySubtype.set(subtype, arr);
    }
  }

  return { sortedSessions, lastSetByName, lastTopSetByName, runsBySubtype };
}

/**
 * Build an all-time best map for weighted exercises from an already-filtered session array.
 * Pass prior-only sessions (excluding the current session) so PR comparisons are correct.
 */
export function buildHistoricalBestMap(
  priorSessions: WorkoutSession[]
): Map<string, HistoricalBest> {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const map = new Map<string, HistoricalBest>();

  for (const s of priorSessions) {
    for (const ex of s.exercises) {
      if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
      if ((ex.unit ?? "kg") === "plates") continue;
      const toKg = (w: number) => (ex.unit ?? "kg") === "lbs" ? w * 0.453592 : w;
      const key = ex.name.trim().toLowerCase();
      for (const set of ex.sets) {
        if (set.type === "warmup") continue;
        if (!set.weight || set.weight <= 0) continue;
        const wKg = round2(toKg(set.weight));
        const existing = map.get(key);
        if (!existing || wKg > existing.weight) {
          map.set(key, { weight: wKg, repsAtWeight: set.reps ?? 0 });
        } else if (wKg === existing.weight && (set.reps ?? 0) > existing.repsAtWeight) {
          existing.repsAtWeight = set.reps ?? 0;
        }
      }
    }
  }

  return map;
}
