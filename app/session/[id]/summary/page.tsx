"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSessionById } from "@/lib/sessions";
import { WorkoutSession } from "@/types/session";
import { EnergyLevel } from "@/types/workout";

const effortMap: Record<EnergyLevel, { label: string; color: string; bgColor: string }> = {
  Low:    { label: "Light",   color: "text-emerald-400", bgColor: "bg-emerald-950/60" },
  Medium: { label: "Solid",   color: "text-yellow-400",  bgColor: "bg-yellow-950/60"  },
  High:   { label: "All Out", color: "text-red-400",     bgColor: "bg-red-950/60"     },
};

function getVibe(session: WorkoutSession): string {
  const { workoutType, energyLevel, exercises } = session;
  if (workoutType === "Run") {
    if (energyLevel === "High") return "Pushed the pace today";
    if (energyLevel === "Low")  return "Easy miles, still showing up";
    return "Steady run, solid effort";
  }
  if (energyLevel === "High") {
    if (workoutType === "Push") return "Chest and shoulders on fire";
    if (workoutType === "Pull") return "Back day locked in";
    if (workoutType === "Legs") return "Legs destroyed. Worth it.";
    return "Left it all in the gym";
  }
  if (energyLevel === "Low") return "Showed up. That counts.";
  if (exercises.length >= 5) return "Strong, controlled session";
  return "Consistency building";
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
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await getSessionById(id);
      if (!s) {
        router.replace("/workouts");
        return;
      }
      setSession(s);
    }
    load();
  }, [id, router]);

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

  const effort = effortMap[session.energyLevel];
  const vibe = getVibe(session);
  const { dateLabel, timeLabel } = formatDateTime(session.date);

  return (
    <>
      {/* ── Share Overlay ──────────────────────────────────────────────── */}
      {shareOpen && (
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center px-6 overflow-y-auto max-h-screen py-12">
          <button
            onClick={() => setShareOpen(false)}
            className="absolute top-4 right-4 text-neutral-400 hover:text-white text-2xl leading-none"
            aria-label="Close share overlay"
          >
            ×
          </button>

          <div className="flex flex-col items-center gap-0 w-full max-w-sm mb-20">
            {/* Brand */}
            <p className="text-indigo-400/60 text-xs font-bold tracking-[0.2em] uppercase mb-8">
              GymHub
            </p>

            {/* Title */}
            <h1 className="text-5xl font-black text-white text-center">{session.title}</h1>

            {/* Vibe */}
            <p className="text-sm italic text-neutral-500 text-center mt-2">{vibe}</p>

            {/* Date */}
            <p className="text-xs text-neutral-500 mt-3">{dateLabel}</p>

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
                  </p>
                ))}
              </div>
            )}
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
          <p className="text-sm italic text-neutral-500 mt-1">{vibe}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-neutral-600">{dateLabel} · {timeLabel}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-300">
              {session.workoutType}
            </span>
          </div>
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
                  <span className="text-xs text-neutral-600">Volume</span>
                  <span className="text-4xl font-bold text-white">{totalVolume.toLocaleString()} kg</span>
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
