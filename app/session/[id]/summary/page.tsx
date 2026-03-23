"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSessionById, getSessions } from "@/lib/sessions";
import { supabase } from "@/lib/supabase";
import { WorkoutSession } from "@/types/session";
import { EnergyLevel } from "@/types/workout";

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

type HistoricalBest = { weight: number; repsAtWeight: number };

function detectPRs(
  session: WorkoutSession,
  allSessions: WorkoutSession[]
): string[] {
  const historicalSessions = allSessions.filter(
    s => s.id !== session.id && s.date < session.date
  );

  // Build a per-exercise baseline from the MOST RECENT session that contains each exercise.
  // historicalSessions is already sorted newest-first (getSessions uses ORDER BY date DESC).
  // Once an exercise is recorded from its most recent session we skip it in older sessions,
  // so the comparison matches what the live form shows: "vs last time you did this".
  const historicalMap = new Map<string, HistoricalBest>();
  const round2 = (n: number) => Math.round(n * 100) / 100;

  for (const s of historicalSessions) {
    for (const ex of s.exercises) {
      if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
      if ((ex.unit ?? "kg") === "plates") continue;
      const toKg = (w: number) => (ex.unit ?? "kg") === "lbs" ? w * 0.453592 : w;
      const key = ex.name.trim().toLowerCase();
      if (historicalMap.has(key)) continue; // most recent session for this exercise already captured
      for (const set of ex.sets) {
        if (!set.weight || set.weight <= 0) continue;
        const wKg = round2(toKg(set.weight));
        const existing = historicalMap.get(key);
        if (!existing || wKg > existing.weight) {
          historicalMap.set(key, { weight: wKg, repsAtWeight: set.reps ?? 0 });
        } else if (existing && wKg === existing.weight && (set.reps ?? 0) > existing.repsAtWeight) {
          existing.repsAtWeight = set.reps ?? 0;
        }
      }
    }
  }

  // Compare current session against historical bests.
  const prs: string[] = [];
  for (const ex of session.exercises) {
    if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
    if ((ex.unit ?? "kg") === "plates") continue;
    const toKg = (w: number) => (ex.unit ?? "kg") === "lbs" ? w * 0.453592 : w;
    const key = ex.name.trim().toLowerCase();

    // Current top: highest weight; among sets at that weight, highest reps.
    let curBest: { weight: number; reps: number } | null = null;
    for (const set of ex.sets) {
      if (!set.weight || set.weight <= 0 || !set.reps || set.reps <= 0) continue;
      const wKg = round2(toKg(set.weight));
      if (!curBest || wKg > curBest.weight || (wKg === curBest.weight && set.reps > curBest.reps)) {
        curBest = { weight: wKg, reps: set.reps };
      }
    }
    if (!curBest) continue;

    const historical = historicalMap.get(key);
    if (historical === undefined) {
      console.log(`[PR check] ${ex.name}: current=${curBest.weight}kg×${curBest.reps}, historical=none, isPR=false`);
      continue; // first-ever log across all sources — not a PR
    }

    const isWeightPR = curBest.weight > historical.weight;
    const isRepPR    = curBest.weight === historical.weight && curBest.reps > historical.repsAtWeight;
    const isPR       = isWeightPR || isRepPR;

    console.log(
      `[PR check] ${ex.name}: current=${curBest.weight}kg×${curBest.reps}, ` +
      `historical=${historical.weight}kg×${historical.repsAtWeight}, ` +
      `isPR=${isPR}${isPR ? ` (${isWeightPR ? "weight" : "reps"})` : ""}`
    );

    if (isPR) prs.push(ex.name.trim());
  }
  return prs;
}

function generateYogaInsight(session: WorkoutSession): string {
  const { yogaIntention, yogaClarityRating, yogaMobilityRating, yogaDurationMinutes } = session;

  if (yogaClarityRating && yogaClarityRating >= 4) return "Left feeling clear and grounded";
  if (yogaIntention === "Recovery") return "Recovery focus, well spent";
  if (yogaIntention === "Relaxation") return "Took time to reset";
  if (yogaIntention === "Energy") return "Moved and felt it";
  if (yogaMobilityRating && yogaMobilityRating >= 4) return "Body opened up nicely today";
  if (yogaDurationMinutes && yogaDurationMinutes <= 20) return "Short session, still showed up";
  return "Nice balance of movement and calm";
}

function generateSubtitle(
  session: WorkoutSession,
  previousSession: WorkoutSession | null,
  prExercises: string[]
): string {
  const { workoutType, exercises } = session;

  // ── Yoga sessions ────────────────────────────────────────────────────────
  if (workoutType === "Yoga") {
    return generateYogaInsight(session);
  }

  // ── Run sessions: keep existing logic ──────────────────────────────────────
  if (workoutType === "Run") {
    const isLong = (session.distance ?? 0) >= 10;
    if (session.energyLevel === "High") return isLong ? "Big aerobic effort" : "Pushed the pace today";
    if (session.energyLevel === "Low")  return "Easy miles, still showing up";
    return "Steady aerobic effort";
  }

  // ── Strength sessions: priority chain ──────────────────────────────────────
  const totalSets = exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const totalVolume = exercises.reduce((s, ex) =>
    s + ex.sets.reduce((s2, set) => s2 + (set.weight ?? 0) * (set.reps ?? 0), 0), 0);
  const prevVolume = previousSession
    ? previousSession.exercises.reduce((s, ex) =>
        s + ex.sets.reduce((s2, set) => s2 + (set.weight ?? 0) * (set.reps ?? 0), 0), 0)
    : 0;
  const ratio = prevVolume > 0 && totalVolume > 0 ? totalVolume / prevVolume : null;

  // 1. PEAK tier — multiple PRs, or single PR + high volume
  const isPeak = prExercises.length >= 2 || (prExercises.length >= 1 && ratio !== null && ratio >= 1.2);
  if (isPeak) {
    if (prExercises.length >= 2) return `${prExercises.length} new PRs — huge session`;
    return "You leveled up today"; // single PR + high volume
  }

  // 2. Single PR
  if (prExercises.length === 1) return `New PR — ${prExercises[0]} 🔥`;

  // 3. Volume tiers vs previous session
  if (ratio !== null) {
    if (ratio >= 1.2)  return "Your strongest session yet";
    if (ratio >= 1.1)  return "Strong session";
    if (ratio <= 0.85) return "Light day";
  }

  // 4. Short session
  if (totalSets <= 6) return "Quick, efficient work";

  // 5. Default
  return "Solid session";
}

function generateDeltaInsight(
  current: WorkoutSession,
  previous: WorkoutSession
): string | null {
  if (current.workoutType === "Yoga") return null;
  const isRun = current.workoutType === "Run";
  const prevLabel = previous.title?.trim()
    ? `your last ${previous.title} session`
    : `your last ${current.workoutType.toLowerCase()} session`;

  if (isRun) {
    const curDist = current.distance ?? 0;
    const prevDist = previous.distance ?? 0;
    if (prevDist > 0) {
      if (curDist > prevDist * 1.1) return "Longer than your last run";
      if (curDist < prevDist * 0.9) return "Shorter than your last run";
    }
    return null;
  }

  // Strength
  const vol = (s: WorkoutSession) =>
    s.exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((a, set) => a + (set.weight ?? 0) * (set.reps ?? 0), 0), 0);
  const sets = (s: WorkoutSession) =>
    s.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  const curVol = vol(current);
  const prevVol = vol(previous);
  const curSets = sets(current);
  const prevSets = sets(previous);

  if (prevVol > 0) {
    if (curVol > prevVol * 1.1) return `Volume up from ${prevLabel}`;
    if (curVol < prevVol * 0.9) return `Lighter than ${prevLabel}`;
  }
  if (curSets >= prevSets + 2) return `More sets than ${prevLabel}`;
  if (curSets <= prevSets - 2) return `Fewer sets than ${prevLabel}`;
  return null;
}

function computeSessionComparison(
  current: WorkoutSession,
  previous: WorkoutSession
): { volumeLine: string | null; exerciseLine: string | null } {
  const vol = (s: WorkoutSession) =>
    s.exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((a, set) => a + (set.weight ?? 0) * (set.reps ?? 0), 0), 0);

  const curVol = vol(current);
  const prevVol = vol(previous);

  let volumeLine: string | null = null;
  if (curVol > 0 && prevVol > 0) {
    const delta = curVol - prevVol;
    if (delta > 0) volumeLine = `Up ${delta.toLocaleString()}kg from last session`;
    else if (delta < 0) volumeLine = `Down ${Math.abs(delta).toLocaleString()}kg from last session`;
    else volumeLine = "Matched last session";
  }

  // Key exercise: highest-volume exercise in current session
  let exerciseLine: string | null = null;
  const topEx = [...current.exercises].sort((a, b) => {
    const v = (ex: typeof a) => ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
    return v(b) - v(a);
  })[0];

  if (topEx && (topEx.mode ?? "weight_reps") === "weight_reps" && (topEx.unit ?? "kg") !== "plates") {
    const prevEx = previous.exercises.find(
      (e) => e.name.trim().toLowerCase() === topEx.name.trim().toLowerCase()
    );
    if (prevEx && (prevEx.mode ?? "weight_reps") === "weight_reps") {
      const topWeight = (ex: typeof topEx) =>
        Math.max(0, ...ex.sets.filter((s) => s.weight !== undefined).map((s) => s.weight!));
      const curTop = topWeight(topEx);
      const prevTop = topWeight(prevEx);
      if (curTop > 0 && prevTop > 0) {
        const dW = curTop - prevTop;
        if (dW !== 0) {
          const unit = topEx.unit ?? "kg";
          const sign = dW > 0 ? "+" : "";
          exerciseLine = `${topEx.name} ${sign}${dW}${unit} top set`;
        }
      }
    }
  }

  return { volumeLine, exerciseLine };
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
  const [shareOpen, setShareOpen] = useState(false);
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const s = await getSessionById(id);
      if (!s) {
        router.replace("/workouts");
        return;
      }
      setSession(s);
      const all = await getSessions();
      setAllSessions(all);
      const prev = all.find(
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
      if (data?.city) setCity(data.city);
    }
    fetchCity();
  }, []);

  if (!session) {
    return (
      <main className="flex flex-col flex-1 px-6 py-8 gap-6">
        <div className="h-8 w-40 rounded-lg bg-neutral-800/60 animate-pulse" />
      </main>
    );
  }

  const isRun = session.workoutType === "Run";
  const isYoga = session.workoutType === "Yoga";
  const yogaStyleLabel = session.yogaStyle === "Custom"
    ? (session.yogaCustomStyle || "Custom")
    : (session.yogaStyle ?? "Yoga");
  const exerciseCount = session.exercises.length;
  const totalSets = session.exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const totalVolume = session.exercises.reduce((s, ex) =>
    s + ex.sets.reduce((s2, set) => s2 + (set.weight ?? 0) * (set.reps ?? 0), 0), 0);

  const effort = getEffortLabel(session.energyLevel, totalSets, totalVolume);
  const prExercises = detectPRs(session, allSessions);
  const headline = generateSubtitle(session, previousSession, prExercises);
  const { dateLabel, timeLabel } = formatDateTime(session.date);
  const workoutDuration = session.started_at && session.ended_at
    ? formatDuration(session.started_at, session.ended_at)
    : null;

  const topExercise = !isRun && totalVolume > 0
    ? [...session.exercises].sort((a, b) => {
        const vol = (ex: typeof a) => ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
        return vol(b) - vol(a);
      })[0]
    : null;
  const summaryInsight = topExercise
    ? `Top volume: ${topExercise.name}`
    : !isRun && exerciseCount > 0
    ? `${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""} completed`
    : null;

  const sessionComparison = !isRun && previousSession
    ? computeSessionComparison(session, previousSession)
    : null;
  // Suppress the vague header deltaInsight when the numeric block is available
  const deltaInsight = sessionComparison && (sessionComparison.volumeLine || sessionComparison.exerciseLine)
    ? null
    : previousSession
    ? generateDeltaInsight(session, previousSession)
    : null;

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

          {isYoga ? (
            <div className="flex flex-col items-center gap-0 w-full max-w-sm mb-20">
              <p className="text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase mb-8">FloForm</p>
              <h1 className="text-5xl font-black text-indigo-900 text-center">Yoga</h1>
              <p className="text-lg font-medium text-indigo-700 text-center mt-1">
                {yogaStyleLabel}{session.yogaDurationMinutes ? ` · ${session.yogaDurationMinutes} min` : ""}
              </p>
              <p className="text-sm italic text-stone-500 text-center mt-3">{headline}</p>
              {session.yogaIntention && (
                <p className="text-sm text-indigo-500 mt-2">{session.yogaIntention}</p>
              )}
              {session.yogaSource && (
                <p className="text-xs text-stone-400 mt-1">{session.yogaSource}</p>
              )}
              <p className="text-xs text-stone-400 mt-3">{dateLabel}</p>
              {city && <p className="text-xs text-stone-400 mt-0.5">{city}</p>}
              {(session.yogaMobilityRating || session.yogaFlexibilityRating || session.yogaClarityRating) && (
                <div className="flex gap-5 mt-6">
                  {[
                    { label: "Mobility",    value: session.yogaMobilityRating },
                    { label: "Flexibility", value: session.yogaFlexibilityRating },
                    { label: "Clarity",     value: session.yogaClarityRating },
                  ].filter(r => r.value !== undefined).map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-indigo-900">{value}/5</span>
                      <span className="text-xs text-stone-400">{label}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-stone-400 text-center mt-8">floform.fit</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0 w-full max-w-sm mb-20">
              {/* Brand */}
              <p className="text-indigo-400/60 text-xs font-bold tracking-[0.2em] uppercase mb-8">
                FloForm
              </p>

              {/* Title */}
              <h1 className="text-5xl font-black text-white text-center">{session.title}</h1>

              {/* Headline */}
              <p className="text-sm italic text-neutral-500 text-center mt-2">{headline}</p>

              {/* Date */}
              <p className="text-xs text-neutral-500 mt-3">
                {dateLabel}{workoutDuration ? ` · ${workoutDuration}` : ""}
              </p>
              {city && <p className="text-xs text-neutral-500 mt-0.5">{city}</p>}

              {/* Stats row */}
              <div className="flex gap-8 justify-center mt-8 divide-x divide-neutral-800">
                {isRun ? (
                  <>
                    {session.distance !== undefined && (
                      <div className="flex flex-col items-center px-4 first:pl-0 last:pr-0">
                        <span className="text-4xl font-bold text-white">{session.distance}</span>
                        <span className="text-xs text-neutral-600">km</span>
                      </div>
                    )}
                    {session.duration && (
                      <div className="flex flex-col items-center px-4 first:pl-0 last:pr-0">
                        <span className="text-4xl font-bold text-white">{session.duration}</span>
                        <span className="text-xs text-neutral-600">duration</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center px-4 first:pl-0 last:pr-0">
                      <span className="text-4xl font-bold text-white">{totalSets}</span>
                      <span className="text-xs text-neutral-600">sets</span>
                    </div>
                    <div className="flex flex-col items-center px-4 first:pl-0 last:pr-0">
                      <span className="text-4xl font-bold text-white">{exerciseCount}</span>
                      <span className="text-xs text-neutral-600">exercises</span>
                    </div>
                    {totalVolume > 0 && (
                      <div className="flex flex-col items-center px-4 first:pl-0 last:pr-0">
                        <span className="text-4xl font-bold text-white">{totalVolume.toLocaleString()}</span>
                        <span className="text-xs text-neutral-600">kg volume</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Energy pill */}
              <div className="mt-6">
                <span className={`inline-block px-4 py-1.5 rounded-full font-semibold ${effort.bgColor} ${effort.color}`}>
                  {effort.label}
                </span>
              </div>

              {/* Exercise preview (top 3) */}
              {!isRun && session.exercises.length > 0 && (
                <div className="flex flex-col items-center gap-1 mt-3">
                  {session.exercises.slice(0, 3).map((ex, i) => (
                    <p key={i} className="text-sm text-neutral-300">
                      {ex.name}{" "}
                      <span className="text-neutral-600">({ex.sets.length} sets)</span>
                      {prExercises.some(p => p.trim().toLowerCase() === ex.name.trim().toLowerCase()) ? " 🔥" : ""}
                    </p>
                  ))}
                </div>
              )}

              {/* Brand watermark */}
              <p className="text-xs text-neutral-500 text-center mt-6">
                floform.fit
              </p>
            </div>
          )}
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

        {/* Header */}
        <div className="border-b border-neutral-800 pb-5">
          <h1 className="text-4xl font-bold text-white">{session.title}</h1>
          <p className="text-sm italic text-neutral-500 mt-1">{headline}</p>
          {deltaInsight && (
            <p className="text-xs text-neutral-500 mt-0.5">{deltaInsight}</p>
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
            </div>
          </div>
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
                  <span className="text-4xl font-semibold tracking-tight tabular-nums text-white">{totalVolume.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
                  <p className="text-sm font-semibold text-white">
                    {ex.name}
                    {prExercises.some(p => p.trim().toLowerCase() === ex.name.trim().toLowerCase()) ? " 🔥" : ""}
                  </p>
                  {mode === "freeform" ? (
                    <p className="text-sm text-neutral-400">{ex.freeformNote}</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {ex.sets.map((set, si) => (
                        <p key={si} className="text-sm text-neutral-400">
                          Set {si + 1}:{" "}
                          {mode === "weight_reps" && set.weight !== undefined && set.reps !== undefined
                            ? `${set.weight} ${ex.unit ?? "kg"} × ${set.reps}`
                            : mode === "reps_only" && set.reps !== undefined
                            ? `${set.reps} reps`
                            : mode === "duration_only" && set.duration
                            ? set.duration
                            : "—"}
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
    </>
  );
}
