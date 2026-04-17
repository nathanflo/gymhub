/**
 * performance.ts — Data derivation for the Performance screen.
 * Pure functions; no side-effects or API calls.
 */

import { WorkoutSession } from "@/types/session";
import { BodyweightEntry } from "@/types/bodyweight";
import { resolveKg } from "@/lib/units";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StrengthSeries = {
  name: string;
  /** Data points sorted oldest → newest. */
  points: { date: string; valueKg: number }[];
  /** Percentage change first → last point. null if < 2 points. */
  pctChange: number | null;
};

export type InsightData = {
  headline: string;
  subtext: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date`. */
function weekMonday(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Strength series ──────────────────────────────────────────────────────────

/**
 * Find the top `topN` most-frequently logged weighted exercises and return
 * their per-session max weight over time, sorted oldest-first.
 * Exercises with fewer than 3 appearances are excluded (not enough data to
 * draw a meaningful trend).
 */
export function deriveStrengthSeries(
  sessions: WorkoutSession[],
  topN = 3
): StrengthSeries[] {
  // Count sessions per exercise name (case-insensitive)
  const freq = new Map<string, { count: number; displayName: string }>();

  for (const session of sessions) {
    const seen = new Set<string>();
    for (const ex of session.exercises) {
      const mode = ex.mode ?? "weight_reps";
      if (mode !== "weight_reps") continue;
      if ((ex.unit ?? "kg") === "plates") continue;
      const key = ex.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = freq.get(key);
      if (entry) {
        entry.count++;
      } else {
        freq.set(key, { count: 1, displayName: ex.name.trim() });
      }
    }
  }

  const topKeys = [...freq.entries()]
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN)
    .map(([key, v]) => ({ key, displayName: v.displayName }));

  if (topKeys.length === 0) return [];

  return topKeys
    .map(({ key, displayName }) => {
      // sessions arrive newest-first; build date → maxKg map
      const pointMap = new Map<string, number>();

      for (const session of sessions) {
        const ex = session.exercises.find(
          (e) => e.name.trim().toLowerCase() === key
        );
        if (!ex) continue;

        let maxKg = 0;
        for (const set of ex.sets) {
          if (set.type === "warmup") continue;
          if (set.weight === undefined) continue;
          const kg = resolveKg(set.weight, ex.unit, ex._canonicalKg);
          if (kg !== null && kg > maxKg) maxKg = kg;
        }
        if (maxKg <= 0) continue;

        const dateKey = session.date.slice(0, 10);
        const existing = pointMap.get(dateKey);
        if (existing === undefined || maxKg > existing) pointMap.set(dateKey, maxKg);
      }

      const points = [...pointMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, valueKg]) => ({ date, valueKg }));

      const pctChange =
        points.length >= 2
          ? Math.round(
              ((points[points.length - 1].valueKg - points[0].valueKg) /
                points[0].valueKg) *
                100
            )
          : null;

      return { name: displayName, points, pctChange };
    })
    .filter((s) => s.points.length >= 2);
}

// ─── Hero insight ─────────────────────────────────────────────────────────────

export function deriveHeroInsight(
  sessions: WorkoutSession[],
  _bwEntries: BodyweightEntry[],
  strengthSeries: StrengthSeries[]
): InsightData {
  if (sessions.length === 0) {
    return { headline: "start training to see progress", subtext: null };
  }

  // 1. Best strength improvement across tracked exercises
  const bestStrength = strengthSeries.reduce<StrengthSeries | null>(
    (best, s) =>
      s.pctChange !== null &&
      s.pctChange > (best?.pctChange ?? -Infinity)
        ? s
        : best,
    null
  );
  if (bestStrength && (bestStrength.pctChange ?? 0) > 0) {
    // Use first two words of exercise name for a concise label
    const shortName = bestStrength.name
      .split(" ")
      .slice(0, 2)
      .join(" ")
      .toLowerCase();
    return {
      headline: `+${bestStrength.pctChange}% ${shortName}`,
      subtext: "since you started tracking",
    };
  }

  // 2. Session count vs prior 30-day window
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 86400000);
  const thirtyStr = isoDateStr(thirtyDaysAgo);
  const sixtyStr = isoDateStr(sixtyDaysAgo);

  const recentCount = sessions.filter((s) => s.date.slice(0, 10) >= thirtyStr).length;
  const priorCount = sessions.filter(
    (s) => s.date.slice(0, 10) >= sixtyStr && s.date.slice(0, 10) < thirtyStr
  ).length;

  if (priorCount > 0 && recentCount > priorCount) {
    const pct = Math.round(((recentCount - priorCount) / priorCount) * 100);
    if (pct >= 20) {
      return { headline: `+${pct}% sessions`, subtext: "vs last month" };
    }
  }

  // 3. This week's count
  const weekStart = isoDateStr(weekMonday(today));
  const thisWeekCount = sessions.filter(
    (s) => s.date.slice(0, 10) >= weekStart
  ).length;

  if (thisWeekCount >= 5) {
    return { headline: `${thisWeekCount} sessions this week`, subtext: "on a roll" };
  }
  if (thisWeekCount >= 3) {
    return { headline: `${thisWeekCount} sessions this week`, subtext: null };
  }

  // 4. Total sessions milestone
  const total = sessions.length;
  if (total >= 50) return { headline: `${total} sessions`, subtext: "and counting" };
  if (total >= 10) return { headline: `${total} sessions logged`, subtext: null };

  return { headline: "building your foundation", subtext: null };
}
