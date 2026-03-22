"use client";

/**
 * Edit Session page.
 * Handles three cases:
 *   1. WorkoutSession  — full edit via SessionForm
 *   2. Legacy Workout  — converted to a one-exercise session, saved as new session
 *                        and the old entry is deleted (migration path)
 *   3. Not found       — redirect to /workouts
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSessionById, updateSession, saveSession } from "@/lib/sessions";
import { getWorkoutById, deleteWorkout } from "@/lib/storage";
import { WorkoutSession } from "@/types/session";
import { Workout } from "@/types/workout";
import {
  SessionForm,
  SessionFormState,
  sessionToFormState,
  emptyExercise,
} from "@/components/SessionForm";

type Source = "session" | "legacy" | null;

export default function EditWorkoutPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [source, setSource] = useState<Source>(null);
  const [initialForm, setInitialForm] = useState<SessionFormState | null>(null);
  const [originalDate, setOriginalDate] = useState<string>("");
  const [legacyWorkout, setLegacyWorkout] = useState<Workout | null>(null);
  // originalDate is kept only for the legacy save path

  useEffect(() => {
    async function load() {
      const [session, workout] = await Promise.all([
        getSessionById(id),
        getWorkoutById(id),
      ]);

      if (session) {
        setSource("session");
        setOriginalDate(session.date);
        setInitialForm(sessionToFormState(session));
        return;
      }

      if (workout) {
        setSource("legacy");
        setLegacyWorkout(workout);
        setOriginalDate(workout.date);
        setInitialForm(legacyToFormState(workout));
        return;
      }

      router.replace("/workouts");
    }
    load();
  }, [id, router]);

  async function handleUpdateSession(session: WorkoutSession) {
    await updateSession({ ...session, id });
    router.push(`/session/${id}/summary`);
  }

  async function handleSaveLegacy(session: WorkoutSession) {
    // Migrate: save as new session, delete old workout entry
    const newId = crypto.randomUUID();
    await saveSession({ ...session, id: newId, date: originalDate });
    if (legacyWorkout) await deleteWorkout(legacyWorkout.id);
    router.push(`/session/${newId}/summary`);
  }

  if (!source || !initialForm) return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div className="h-8 w-40 rounded-lg bg-neutral-800/60 animate-pulse" />
    </main>
  );

  return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-indigo-400 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Edit Session</h1>
        {source === "legacy" && (
          <p className="text-xs text-neutral-500 mt-1">
            Saving will convert this to a session entry.
          </p>
        )}
      </div>

      <SessionForm
        initialState={initialForm}
        submitLabel="Save Changes"
        showDateEdit={true}
        onSave={source === "session" ? handleUpdateSession : handleSaveLegacy}
        onCancel={() => router.back()}
      />
    </main>
  );
}

// ─── Legacy conversion ────────────────────────────────────────────────────────

/**
 * Convert a legacy single-exercise Workout into a pre-filled SessionFormState.
 * Lifting entries: one exercise with `sets` copies of the stored weight/reps.
 * Run entries: run fields copied to the form, exercises left empty.
 */
function legacyToFormState(w: Workout): SessionFormState {
  const isRun = w.workoutType === "Run";
  const setCount = w.sets ?? 1;
  const weight = w.weight !== undefined ? String(w.weight) : "";
  const reps = w.reps !== undefined ? String(w.reps) : "";

  return {
    title: isRun ? (w.exercise || w.workoutType) : w.exercise,
    workoutType: w.workoutType ?? "Other",
    energyLevel: w.energyLevel ?? "Medium",
    notes: w.notes ?? "",
    bodyweight: "",
    exercises: isRun
      ? [emptyExercise()]
      : [
          {
            name: w.exercise,
            mode: "weight_reps" as const,
            unit: "kg" as const,
            freeformNote: "",
            sets: Array.from({ length: setCount }, () => ({ weight, reps, duration: "" })),
          },
        ],
    distance: w.distance !== undefined ? String(w.distance) : "",
    duration: w.duration ?? "",
    intervals: w.intervals ?? "",
    yogaStyle: "Flow",
    yogaCustomStyle: "",
    yogaDurationMinutes: "",
    yogaIntention: "",
    yogaSource: "",
    yogaMobilityRating: "",
    yogaFlexibilityRating: "",
    yogaClarityRating: "",
  };
}
