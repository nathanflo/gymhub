/**
 * performance.ts — Data derivation for the Performance screen.
 * Pure functions; no side-effects or API calls.
 */

import { WorkoutSession } from "@/types/session";
import { BodyweightEntry } from "@/types/bodyweight";
import { resolveKg } from "@/lib/units";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthlyGain = {
  name: string;
  isCompound: boolean;
  pctChange: number;
};

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

const COMPOUND_KEYWORDS = ["bench", "squat", "deadlift", "press", "row", "pull"];

function isCompound(name: string): boolean {
  const lower = name.toLowerCase();
  return COMPOUND_KEYWORDS.some((kw) => lower.includes(kw));
}

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

// ─── Monthly gains ────────────────────────────────────────────────────────────

export function deriveMonthlyGains(sessions: WorkoutSession[]): MonthlyGain[] {
  const today = new Date();
  const d30 = isoDateStr(new Date(today.getTime() - 30 * 86400000));
  const d60 = isoDateStr(new Date(today.getTime() - 60 * 86400000));

  const recent = new Map<string, { maxKg: number; displayName: string }>();
  const prior  = new Map<string, { maxKg: number; displayName: string }>();

  for (const session of sessions) {
    const dateKey = session.date.slice(0, 10);
    const isRecent = dateKey >= d30;
    const isPrior  = dateKey >= d60 && dateKey < d30;
    if (!isRecent && !isPrior) continue;

    for (const ex of session.exercises) {
      if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
      if ((ex.unit ?? "kg") === "plates") continue;
      const key = ex.name.trim().toLowerCase();
      let maxKg = 0;
      for (const set of ex.sets) {
        if (set.type === "warmup" || set.weight === undefined) continue;
        const kg = resolveKg(set.weight, ex.unit, ex._canonicalKg);
        if (kg !== null && kg > maxKg) maxKg = kg;
      }
      if (maxKg <= 0) continue;
      const target = isRecent ? recent : prior;
      const entry = target.get(key);
      if (!entry || maxKg > entry.maxKg) target.set(key, { maxKg, displayName: ex.name.trim() });
    }
  }

  const gains: MonthlyGain[] = [];
  for (const [key, rec] of recent) {
    const pri = prior.get(key);
    if (!pri) continue;
    const pct = Math.round(((rec.maxKg - pri.maxKg) / pri.maxKg) * 100);
    if (pct <= 0) continue;
    gains.push({ name: rec.displayName, isCompound: isCompound(rec.displayName), pctChange: pct });
  }
  return gains;
}

// ─── Hero insight ─────────────────────────────────────────────────────────────

export function deriveHeroInsight(
  sessions: WorkoutSession[],
  _bwEntries: BodyweightEntry[],
  strengthSeries: StrengthSeries[],
  monthlyGains: MonthlyGain[]
): InsightData {
  if (sessions.length === 0) {
    return { headline: "start training to see progress", subtext: null };
  }

  function shortName(name: string) {
    return name.split(" ").slice(0, 2).join(" ").toLowerCase();
  }

  // 1. Compound monthly gain ≥ 5%
  const bestCompoundMonthly = monthlyGains
    .filter((g) => g.isCompound && g.pctChange >= 5)
    .sort((a, b) => b.pctChange - a.pctChange)[0] ?? null;
  if (bestCompoundMonthly) {
    return {
      headline: `+${bestCompoundMonthly.pctChange}% ${shortName(bestCompoundMonthly.name)} this month`,
      subtext: "vs last month",
    };
  }

  // 2. Any monthly gain ≥ 5%
  const bestMonthly = monthlyGains
    .filter((g) => g.pctChange >= 5)
    .sort((a, b) => b.pctChange - a.pctChange)[0] ?? null;
  if (bestMonthly) {
    return {
      headline: `+${bestMonthly.pctChange}% ${shortName(bestMonthly.name)} this month`,
      subtext: "vs last month",
    };
  }

  // 3. Compound all-time gain > 0
  const bestCompoundAllTime = strengthSeries
    .filter((s) => isCompound(s.name) && (s.pctChange ?? 0) > 0)
    .sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0))[0] ?? null;
  if (bestCompoundAllTime) {
    return {
      headline: `+${bestCompoundAllTime.pctChange}% ${shortName(bestCompoundAllTime.name)}`,
      subtext: "since you started tracking",
    };
  }

  // 4. Any all-time gain > 0
  const bestAllTime = strengthSeries
    .filter((s) => (s.pctChange ?? 0) > 0)
    .sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0))[0] ?? null;
  if (bestAllTime) {
    return {
      headline: `+${bestAllTime.pctChange}% ${shortName(bestAllTime.name)}`,
      subtext: "since you started tracking",
    };
  }

  // 5. Session count vs prior 30-day window
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

  // 6. This week's count
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

  // 7. Total sessions milestone
  const total = sessions.length;
  if (total >= 50) return { headline: `${total} sessions`, subtext: "and counting" };
  if (total >= 10) return { headline: `${total} sessions logged`, subtext: null };

  return { headline: "building your foundation", subtext: null };
}
