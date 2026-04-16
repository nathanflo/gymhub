"use client";

import { forwardRef } from "react";
import { formatVolumeKg } from "@/lib/units";
import { WorkoutSession } from "@/types/session";

interface SummaryPosterProps {
  session: WorkoutSession;
  isYoga: boolean;
  isRun: boolean;
  headline: string;
  prExercises: string[];
  totalSets: number;
  totalVolume: number;
  exerciseCount: number;
  dateLabel: string;
  workoutDuration: string | null;
  city: string | null;
  effort: { label: string; bgColor: string; color: string };
  yogaStyleLabel?: string;
  shareMode?: boolean;
}

const SummaryPoster = forwardRef<HTMLDivElement, SummaryPosterProps>(
  (
    {
      session,
      isYoga,
      isRun,
      headline,
      prExercises,
      totalSets,
      totalVolume,
      exerciseCount,
      dateLabel,
      workoutDuration,
      city,
      effort,
      yogaStyleLabel,
      shareMode,
    },
    ref
  ) => {
    // ── Yoga content ──────────────────────────────────────────────────────────
    if (isYoga) {
      const inner = (
        <div
          className="flex flex-col items-center w-full"
          style={shareMode ? { maxWidth: 320 } : undefined}
        >
          <p className="text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase mb-8">FloForm</p>
          <h1 className="text-5xl font-black text-indigo-900 text-center">Yoga</h1>
          <p className="text-lg font-medium text-indigo-700 text-center mt-1">
            {yogaStyleLabel}{session.yogaDurationMinutes ? ` · ${session.yogaDurationMinutes} min` : ""}
          </p>
          <p className="text-sm italic text-stone-500 text-center mt-3">{headline}</p>
          {session.yogaIntention && <p className="text-sm text-indigo-500 mt-2">{session.yogaIntention}</p>}
          {session.yogaSource && <p className="text-xs text-stone-400 mt-1">{session.yogaSource}</p>}
          <p className="text-xs text-stone-400 mt-3">{dateLabel}</p>
          {city && <p className="text-xs text-stone-400 mt-0.5">{city}</p>}
          {(session.yogaMobilityRating || session.yogaFlexibilityRating || session.yogaClarityRating) && (
            <div className="flex gap-5 mt-6">
              {[
                { label: "Mobility", value: session.yogaMobilityRating },
                { label: "Flexibility", value: session.yogaFlexibilityRating },
                { label: "Clarity", value: session.yogaClarityRating },
              ]
                .filter((r) => r.value !== undefined)
                .map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-indigo-900">{value}/5</span>
                    <span className="text-xs text-stone-400">{label}</span>
                  </div>
                ))}
            </div>
          )}
          <p className="text-xs text-stone-400 text-center mt-8">floform.fit</p>
        </div>
      );

      if (shareMode) {
        return (
          <div
            ref={ref}
            style={{
              width: 360,
              height: 640,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f4",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            {inner}
          </div>
        );
      }

      return (
        <div ref={ref} className="flex flex-col items-center gap-0 w-full max-w-sm mb-20">
          {inner}
        </div>
      );
    }

    // ── Strength / Run content ────────────────────────────────────────────────
    const inner = (
      <div
        className="flex flex-col items-center w-full py-10"
        style={shareMode ? { maxWidth: 320 } : undefined}
      >
        <p className="text-indigo-400/60 text-xs font-bold tracking-[0.2em] uppercase mb-6">FloForm</p>
        <h1 className="text-5xl font-black text-white text-center">{session.title}</h1>
        {!isRun && prExercises.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-3xl font-black text-white">
              {prExercises.length} PR{prExercises.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              new record{prExercises.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
        {!isRun && prExercises.length === 0 && totalVolume > 0 && (
          <div className="mt-4 text-center">
            <p className="text-2xl font-bold text-neutral-300">{formatVolumeKg(totalVolume)} kg</p>
            <p className="text-xs text-neutral-600 mt-0.5">total volume</p>
          </div>
        )}
        <p className="text-sm italic text-neutral-500 text-center mt-3">{headline}</p>
        <p className="text-xs text-neutral-500 mt-2">
          {dateLabel}{workoutDuration ? ` · ${workoutDuration}` : ""}
        </p>
        {city && <p className="text-xs text-neutral-500 mt-0.5">{city}</p>}
        <div className="flex gap-8 justify-center mt-7 divide-x divide-neutral-800">
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
                  <span className="text-4xl font-bold text-white">{formatVolumeKg(totalVolume)}</span>
                  <span className="text-xs text-neutral-600">kg volume</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-5">
          <span className={`inline-block px-4 py-1.5 rounded-full font-semibold ${effort.bgColor} ${effort.color}`}>
            {effort.label}
          </span>
        </div>
        {!isRun && session.exercises.length > 0 && (
          <div className="flex flex-col items-center gap-1 mt-4">
            {session.exercises.slice(0, 3).map((ex, i) => (
              <p key={i} className="text-sm text-neutral-300">
                {ex.name}{" "}
                <span className="text-neutral-600">({ex.sets.length} sets)</span>
                {prExercises.some(
                  (p) => p.trim().toLowerCase() === ex.name.trim().toLowerCase()
                )
                  ? " 🔥"
                  : ""}
              </p>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-500 text-center mt-10">floform.fit</p>
      </div>
    );

    if (shareMode) {
      return (
        <div
          ref={ref}
          style={{
            width: 360,
            height: 640,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0a0a",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {inner}
        </div>
      );
    }

    return (
      <div ref={ref} className="flex flex-col items-center gap-0 w-full max-w-sm my-auto py-10">
        {inner}
      </div>
    );
  }
);

SummaryPoster.displayName = "SummaryPoster";
export default SummaryPoster;
