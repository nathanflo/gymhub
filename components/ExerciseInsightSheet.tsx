"use client";

import { useEffect, useState } from "react";
import { getSessions } from "@/lib/sessions";
import {
  getExerciseInsights,
  topSetOf,
  formatSet,
  shortDate,
  ExerciseInsightsData,
} from "@/lib/exerciseInsights";

export function ExerciseInsightSheet({
  exerciseName,
  onClose,
}: {
  exerciseName: string;
  onClose: () => void;
}) {
  const [insights, setInsights] = useState<ExerciseInsightsData | null>(null);

  useEffect(() => {
    getSessions().then((sessions) => {
      setInsights(getExerciseInsights(exerciseName, sessions));
    });
  }, [exerciseName]);

  const lastTop = insights?.lastSession ? topSetOf(insights.lastSession.sets) : null;
  const prevTop = insights?.previousSession ? topSetOf(insights.previousSession.sets) : null;
  const lastDisplaySets = insights?.lastSession
    ? insights.lastSession.sets.slice(-3)
    : [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-neutral-950/70" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900 border-t border-neutral-800
                   rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[80svh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-neutral-800">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
            Insights
          </p>
          <p className="text-base font-semibold text-white">{exerciseName}</p>
        </div>

        {!insights ? (
          <p className="px-5 py-6 text-sm text-neutral-500">Loading…</p>
        ) : insights.sessions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-500">
            No history found for this exercise.
          </p>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-6">
            {/* Today's reference */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Today's reference
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-neutral-400">Last</span>
                  <span className="text-sm font-semibold text-white">
                    {lastTop ? formatSet(lastTop) : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-neutral-400">Best set</span>
                  <span className="text-sm font-semibold text-white">
                    {insights.bestSet
                      ? `${insights.bestSet.weight}kg × ${insights.bestSet.reps}`
                      : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-neutral-400">Heaviest</span>
                  <span className="text-sm font-semibold text-white">
                    {insights.bestWeight !== null ? `${insights.bestWeight}kg` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Last session */}
            {insights.lastSession && (
              <Section label={`Last — ${shortDate(insights.lastSession.date)}`}>
                {lastDisplaySets.map((set, i) => (
                  <p
                    key={i}
                    className={`text-sm ${set === lastTop ? "text-white font-medium" : "text-neutral-400"}`}
                  >
                    {formatSet(set)}
                  </p>
                ))}
              </Section>
            )}

            {/* Previous — top set only */}
            {insights.previousSession && (
              <Section label={`Previous — ${shortDate(insights.previousSession.date)}`}>
                <p className="text-sm text-neutral-400">
                  {prevTop ? formatSet(prevTop) : "—"}
                </p>
              </Section>
            )}

            {/* History */}
            <Section label="History">
              {insights.sessions.map((snap, i) => {
                const top = topSetOf(snap.sets);
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">{shortDate(snap.date)}</span>
                    <span className="text-sm text-neutral-300">{top ? formatSet(top) : "—"}</span>
                  </div>
                );
              })}
            </Section>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}
