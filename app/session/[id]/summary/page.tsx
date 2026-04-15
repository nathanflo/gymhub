"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toPng } from "html-to-image";
import { getSessionById, getSessions } from "@/lib/sessions";
import { supabase } from "@/lib/supabase";
import { WorkoutSession } from "@/types/session";
import { EnergyLevel, WorkoutType } from "@/types/workout";
import { generateSessionMessages, capitalize } from "@/lib/messaging";
import { buildSessionIndex, buildHistoricalBestMap, HistoricalBest } from "@/lib/sessionIndex";
import { resolveKg, round2, formatVolumeKg, fromKg } from "@/lib/units";
import { parseLocation, formatLocationLabel } from "@/lib/location";
import SummaryPoster from "@/components/share/SummaryPoster";
import { ExerciseInsightSheet } from "@/components/ExerciseInsightSheet";

function getEffortLabel(
  energyLevel: EnergyLevel,
  totalSets: number,
  totalVolume: number
): { label: string; color: string; bgColor: string } {
  const isLarge = totalSets >= 15 || totalVolume >= 3000;
  if (energyLevel === "High") {
    return { label: isLarge ? "Intense" : "All Out", color: "text-red-400", bgColor: "bg-red-950/60" };
  }
  if (energyLevel === "Medium") {
    return { label: isLarge ? "Strong" : "Solid", color: "text-yellow-400", bgColor: "bg-yellow-950/60" };
  }
  return { label: "Steady", color: "text-emerald-400", bgColor: "bg-emerald-950/60" };
}

function detectPRs(
  session: WorkoutSession,
  historicalBest: Map<string, HistoricalBest>
): string[] {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Compare current session against pre-built historical bests.
  const prs: string[] = [];
  for (const ex of session.exercises) {
    if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
    if ((ex.unit ?? "kg") === "plates") continue;
    const key = ex.name.trim().toLowerCase();

    // Current top: highest weight; among sets at that weight, highest reps.
    let curBest: { weight: number; reps: number } | null = null;
    for (const set of ex.sets) {
      if (set.type === "warmup") continue;
      if (!set.weight || set.weight <= 0 || !set.reps || set.reps <= 0) continue;
      const wKg = round2(resolveKg(set.weight, ex.unit, ex._canonicalKg) ?? -1);
      if (wKg < 0) continue;
      if (!curBest || wKg > curBest.weight || (wKg === curBest.weight && set.reps > curBest.reps)) {
        curBest = { weight: wKg, reps: set.reps };
      }
    }
    if (!curBest) continue;

    const historical = historicalBest.get(key);
    if (historical === undefined) continue; // first-ever log — not a PR

    const isWeightPR = curBest.weight > historical.weight;
    const isRepPR    = curBest.weight === historical.weight && curBest.reps > historical.repsAtWeight;

    if (isWeightPR || isRepPR) prs.push(ex.name.trim());
  }
  return prs;
}




/** Format a canonical-kg weight for display in the user's working unit. */
function fmtW(kg: number, unit: "kg" | "lbs"): string {
  if (unit === "lbs") {
    const lbs = fromKg(kg, "lbs")!;
    return `${Math.round(lbs * 10) / 10} lbs`;
  }
  return `${round2(kg)} kg`;
}

function computeSessionComparison(
  current: WorkoutSession,
  previous: WorkoutSession,
  workingUnit: "kg" | "lbs"
): { volumeLine: string | null; exerciseLine: string | null } {
  const volKg = (s: WorkoutSession) =>
    s.exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((a, set) => {
        const kg = resolveKg(set.weight ?? 0, ex.unit, ex._canonicalKg);
        return kg !== null ? a + kg * (set.reps ?? 0) : a;
      }, 0), 0);

  const curVol  = volKg(current);
  const prevVol = volKg(previous);

  let volumeLine: string | null = null;
  if (curVol > 0 && prevVol > 0) {
    const delta = Math.round(curVol - prevVol);
    if (delta > 0) volumeLine = `Up ${delta.toLocaleString()}kg from last session`;
    else if (delta < 0) volumeLine = `Down ${Math.abs(delta).toLocaleString()}kg from last session`;
    else volumeLine = "Matched last session";
  }

  // Key exercise: highest-volume exercise in current session (in kg)
  let exerciseLine: string | null = null;
  const topEx = [...current.exercises].sort((a, b) => {
    const v = (ex: typeof a) => ex.sets.reduce((s, set) => {
      const kg = resolveKg(set.weight ?? 0, ex.unit, ex._canonicalKg);
      return kg !== null ? s + kg * (set.reps ?? 0) : s;
    }, 0);
    return v(b) - v(a);
  })[0];

  if (topEx && (topEx.mode ?? "weight_reps") === "weight_reps" && (topEx.unit ?? "kg") !== "plates") {
    const prevEx = previous.exercises.find(
      (e) => e.name.trim().toLowerCase() === topEx.name.trim().toLowerCase()
    );
    if (prevEx && (prevEx.mode ?? "weight_reps") === "weight_reps") {
      const topWeight = (ex: typeof topEx) =>
        Math.max(0, ...ex.sets.filter((s) => s.weight !== undefined).map((s) => s.weight!));
      const curTop  = topWeight(topEx);
      const prevTop = topWeight(prevEx);
      if (curTop > 0 && prevTop > 0) {
        const curTopKg  = resolveKg(curTop,  topEx.unit,  topEx._canonicalKg);
        const prevTopKg = resolveKg(prevTop, prevEx.unit, prevEx._canonicalKg);
        if (curTopKg !== null && prevTopKg !== null) {
          const dKg = round2(curTopKg - prevTopKg);
          if (dKg !== 0) {
            const sign = dKg > 0 ? "+" : "";
            const dispDelta = fmtW(Math.abs(dKg), workingUnit);
            exerciseLine = `${topEx.name} ${sign}${dispDelta} top set`;
          }
        }
      }
    }
  }

  return { volumeLine, exerciseLine };
}

/**
 * Parse a duration string into total seconds.
 * Supports "m:ss", "mm:ss", "h:mm:ss".
 * Returns null for empty or unparseable input.
 */
function parseDurationToSeconds(str: string | undefined): number | null {
  if (!str) return null;
  const parts = str.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** Format total seconds to "m:ss" or "h:mm:ss". */
function formatTotalSeconds(total: number): string {
  if (total >= 3600) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type RunInsights = {
  prevSameSubtype: WorkoutSession | null;
  comparisonLines: string[];
  personalBests: { label: string; value: string }[];
};

function computeRunInsights(
  session: WorkoutSession,
  allSessions: WorkoutSession[],
  priorSameSubtype: WorkoutSession[],
  allSameSubtype: WorkoutSession[]
): RunInsights {
  const subtype = session.runSubtype ?? "custom";

  const prev = priorSameSubtype[0] ?? null;
  const comparisonLines: string[] = [];

  if (prev) {
    let generatedLine = false;

    if (session.distance !== undefined && prev.distance !== undefined) {
      const delta = Math.round((session.distance - prev.distance) * 100) / 100;
      if (delta > 0) { comparisonLines.push(`+${delta} km vs previous`); generatedLine = true; }
      else if (delta < 0) { comparisonLines.push(`${delta} km vs previous`); generatedLine = true; }
    }
    if (subtype === "intervals" && session.runIntervalRepeat !== undefined && prev.runIntervalRepeat !== undefined) {
      const delta = session.runIntervalRepeat - prev.runIntervalRepeat;
      if (delta > 0) { comparisonLines.push(`+${delta} interval${delta === 1 ? "" : "s"} vs previous`); generatedLine = true; }
      else if (delta < 0) { comparisonLines.push(`${delta} intervals vs previous`); generatedLine = true; }
    }
    if (subtype === "intervals") {
      const curWorkSecs = parseDurationToSeconds(session.runIntervalWork);
      const prevWorkSecs = parseDurationToSeconds(prev.runIntervalWork);
      if (curWorkSecs !== null && prevWorkSecs !== null &&
          session.runIntervalRepeat !== undefined && prev.runIntervalRepeat !== undefined) {
        const curTotal = curWorkSecs * session.runIntervalRepeat;
        const prevTotal = prevWorkSecs * prev.runIntervalRepeat;
        const delta = curTotal - prevTotal;
        if (delta > 0) { comparisonLines.push(`+${formatTotalSeconds(delta)} work time vs previous`); generatedLine = true; }
      }
    }

    if (!generatedLine) {
      const fallbackLabel: Record<string, string> = {
        easy: "easy run", intervals: "intervals", incline: "incline walk",
        tempo: "tempo", long: "long run", custom: "run",
      };
      comparisonLines.push(`Comparable to your last ${fallbackLabel[subtype] ?? "run"}`);
    }
  }

  const personalBests: { label: string; value: string }[] = [];

  if (subtype === "intervals") {
    const maxRep = Math.max(...allSameSubtype
      .filter(s => s.runIntervalRepeat !== undefined).map(s => s.runIntervalRepeat!));
    if (isFinite(maxRep)) personalBests.push({ label: "Most intervals", value: String(maxRep) });

    const maxWorkTotal = Math.max(...allSameSubtype
      .filter(s => s.runIntervalWork !== undefined && s.runIntervalRepeat !== undefined)
      .map(s => {
        const secs = parseDurationToSeconds(s.runIntervalWork);
        return secs !== null ? secs * s.runIntervalRepeat! : -Infinity;
      }));
    if (isFinite(maxWorkTotal) && maxWorkTotal > 0)
      personalBests.push({ label: "Most work time", value: formatTotalSeconds(maxWorkTotal) });

    const maxWorkInterval = Math.max(...allSameSubtype
      .filter(s => s.runIntervalWork !== undefined)
      .map(s => parseDurationToSeconds(s.runIntervalWork) ?? -Infinity));
    if (isFinite(maxWorkInterval) && maxWorkInterval > 0)
      personalBests.push({ label: "Longest interval", value: formatTotalSeconds(maxWorkInterval) });

    const maxIncline = Math.max(...allSameSubtype
      .filter(s => s.runIncline !== undefined).map(s => s.runIncline!));
    if (isFinite(maxIncline)) personalBests.push({ label: "Best incline", value: `${maxIncline}%` });
  } else if (subtype === "incline") {
    const maxIncline = Math.max(...allSameSubtype
      .filter(s => s.runIncline !== undefined).map(s => s.runIncline!));
    if (isFinite(maxIncline)) personalBests.push({ label: "Best incline", value: `${maxIncline}%` });
    const longestDur = allSameSubtype
      .filter(s => parseDurationToSeconds(s.duration) !== null)
      .reduce<WorkoutSession | null>((best, s) =>
        best === null || parseDurationToSeconds(s.duration)! > parseDurationToSeconds(best.duration)!
          ? s : best, null);
    if (longestDur?.duration) personalBests.push({ label: "Longest duration", value: longestDur.duration });
  } else {
    const maxDist = Math.max(...allSameSubtype
      .filter(s => s.distance !== undefined).map(s => s.distance!));
    if (isFinite(maxDist)) personalBests.push({ label: "Best distance", value: `${maxDist} km` });
    const longestDur = allSameSubtype
      .filter(s => parseDurationToSeconds(s.duration) !== null)
      .reduce<WorkoutSession | null>((best, s) =>
        best === null || parseDurationToSeconds(s.duration)! > parseDurationToSeconds(best.duration)!
          ? s : best, null);
    if (longestDur?.duration) personalBests.push({ label: "Longest duration", value: longestDur.duration });
  }

  return { prevSameSubtype: prev, comparisonLines, personalBests };
}

type RunSuggestion = { title: string; detail?: string } | null;

function computeSuggestedNextRun(
  session: WorkoutSession,
  allSessions: WorkoutSession[],
  priorSameSubtype: WorkoutSession[]
): RunSuggestion {
  const subtype = session.runSubtype ?? "custom";
  const prev = priorSameSubtype[0] ?? null;

  // ── Weekly running momentum (includes current session) ───────────────────
  const sessionDay = new Date(session.date);
  const sessionDayStart = new Date(sessionDay.getFullYear(), sessionDay.getMonth(), sessionDay.getDate());
  const runCountLast7 = allSessions.filter(s => {
    if (s.workoutType !== "Run") return false;
    const d = new Date(s.date);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = (sessionDayStart.getTime() - dStart.getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays < 7;
  }).length;
  const strongRunWeek = runCountLast7 >= 2; // at least one other run this week besides this session
  const lightRunWeek  = runCountLast7 <= 1; // only this session ran this week

  // ── Intervals ────────────────────────────────────────────────────────────
  if (subtype === "intervals") {
    const curWorkSecs = parseDurationToSeconds(session.runIntervalWork);
    const curRep = session.runIntervalRepeat;

    if (prev && curWorkSecs !== null && curRep !== undefined) {
      const prevWorkSecs = parseDurationToSeconds(prev.runIntervalWork);
      const prevRep = prev.runIntervalRepeat;
      if (prevWorkSecs !== null && prevRep !== undefined) {
        const curTotal = curWorkSecs * curRep;
        const prevTotal = prevWorkSecs * prevRep;
        if (curTotal > prevTotal && curRep < 10) {
          if (lightRunWeek) return { title: "This structure is worth repeating" };
          return {
            title: `You could try ${curRep + 1} intervals next time`,
            detail: "You increased total work time today.",
          };
        }
      }
    }

    if (prev && session.runIncline !== undefined && prev.runIncline !== undefined
        && session.runIncline > prev.runIncline) {
      return { title: "You could run this structure again and hold the incline" };
    }

    if (curRep !== undefined && curRep >= 8 && curWorkSecs !== null && curWorkSecs >= 120) {
      return { title: "Another session like this would make sense" };
    }

    if (lightRunWeek) return { title: "This structure is worth repeating" };
    return { title: "You could add one more interval next time" };
  }

  // ── Incline walk ─────────────────────────────────────────────────────────
  if (subtype === "incline") {
    if (prev && strongRunWeek) {
      if (session.runIncline !== undefined && prev.runIncline !== undefined
          && session.runIncline > prev.runIncline) {
        return {
          title: "Hold this duration and try a little more incline next time",
          detail: "You hit a new incline today.",
        };
      }
      const curDurSecs = parseDurationToSeconds(session.duration);
      const prevDurSecs = parseDurationToSeconds(prev.duration);
      if (curDurSecs !== null && prevDurSecs !== null && curDurSecs > prevDurSecs) {
        return { title: "Hold this incline and try going a bit longer next time" };
      }
    }
    return { title: "This incline walk is worth repeating" };
  }

  // ── Tempo ────────────────────────────────────────────────────────────────
  if (subtype === "tempo") {
    if (prev && strongRunWeek && session.distance !== undefined && prev.distance !== undefined
        && session.distance > prev.distance) {
      return { title: "You could stay with this distance before pushing further" };
    }
    return { title: "Hold this duration and refine the effort" };
  }

  // ── Distance-based (easy, long, custom) ──────────────────────────────────
  if (prev && strongRunWeek) {
    if (session.distance !== undefined && prev.distance !== undefined
        && session.distance > prev.distance) {
      return { title: "You could stay with this distance before pushing further" };
    }
    const curDurSecs = parseDurationToSeconds(session.duration);
    const prevDurSecs = parseDurationToSeconds(prev.duration);
    if (curDurSecs !== null && prevDurSecs !== null && curDurSecs > prevDurSecs
        && session.distance === prev.distance) {
      return { title: "You could add a little distance next time" };
    }
  }

  return { title: "This run is worth repeating. Keep the effort steady." };
}

function formatDuration(start: string, end: string): string {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    dateLabel: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    timeLabel: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function SummaryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [previousSession, setPreviousSession] = useState<WorkoutSession | null>(null);
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([]);
  const [workingUnit] = useState<"kg" | "lbs">(() => {
    if (typeof window === "undefined") return "kg";
    return (localStorage.getItem("gymhub-workingUnit") as "kg" | "lbs") ?? "kg";
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [insightExercise, setInsightExercise] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const s = await getSessionById(id);
      if (!s) {
        router.replace("/workouts");
        return;
      }
      setSession(s);
      const all = await getSessions();
      const sorted = [...all].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllSessions(sorted);
      const prev = sorted.find(
        (x) => x.id !== s.id && x.workoutType === s.workoutType && x.date < s.date
      ) ?? null;
      setPreviousSession(prev);
    }
    load();
  }, [id, router]);

  useEffect(() => {
    async function fetchCity() {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const user = authSession?.user ?? null;
      if (!user) return;
      const { data } = await supabase.from("profiles").select("city").eq("id", user.id).maybeSingle();
      if (data?.city) {
        const loc = parseLocation(data.city);
        if (loc.label) setCity(formatLocationLabel(loc.label));
      }
    }
    fetchCity();
  }, []);

  const summaryModel = useMemo(() => {
    if (!session) return null;

    const isRun  = session.workoutType === "Run";
    const isYoga = session.workoutType === "Yoga";
    const yogaStyleLabel = session.yogaStyle === "Custom"
      ? (session.yogaCustomStyle || "Custom")
      : (session.yogaStyle ?? "Yoga");

    const exerciseCount = session.exercises.length;
    const totalSets = session.exercises.reduce((s, ex) => s + ex.sets.length, 0);
    const totalVolume = session.exercises.reduce(
      (s, ex) => s + ex.sets.reduce((s2, set) => {
        const kg = resolveKg(set.weight ?? 0, ex.unit, ex._canonicalKg);
        return kg !== null ? s2 + kg * (set.reps ?? 0) : s2;
      }, 0), 0
    );

    const effort = getEffortLabel(session.energyLevel, totalSets, totalVolume);
    const allPriorSessions = allSessions.filter((s) => s.date < session.date);
    const sessionIndex     = buildSessionIndex(allSessions);
    const historicalBest   = buildHistoricalBestMap(
      sessionIndex.sortedSessions.filter((s) => s.id !== session.id && s.date < session.date)
    );
    const prExercises = detectPRs(session, historicalBest);

    const { title: headlineRaw, subtitle: sessionSubtitle } = generateSessionMessages(
      session, previousSession, allPriorSessions, prExercises.length, prExercises
    );
    const headline = capitalize(headlineRaw);

    const { dateLabel, timeLabel } = formatDateTime(session.date);
    const workoutDuration = session.started_at && session.ended_at
      ? formatDuration(session.started_at, session.ended_at)
      : null;

    const topExercise = !isRun && totalVolume > 0
      ? session.exercises.reduce<typeof session.exercises[0] | null>((best, ex) => {
          const vol = ex.sets.reduce((s, set) => {
            const kg = resolveKg(set.weight ?? 0, ex.unit, ex._canonicalKg);
            return kg !== null ? s + kg * (set.reps ?? 0) : s;
          }, 0);
          if (vol === 0) return best;
          if (!best) return ex;
          const bestVol = best.sets.reduce((s, set) => {
            const kg = resolveKg(set.weight ?? 0, best.unit, best._canonicalKg);
            return kg !== null ? s + kg * (set.reps ?? 0) : s;
          }, 0);
          return vol > bestVol ? ex : best;
        }, null)
      : null;

    const summaryInsight = topExercise
      ? `Top volume: ${topExercise.name}`
      : !isRun && exerciseCount > 0
      ? `${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""} completed`
      : null;

    const sessionComparison = !isRun && previousSession
      ? computeSessionComparison(session, previousSession, workingUnit)
      : null;

    const runSubtypeLabel: Record<string, string> = {
      easy: "easy run", intervals: "intervals", incline: "incline walk",
      tempo: "tempo", long: "long run", custom: "run",
    };
    const subtypeLabel = runSubtypeLabel[session.runSubtype ?? "custom"] ?? "run";

    const subtype = session.runSubtype ?? "custom";
    const allSameSubtype   = isRun ? (sessionIndex.runsBySubtype.get(subtype) ?? []) : [];
    const priorSameSubtype = allSameSubtype.filter(
      (s) => s.id !== session.id && s.date < session.date
    );

    const runInsights = isRun ? computeRunInsights(session, allSessions, priorSameSubtype, allSameSubtype) : null;
    const suggestion  = isRun ? computeSuggestedNextRun(session, allSessions, priorSameSubtype) : null;

    return {
      isRun, isYoga, yogaStyleLabel, exerciseCount, totalSets, totalVolume,
      effort, prExercises, headline, sessionSubtitle, dateLabel, timeLabel,
      workoutDuration, topExercise, summaryInsight, sessionComparison,
      subtypeLabel, runInsights, suggestion,
    };
  }, [session, previousSession, allSessions]);

  if (!session || !summaryModel) {
    return (
      <main className="flex flex-col flex-1 px-6 py-8 gap-6">
        <div className="h-8 w-40 rounded-lg bg-neutral-800/60 animate-pulse" />
      </main>
    );
  }

  const {
    isRun, isYoga, yogaStyleLabel, exerciseCount, totalSets, totalVolume,
    effort, prExercises, headline, sessionSubtitle, dateLabel, timeLabel,
    workoutDuration, topExercise, summaryInsight, sessionComparison,
    subtypeLabel, runInsights, suggestion,
  } = summaryModel;

  async function handleShareImage() {
    if (!posterRef.current) return;
    setIsGenerating(true);
    try {
      const bgColor = isYoga ? "#f5f5f4" : "#0a0a0a";
      const dataUrl = await toPng(posterRef.current, { pixelRatio: 3, backgroundColor: bgColor });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "floform-workout.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: session?.title });
      } else {
        // Fallback: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "floform-workout.png";
        a.click();
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      {/* ── Share Overlay ──────────────────────────────────────────────── */}
      {shareOpen && (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 overflow-y-auto max-h-screen py-12
          ${isYoga ? "bg-stone-100" : "bg-neutral-950"}`}>
          <button
            onClick={() => setShareOpen(false)}
            className={`absolute text-2xl leading-none ${isYoga ? "text-stone-500 hover:text-stone-800" : "text-neutral-400 hover:text-white"}`}
            style={{ top: "calc(env(safe-area-inset-top) + 16px)", right: "20px" }}
            aria-label="Close share overlay"
          >
            ×
          </button>

          {/* Poster preview — captured for export */}
          <SummaryPoster
            ref={posterRef}
            shareMode
            session={session}
            isYoga={isYoga}
            isRun={isRun}
            headline={headline}
            prExercises={prExercises}
            totalSets={totalSets}
            totalVolume={totalVolume}
            exerciseCount={exerciseCount}
            dateLabel={dateLabel}
            workoutDuration={workoutDuration}
            city={city}
            effort={effort}
            yogaStyleLabel={yogaStyleLabel}
          />

          {/* Share Image button */}
          <button
            onClick={handleShareImage}
            disabled={isGenerating}
            className="absolute left-1/2 -translate-x-1/2 px-8 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm active:scale-95 transition-all disabled:opacity-50"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
          >
            {isGenerating ? "Preparing…" : "Share Image"}
          </button>
        </div>
      )}

      {/* ── Normal Page ────────────────────────────────────────────────── */}
      <main className="flex flex-col flex-1 px-6 pt-8 gap-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/workouts")}
            className="text-sm text-indigo-400"
          >
            ← Back to History
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold text-white active:scale-95 transition-all"
          >
            Share
          </button>
        </div>

        {/* PR Highlight Block */}
        {!isYoga && !isRun && prExercises.length > 0 && (
          <div className="rounded-2xl bg-indigo-600/10 border border-indigo-500/30 px-4 py-3 flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-indigo-300">
              new personal records
            </p>
            <p className="text-sm font-semibold text-white">
              {prExercises.length === 1
                ? `${prExercises[0]} reached a new high`
                : `${prExercises.length} lifts reached new highs`}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-neutral-800 pb-5">
          <h1 className="text-4xl font-bold text-white">{session.title}</h1>
          <p className="text-sm italic text-neutral-500 mt-1">{headline}</p>
          {sessionSubtitle && (
            <p className="text-xs text-neutral-500 mt-0.5">{sessionSubtitle}</p>
          )}
          {summaryInsight && (
            <p className="text-xs text-neutral-500 mt-0.5">{summaryInsight}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-neutral-600">
              {dateLabel} · {timeLabel}{workoutDuration ? ` · ${workoutDuration}` : ""}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-300">
              {session.workoutType}
            </span>
          </div>
          {city && <p className="text-xs text-neutral-600 mt-0.5">{city}</p>}
        </div>

        {/* Key Stats */}
        {isYoga ? (
          <div className="rounded-2xl bg-indigo-950/40 border border-indigo-900/40 px-5 py-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-indigo-400/60">Style</span>
                <span className="text-2xl font-bold text-indigo-100">{yogaStyleLabel}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-indigo-400/60">Duration</span>
                <span className="text-2xl font-bold text-indigo-100">
                  {session.yogaDurationMinutes ? `${session.yogaDurationMinutes} min` : "—"}
                </span>
              </div>
              {session.yogaIntention && (
                <div className="flex flex-col">
                  <span className="text-xs text-indigo-400/60">Intention</span>
                  <span className="text-lg font-medium text-indigo-300">{session.yogaIntention}</span>
                </div>
              )}
              {session.yogaSource && (
                <div className="flex flex-col">
                  <span className="text-xs text-indigo-400/60">Source</span>
                  <span className="text-sm text-indigo-300/70">{session.yogaSource}</span>
                </div>
              )}
            </div>
          </div>
        ) : isRun ? (
          <>
          <div className="rounded-2xl bg-neutral-800 px-5 py-5">
            <div className="grid grid-cols-2 gap-4">
              {session.distance !== undefined && (
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-600">Distance</span>
                  <span className="text-4xl font-bold text-white">{session.distance} km</span>
                </div>
              )}
              {session.duration && (
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-600">Duration</span>
                  <span className="text-4xl font-bold text-white">{session.duration}</span>
                </div>
              )}
              {session.intervals && (
                <div className="flex flex-col col-span-2">
                  <span className="text-xs text-neutral-600">Intervals</span>
                  <span className="text-xl font-semibold text-white">{session.intervals}</span>
                </div>
              )}
            </div>
          </div>

          {/* Run Insights */}
          {runInsights && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-neutral-800/50 border border-indigo-500/10 px-5 py-4 flex flex-col gap-1">
                <span className="text-[11px] text-indigo-300/60 tracking-widest uppercase">
                  Previous {subtypeLabel}
                </span>
                {runInsights.prevSameSubtype ? (
                  <>
                    <p className="text-xl font-semibold tracking-tight text-white">
                      {runInsights.prevSameSubtype.distance !== undefined && runInsights.prevSameSubtype.duration
                        ? `${runInsights.prevSameSubtype.distance} km · ${runInsights.prevSameSubtype.duration}`
                        : runInsights.prevSameSubtype.distance !== undefined
                        ? `${runInsights.prevSameSubtype.distance} km`
                        : runInsights.prevSameSubtype.duration
                        ? runInsights.prevSameSubtype.duration
                        : runInsights.prevSameSubtype.intervals ?? "—"}
                    </p>
                    {runInsights.comparisonLines.map((line, i) => (
                      <p key={i} className="text-sm text-neutral-400">{line}</p>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">First {subtypeLabel} logged</p>
                )}
              </div>

              {runInsights.personalBests.length > 0 && (
                <div className="rounded-2xl bg-neutral-800 border border-indigo-500/10 px-5 py-4 flex flex-col gap-2">
                  <span className="text-[11px] text-indigo-300/60 tracking-widest uppercase">Personal bests</span>
                  <div className="flex gap-6 flex-wrap">
                    {runInsights.personalBests.map(({ label, value }) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-xs text-neutral-500">{label}</span>
                        <span className="text-lg font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested next run */}
          {suggestion && (
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-400/20 px-5 py-4 flex flex-col gap-1.5">
              <span className="text-[11px] text-indigo-300/70 tracking-widest uppercase">
                Suggested next run
              </span>
              <p className="text-base font-semibold text-white">{suggestion.title}</p>
              {suggestion.detail && (
                <p className="text-sm text-neutral-400">{suggestion.detail}</p>
              )}
            </div>
          )}
          </>
        ) : (
          <div className="rounded-2xl bg-neutral-800 px-5 py-5">
            <div className={`grid gap-4 ${totalVolume > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-600">Exercises</span>
                <span className="text-4xl font-bold text-white">{exerciseCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-600">Sets</span>
                <span className="text-4xl font-bold text-white">{totalSets}</span>
              </div>
              {totalVolume > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-600">Volume (kg)</span>
                  <span className="text-4xl font-semibold tracking-tight tabular-nums text-white">{formatVolumeKg(totalVolume)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session Insight */}

        {/* Energy Card */}
        <div className="rounded-2xl bg-neutral-800 px-5 py-4">
          <span className={`inline-block text-xl font-bold px-4 py-1.5 rounded-full ${effort.bgColor} ${effort.color}`}>
            {effort.label}
          </span>
          <p className="text-xs text-neutral-500 mt-0.5">Energy: {session.energyLevel}</p>
          {sessionComparison && (sessionComparison.volumeLine || sessionComparison.exerciseLine) && (
            <div className="mt-2 flex flex-col gap-1">
              {sessionComparison.volumeLine && (
                <p className="text-sm text-neutral-300">{sessionComparison.volumeLine}</p>
              )}
              {sessionComparison.exerciseLine && (
                <p className="text-sm text-neutral-300">{sessionComparison.exerciseLine}</p>
              )}
            </div>
          )}
        </div>

        {/* Yoga Reflection */}
        {isYoga && (session.yogaMobilityRating || session.yogaFlexibilityRating || session.yogaClarityRating) && (
          <div className="rounded-2xl bg-indigo-950/40 border border-indigo-900/40 px-5 py-4 flex flex-col gap-3">
            <span className="text-xs font-semibold text-indigo-400/60 uppercase tracking-wider">Reflection</span>
            {[
              { label: "Mobility",    value: session.yogaMobilityRating },
              { label: "Flexibility", value: session.yogaFlexibilityRating },
              { label: "Clarity",     value: session.yogaClarityRating },
            ].filter(r => r.value !== undefined).map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-indigo-300/80">{label}</span>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`w-6 h-6 rounded text-xs flex items-center justify-center
                      ${n <= value! ? "bg-indigo-500 text-white" : "bg-indigo-950/60 text-indigo-800"}`}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exercise Breakdown */}
        {!isRun && !isYoga && session.exercises.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Breakdown
            </h2>
            {session.exercises.map((ex, i) => {
              const mode = ex.mode ?? "weight_reps";
              return (
                <div key={i} className="rounded-2xl bg-neutral-800 px-5 py-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setInsightExercise(ex.name)}
                    className="text-sm font-semibold text-white text-left hover:text-indigo-300 active:opacity-80 transition-colors"
                  >
                    {ex.name}
                    {prExercises.some(p => p.trim().toLowerCase() === ex.name.trim().toLowerCase()) ? " 🔥" : ""}
                  </button>
                  {mode === "freeform" ? (
                    <p className="text-sm text-neutral-400">{ex.freeformNote}</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {ex.sets.map((set, si) => (
                        <p key={si} className="text-sm text-neutral-400">
                          Set {si + 1}:{" "}
                          {mode === "weight_reps" && set.weight !== undefined && set.reps !== undefined
                            ? (() => {
                                if ((ex.unit ?? "kg") === "plates") return `${set.weight} plates × ${set.reps}`;
                                const kg = resolveKg(set.weight, ex.unit, ex._canonicalKg);
                                return kg !== null ? `${fmtW(kg, workingUnit)} × ${set.reps}` : "—";
                              })()
                            : mode === "reps_only" && set.reps !== undefined
                            ? `${set.reps} reps`
                            : mode === "duration_only" && set.duration
                            ? set.duration
                            : "—"}
                          {set.type === "warmup" && <span className="text-xs text-amber-400/70 ml-1">Warm-up</span>}
                          {set.type === "drop" && <span className="text-xs text-blue-400/70 ml-1">Drop</span>}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div className="rounded-2xl bg-neutral-800 px-5 py-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Notes</span>
            <p className="text-sm text-neutral-400">{session.notes}</p>
          </div>
        )}

        {/* Bottom back link */}
        <button
          onClick={() => router.push("/workouts")}
          className="text-sm text-indigo-400 py-2"
        >
          ← Back to History
        </button>


      </main>
      {insightExercise && (
        <ExerciseInsightSheet
          exerciseName={insightExercise}
          onClose={() => setInsightExercise(null)}
        />
      )}
    </>
  );
}
