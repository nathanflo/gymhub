"use client";

/**
 * Progress page – bodyweight logging, personal records, and activity timeline.
 *
 * Future additions:
 * - Progress photos section
 * - Body measurements (chest, waist, hips, etc.)
 * - Wellness check-in (mood, sleep, HRV)
 * - AI insights ("Your squat has improved 15% over 8 weeks")
 * - Gym Set DJ playlist history
 */

import { useEffect, useMemo, useState } from "react";
import { getWorkouts } from "@/lib/storage";
import { getSessions } from "@/lib/sessions";
import { getBodyweightEntries, saveBodyweightEntry, deleteBodyweightEntry } from "@/lib/bodyweight";
import { getWellnessEntries } from "@/lib/wellness";
import { getAllPRs, getTimeline } from "@/lib/progress";
import { Workout } from "@/types/workout";
import { WorkoutSession } from "@/types/session";
import { BodyweightEntry } from "@/types/bodyweight";
import { WellnessEntry } from "@/types/wellness";
import { TimelineEntry } from "@/types/timeline";
import { Field, inputClass } from "@/components/Field";

const TIMELINE_LIMIT = 20;

export default function ProgressPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [bwEntries, setBwEntries] = useState<BodyweightEntry[]>([]);
  const [wellnessEntries, setWellnessEntries] = useState<WellnessEntry[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [ws, ss, bw, we] = await Promise.all([
        getWorkouts(),
        getSessions(),
        getBodyweightEntries(),
        getWellnessEntries(),
      ]);
      setWorkouts(ws);
      setSessions(ss);
      setBwEntries(bw);
      setWellnessEntries(we);
    }
    load();
  }, []);

  const prs = useMemo(() => getAllPRs(workouts, sessions), [workouts, sessions]);
  const timeline = useMemo(
    () => getTimeline(workouts, sessions, bwEntries).slice(0, TIMELINE_LIMIT),
    [workouts, sessions, bwEntries]
  );

  async function handleLogWeight() {
    const value = parseFloat(weightInput);
    if (!weightInput || isNaN(value) || value <= 0) {
      setFormError("Please enter a valid weight.");
      return;
    }
    await saveBodyweightEntry({ id: crypto.randomUUID(), date: new Date().toISOString(), weight: value });
    setWeightInput("");
    setFormError(null);
    setBwEntries(await getBodyweightEntries());
  }

  async function handleDeleteBw(id: string) {
    await deleteBodyweightEntry(id);
    setBwEntries(await getBodyweightEntries());
  }

  return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-8 pb-12">
      <h1 className="text-2xl font-bold text-white">Progress</h1>

      {/* ── Log Bodyweight ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Log Bodyweight</SectionHeader>
        <div className="flex gap-3 items-end">
          <Field label="Weight (kg)" className="flex-1">
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 82.5"
              value={weightInput}
              onChange={(e) => { setWeightInput(e.target.value); setFormError(null); }}
              className={inputClass}
            />
          </Field>
          <button
            onClick={handleLogWeight}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       transition-all px-5 py-3 text-sm font-semibold text-white shrink-0"
          >
            Save
          </button>
        </div>
        {formError && <p className="text-sm text-red-400">{formError}</p>}
      </section>

      {/* ── Bodyweight History ───────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Bodyweight History</SectionHeader>
        {bwEntries.length === 0 ? (
          <EmptyNote>No bodyweight entries yet.</EmptyNote>
        ) : (
          <div className="flex flex-col gap-2">
            {bwEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">{entry.weight} kg</span>
                  <span className="text-xs text-neutral-500">{formatDate(entry.date)}</span>
                </div>
                <button
                  onClick={() => handleDeleteBw(entry.id)}
                  className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Wellness ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Recent Wellness</SectionHeader>
        {wellnessEntries.length === 0 ? (
          <EmptyNote>No wellness entries yet.</EmptyNote>
        ) : (
          <div className="flex flex-col gap-2">
            {wellnessEntries.slice(0, 7).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3">
                <span className="text-sm font-medium text-white">{formatWellnessDate(entry.date)}</span>
                <span className="text-xs text-neutral-400 text-right">{wellnessSummary(entry)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Personal Records ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Personal Records</SectionHeader>
        {prs.length === 0 ? (
          <EmptyNote>Log workouts to see your PRs.</EmptyNote>
        ) : (
          <div className="flex flex-col gap-2">
            {prs.map((pr) => (
              <div key={pr.exercise} className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3">
                <span className="text-base font-semibold text-white">{pr.exercise}</span>
                <div className="text-right">
                  <span className="text-base font-semibold text-indigo-400">{pr.weight} kg</span>
                  <p className="text-xs text-neutral-500">{formatDate(pr.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Activity ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Recent Activity</SectionHeader>
        {timeline.length === 0 ? (
          <EmptyNote>No activity yet.</EmptyNote>
        ) : (
          <div className="flex flex-col">
            {timeline.map((entry) => (
              <TimelineRow key={timelineKey(entry)} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ─── Timeline row ─────────────────────────────────────────────────────────────

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "session") {
    const s = entry.data;
    const isRun = s.workoutType === "Run";
    const summary = isRun
      ? `${s.distance ?? "—"} km · ${s.duration ?? "—"}`
      : s.exercises
          .slice(0, 2)
          .map((ex) => ex.name)
          .join(", ") + (s.exercises.length > 2 ? ` +${s.exercises.length - 2}` : "");

    return (
      <div className="flex items-center justify-between py-2.5 border-b border-neutral-800">
        <div className="flex flex-col">
          <span className="text-sm text-white font-medium">{s.title}</span>
          <span className="text-xs text-neutral-500">{formatDate(s.date)}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-neutral-400">{summary}</span>
          <p className="text-xs text-neutral-600">{s.workoutType}</p>
        </div>
      </div>
    );
  }

  if (entry.kind === "workout") {
    const w = entry.data;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-neutral-800">
        <div className="flex flex-col">
          <span className="text-sm text-white font-medium">{w.exercise}</span>
          <span className="text-xs text-neutral-500">{formatDate(w.date)}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-neutral-400">
            {w.workoutType === "Run"
              ? `${w.distance ?? "—"} km · ${w.duration ?? "—"}`
              : `${w.weight ?? "—"}kg · ${w.sets ?? "—"}×${w.reps ?? "—"}`}
          </span>
          <p className="text-xs text-neutral-600">{w.workoutType}</p>
        </div>
      </div>
    );
  }

  // bodyweight
  const bw = entry.data;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-neutral-800">
      <div className="flex flex-col">
        <span className="text-sm text-white font-medium">Bodyweight</span>
        <span className="text-xs text-neutral-500">{formatDate(bw.date)}</span>
      </div>
      <span className="text-xs text-neutral-400">{bw.weight} kg</span>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
      {children}
    </h2>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-600">{children}</p>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWellnessDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function wellnessSummary(entry: WellnessEntry): string {
  const parts: string[] = [];
  if (entry.sleep != null) parts.push(`💤 ${entry.sleep}h`);
  if (entry.hydration != null) parts.push(`💧 ${entry.hydration}L`);
  if (entry.caffeine != null) parts.push(`☕ ${entry.caffeine}`);
  if (entry.mood != null) parts.push(`Mood ${entry.mood}/5`);
  if (entry.soreness != null) parts.push(`Soreness ${entry.soreness}/5`);
  return parts.join(" · ");
}

function timelineKey(entry: TimelineEntry): string {
  return `${entry.kind}-${entry.data.id}`;
}
