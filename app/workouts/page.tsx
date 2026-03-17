"use client";

/**
 * Workouts page — unified list of sessions and legacy single-exercise entries.
 *
 * Future additions:
 * - Filter / search by title or exercise name
 * - Group by week
 * - Volume chart per exercise
 * - AI insights button ("Show squat trend")
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessions, deleteSession } from "@/lib/sessions";
import { getWorkouts, deleteWorkout } from "@/lib/storage";
import { formatExerciseSummary } from "@/lib/progress";
import { saveTemplate } from "@/lib/templates";
import { WorkoutSession } from "@/types/session";
import { Workout } from "@/types/workout";
import { WorkoutTemplate } from "@/types/template";

type ListItem =
  | { kind: "session"; data: WorkoutSession }
  | { kind: "legacy"; data: Workout };

export default function WorkoutsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    async function load() {
      setSessions(await getSessions());
      setWorkouts(await getWorkouts());
    }
    load();
  }, []);

  const items = useMemo<ListItem[]>(() => {
    const all: ListItem[] = [
      ...sessions.map((s): ListItem => ({ kind: "session", data: s })),
      ...workouts.map((w): ListItem => ({ kind: "legacy", data: w })),
    ];
    return all.sort(
      (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
    );
  }, [sessions, workouts]);

  async function handleDeleteSession(id: string) {
    await deleteSession(id);
    setSessions(await getSessions());
  }

  async function handleDeleteLegacy(id: string) {
    await deleteWorkout(id);
    setWorkouts(await getWorkouts());
  }

  async function handleSaveAsTemplate(session: WorkoutSession) {
    const template: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name: session.title,
      workoutType: session.workoutType,
      exercises: session.exercises,
      ...(session.workoutType === "Run" && {
        distance: session.distance,
        duration: session.duration,
        intervals: session.intervals,
      }),
    };
    await saveTemplate(template);
  }

  const totalCount = sessions.length + workouts.length;

  return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Workouts</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {totalCount === 0
            ? "No workouts logged yet."
            : `${totalCount} entr${totalCount > 1 ? "ies" : "y"} logged`}
        </p>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <p className="text-neutral-500">Start by logging your first session.</p>
          <button
            onClick={() => router.push("/log")}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       transition-all px-8 py-4 text-base font-semibold text-white"
          >
            Log Session
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 pb-8">
        {items.map((item) =>
          item.kind === "session" ? (
            <SessionCard
              key={item.data.id}
              session={item.data}
              onDuplicate={() => router.push(`/log?from=${item.data.id}`)}
              onEdit={() => router.push(`/edit/${item.data.id}`)}
              onDelete={() => handleDeleteSession(item.data.id)}
              onSaveAsTemplate={() => handleSaveAsTemplate(item.data)}
            />
          ) : (
            <LegacyWorkoutCard
              key={item.data.id}
              workout={item.data}
              onEdit={() => router.push(`/edit/${item.data.id}`)}
              onDelete={() => handleDeleteLegacy(item.data.id)}
            />
          )
        )}
      </div>
    </main>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onDuplicate,
  onEdit,
  onDelete,
  onSaveAsTemplate,
}: {
  session: WorkoutSession;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveAsTemplate: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { dateLabel, timeLabel } = formatDateTime(session.date);
  const isRun = session.workoutType === "Run";
  const previewExercises = session.exercises.slice(0, 2);
  const extraCount = session.exercises.length - 2;

  return (
    <div className="rounded-2xl bg-neutral-800 border border-neutral-700 p-4 flex flex-col gap-2">
      {/* Clickable header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-start justify-between gap-2 w-full text-left cursor-pointer select-none active:opacity-80"
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white">{session.title}</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {dateLabel} · {timeLabel}
            {session.bodyweight !== undefined && (
              <span className="ml-2">· BW: {session.bodyweight} kg</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex gap-1.5 flex-wrap justify-end">
            <Badge>{session.workoutType}</Badge>
            <Badge color={energyColor(session.energyLevel)}>{session.energyLevel}</Badge>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Exercise preview (collapsed) */}
      {isRun ? (
        <p className="text-sm text-neutral-400">
          {session.distance !== undefined && `${session.distance} km`}
          {session.distance !== undefined && session.duration && " · "}
          {session.duration}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {previewExercises.map((ex, i) => {
            const mode = ex.mode ?? "weight_reps";
            const summary =
              mode === "freeform"
                ? ex.freeformNote?.trim() || ""
                : ex.sets.length > 0
                ? formatExerciseSummary(ex)
                : "";
            return (
              <p key={i} className="text-sm text-neutral-300">
                <span className="font-medium text-white">{ex.name}</span>
                {summary && (
                  <span className="text-neutral-400"> {mode === "freeform" ? `— ${summary}` : summary}</span>
                )}
              </p>
            );
          })}
          {extraCount > 0 && !isExpanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              className="text-xs text-neutral-500 hover:text-neutral-400 active:opacity-70 transition-colors text-left"
            >
              + {extraCount} more
            </button>
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <>
          {/* Remaining exercises (index 2+) */}
          {!isRun && extraCount > 0 && (
            <div className="border-t border-neutral-700/50 pt-3 flex flex-col gap-1">
              {session.exercises.slice(2).map((ex, i) => {
                const mode = ex.mode ?? "weight_reps";
                const summary =
                  mode === "freeform"
                    ? ex.freeformNote?.trim() || ""
                    : ex.sets.length > 0
                    ? formatExerciseSummary(ex)
                    : "";
                return (
                  <p key={i} className="text-sm text-neutral-300">
                    <span className="font-medium text-white">{ex.name}</span>
                    {summary && (
                      <span className="text-neutral-400"> {mode === "freeform" ? `— ${summary}` : summary}</span>
                    )}
                  </p>
                );
              })}
            </div>
          )}

          {/* Run extra stats when expanded */}
          {isRun && session.intervals && (
            <div className="border-t border-neutral-700/50 pt-3">
              <Stat label="Intervals" value={session.intervals} />
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div className="border-t border-neutral-700/50 pt-3 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Notes</span>
              <p className="text-sm text-neutral-400">{session.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-neutral-700/50 pt-3 flex justify-end gap-5">
            <button onClick={onDuplicate} className="text-sm text-indigo-400 hover:text-indigo-300 active:opacity-70 transition-colors py-1">
              Duplicate
            </button>
            <button onClick={onSaveAsTemplate} className="text-sm text-indigo-400 hover:text-indigo-300 active:opacity-70 transition-colors py-1">
              Template
            </button>
            <button onClick={onEdit} className="text-sm text-indigo-400 hover:text-indigo-300 active:opacity-70 transition-colors py-1">
              Edit
            </button>
            <button onClick={onDelete} className="text-sm text-neutral-500 hover:text-red-400 active:opacity-70 transition-colors py-1">
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Legacy workout card ──────────────────────────────────────────────────────

function LegacyWorkoutCard({
  workout,
  onEdit,
  onDelete,
}: {
  workout: Workout;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { dateLabel, timeLabel } = formatDateTime(workout.date);
  const isRun = workout.workoutType === "Run";

  return (
    <div className="rounded-2xl bg-neutral-800/70 border border-neutral-700/60 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">{workout.exercise}</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{dateLabel} · {timeLabel}</p>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {workout.workoutType && <Badge>{workout.workoutType}</Badge>}
          {workout.energyLevel && (
            <Badge color={energyColor(workout.energyLevel)}>{workout.energyLevel}</Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        {isRun ? (
          <>
            {workout.distance !== undefined && <Stat label="Distance" value={`${workout.distance} km`} />}
            {workout.duration && <Stat label="Duration" value={workout.duration} />}
            {workout.intervals && <Stat label="Intervals" value={workout.intervals} />}
          </>
        ) : (
          <>
            {workout.weight !== undefined && <Stat label="Weight" value={`${workout.weight} kg`} />}
            {workout.sets !== undefined && <Stat label="Sets" value={String(workout.sets)} />}
            {workout.reps !== undefined && <Stat label="Reps" value={String(workout.reps)} />}
            {workout.rpe !== undefined && <Stat label="RPE" value={`${workout.rpe}/10`} />}
          </>
        )}
      </div>

      {/* Notes */}
      {workout.notes && (
        <p className="text-xs text-neutral-500 border-t border-neutral-700 pt-2">
          {workout.notes}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button onClick={onEdit} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Edit
        </button>
        <button onClick={onDelete} className="text-xs text-neutral-600 hover:text-red-400 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function Badge({
  children,
  color = "bg-neutral-700 text-neutral-300",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {children}
    </span>
  );
}

function energyColor(level: string) {
  if (level === "High") return "bg-green-900 text-green-300";
  if (level === "Low") return "bg-red-900 text-red-300";
  return "bg-yellow-900 text-yellow-300";
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    dateLabel: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    timeLabel: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}
