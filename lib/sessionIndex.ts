import { WorkoutSession } from "@/types/session";
import { resolveKg, round2 } from "@/lib/units";

export type LastSetEntry   = { weight?: number; reps?: number; duration?: string };
/**
 * TopSetEntry.weight semantics:
 * - kg/lbs exercises: canonical kg (normalized via resolveKg)
 * - plates exercises: raw plates count (no kg conversion possible)
 */
export type TopSetEntry    = { weight: number; reps: number; unit?: string };
export type HistoricalBest = { weight: number; repsAtWeight: number };

export type SessionIndex = {
  sortedSessions:   WorkoutSession[];
  lastSetByName:    Map<string, LastSetEntry>;   // weight = canonical kg for kg/lbs, raw for plates
  lastTopSetByName: Map<string, TopSetEntry>;    // weight = canonical kg for kg/lbs, raw for plates
  runsBySubtype:    Map<string, WorkoutSession[]>; // pre-sorted desc, includes all sessions of that subtype
};

/**
 * Build a lightweight index from a session array.
 * Sorts once; populates all maps in a single pass over the sorted sessions.
 * Safe to call with an already-sorted array — sort is stable and cheap in that case.
 *
 * Weights in lastSetByName and lastTopSetByName are normalized to canonical kg for
 * kg/lbs exercises, so consumers can compare and display without unit arithmetic.
 * Plates exercises keep raw weights (no kg conversion possible).
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
      const exUnit = ex.unit ?? "kg";

      if (!lastSetByName.has(key)) {
        const firstValid = ex.sets.find((s) => {
          if (exMode === "weight_reps")   return s.weight !== undefined && s.reps !== undefined;
          if (exMode === "reps_only")     return s.reps !== undefined;
          if (exMode === "duration_only") return !!s.duration;
          return false;
        });
        if (firstValid) {
          if (exMode === "weight_reps" && firstValid.weight !== undefined && exUnit !== "plates") {
            // Normalize to canonical kg for kg/lbs exercises
            const kg = resolveKg(firstValid.weight, exUnit, ex._canonicalKg);
            lastSetByName.set(key, kg !== null ? { ...firstValid, weight: kg } : firstValid);
          } else {
            lastSetByName.set(key, firstValid); // plates or other modes: keep raw
          }
        }
      }

      if (!lastTopSetByName.has(key) && exMode === "weight_reps") {
        const top = ex.sets.reduce<TopSetEntry | null>((best, s) => {
          if (s.weight === undefined || s.reps === undefined) return best;
          if (s.type === "warmup") return best;
          if (exUnit === "plates") {
            // Plates: keep raw count, no kg conversion
            if (!best || s.weight > best.weight) return { weight: s.weight, reps: s.reps, unit: "plates" };
            return best;
          }
          // kg/lbs: normalize to canonical kg
          const kg = resolveKg(s.weight, exUnit, ex._canonicalKg);
          if (kg === null) return best;
          if (!best || kg > best.weight) return { weight: round2(kg), reps: s.reps, unit: exUnit };
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
  const map = new Map<string, HistoricalBest>();

  for (const s of priorSessions) {
    for (const ex of s.exercises) {
      if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
      if ((ex.unit ?? "kg") === "plates") continue;
      const key = ex.name.trim().toLowerCase();
      for (const set of ex.sets) {
        if (set.type === "warmup") continue;
        if (!set.weight || set.weight <= 0) continue;
        const wKg = round2(resolveKg(set.weight, ex.unit, ex._canonicalKg) ?? -1);
        if (wKg < 0) continue;
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
