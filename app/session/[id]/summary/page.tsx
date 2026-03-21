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

function detectPR(session: WorkoutSession, allSessions: WorkoutSession[]): string | null {
  const historical = allSessions.filter(s => s.id !== session.id && s.date < session.date);

  const historicalMaxes = new Map<string, number>();
  for (const s of historical) {
    for (const ex of s.exercises) {
      if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
      if ((ex.unit ?? "kg") === "plates") continue;
      const toKg = (w: number) => (ex.unit ?? "kg") === "lbs" ? w * 0.453592 : w;
      const key = ex.name.trim().toLowerCase();
      for (const set of ex.sets) {
        if (!set.weight || set.weight <= 0) continue;
        historicalMaxes.set(key, Math.max(historicalMaxes.get(key) ?? 0, toKg(set.weight)));
      }
    }
  }

  for (const ex of session.exercises) {
    if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
    if ((ex.unit ?? "kg") === "plates") continue;
    const toKg = (w: number) => (ex.unit ?? "kg") === "lbs" ? w * 0.453592 : w;
    const key = ex.name.trim().toLowerCase();
    const currentMax = Math.max(0, ...ex.sets.filter(s => s.weight && s.weight > 0).map(s => toKg(s.weight!)));
    if (currentMax <= 0) continue;
    const historicalMax = historicalMaxes.get(key);
    if (historicalMax === undefined) continue; // first-ever log — not a PR
    if (currentMax > historicalMax) return ex.name.trim();
  }

  return null;
}

function generateSubtitle(
  session: WorkoutSession,
  previousSession: WorkoutSession | null,
  prExercise: string | null
): string {
  const { workoutType, exercises } = session;

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

  // 1. PR
  if (prExercise) return `New PR: ${prExercise}`;

  // 2. High volume vs previous session
  if (previousSession) {
    const prevVolume = previousSession.exercises.reduce((s, ex) =>
      s + ex.sets.reduce((s2, set) => s2 + (set.weight ?? 0) * (set.reps ?? 0), 0), 0);
    if (prevVolume > 0 && totalVolume > prevVolume * 1.1) return "High volume session";
  }

  // 3. Short session
  if (totalSets <= 6) return "Quick, efficient work";

  // 4. Default
  return "Solid session";
}

function generateDeltaInsight(
  current: WorkoutSession,
  previous: WorkoutSession
): string | null {
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
  const exerciseCount = session.exercises.length;
  const totalSets = session.exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const totalVolume = session.exercises.reduce((s, ex) =>
    s + ex.sets.reduce((s2, set) => s2 + (set.weight ?? 0) * (set.reps ?? 0), 0), 0);

  const effort = getEffortLabel(session.energyLevel, totalSets, totalVolume);
  const prExercise = detectPR(session, allSessions);
  const headline = generateSubtitle(session, previousSession, prExercise);
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

  const deltaInsight = previousSession
    ? generateDeltaInsight(session, previousSession)
    : null;

  return (
    <>
      {/* ── Share Overlay ──────────────────────────────────────────────── */}
      {shareOpen && (
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center px-6 overflow-y-auto max-h-screen py-12">
          <button
            onClick={() => setShareOpen(false)}
            className="absolute text-neutral-400 hover:text-white text-2xl leading-none"
            style={{ top: "calc(env(safe-area-inset-top) + 16px)", right: "20px" }}
            aria-label="Close share overlay"
          >
            ×
          </button>

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
                    {ex.name.trim().toLowerCase() === prExercise?.trim().toLowerCase() ? " 🔥" : ""}
                  </p>
                ))}
              </div>
            )}

            {/* Brand watermark */}
            <p className="text-xs text-neutral-500 text-center mt-6">
              floform.fit
            </p>
          </div>
        </div>
      )}

      {/* ── Normal Page ────────────────────────────────────────────────── */}
      <main className="flex flex-col flex-1 px-6 py-8 gap-6">
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
        {isRun ? (
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
        </div>

        {/* Exercise Breakdown */}
        {!isRun && session.exercises.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Breakdown
            </h2>
            {session.exercises.map((ex, i) => {
              const mode = ex.mode ?? "weight_reps";
              return (
                <div key={i} className="rounded-2xl bg-neutral-800 px-5 py-4 flex flex-col gap-2">
                  <p className="text-sm font-semibold text-white">{ex.name}</p>
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
