"use client";

/**
 * SessionForm – shared form for logging and editing workout sessions.
 * Used by /log and /edit/[id]. Owns all draft state and mutation handlers.
 *
 * Future additions:
 * - Exercise autocomplete from a personal library
 * - Superset grouping
 * - Rest timer
 * - Muscle group selector
 */

import { useState, useMemo, useEffect } from "react";
import { WorkoutSession, WorkoutExercise, WorkoutSet, TrackingMode, WeightUnit } from "@/types/session";
import { WorkoutType, EnergyLevel } from "@/types/workout";
import { WorkoutTemplate } from "@/types/template";
import { Field, inputClass, selectClass } from "@/components/Field";
import { getExerciseLibrary } from "@/lib/exercises";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Draft types ──────────────────────────────────────────────────────────────
// Numeric fields stored as strings to avoid controlled-input NaN issues.

export interface DraftSet {
  weight: string;
  reps: string;
  duration: string;
}

export interface DraftExercise {
  name: string;
  mode: TrackingMode;
  unit: WeightUnit;
  sets: DraftSet[];
  freeformNote: string;
  note?: string;  // undefined = hidden, "" or string = textarea shown
  completed?: boolean;  // draft-only, not persisted to WorkoutExercise
}

export interface SessionFormState {
  title: string;
  workoutType: WorkoutType;
  energyLevel: EnergyLevel;
  notes: string;
  bodyweight: string;
  exercises: DraftExercise[];
  // Run fields
  distance: string;
  duration: string;
  intervals: string;
  dateTime?: string;
}

// ─── Factories ────────────────────────────────────────────────────────────────

export const emptySet = (): DraftSet => ({ weight: "", reps: "", duration: "" });
export const emptyExercise = (): DraftExercise => ({
  name: "",
  mode: "weight_reps",
  unit: "kg",
  sets: [emptySet()],
  freeformNote: "",
});
export const emptySessionForm = (): SessionFormState => ({
  title: "",
  workoutType: "Push",
  energyLevel: "Medium",
  notes: "",
  bodyweight: "",
  exercises: [emptyExercise()],
  distance: "",
  duration: "",
  intervals: "",
});

// ─── Converters (for edit mode) ───────────────────────────────────────────────

/** Convert a stored WorkoutSession back to a draft form state. */
export function sessionToFormState(s: WorkoutSession): SessionFormState {
  return {
    title: s.title,
    workoutType: s.workoutType,
    energyLevel: s.energyLevel,
    notes: s.notes,
    bodyweight: s.bodyweight !== undefined ? String(s.bodyweight) : "",
    exercises:
      s.workoutType === "Run" || !s.exercises.length
        ? [emptyExercise()]
        : s.exercises.map((ex) => ({
            name: ex.name,
            mode: ex.mode ?? "weight_reps",
            unit: ex.unit ?? "kg",
            freeformNote: ex.freeformNote ?? "",
            sets: ex.sets.map((set) => ({
              weight: set.weight !== undefined ? String(set.weight) : "",
              reps: set.reps !== undefined ? String(set.reps) : "",
              duration: set.duration ?? "",
            })),
          })),
    distance: s.distance !== undefined ? String(s.distance) : "",
    duration: s.duration ?? "",
    intervals: s.intervals ?? "",
    dateTime: toDateTimeLocal(s.date),
  };
}

/** Convert a stored WorkoutTemplate to a draft form state for a new session. */
export function templateToFormState(t: WorkoutTemplate): SessionFormState {
  return {
    title: t.name,
    workoutType: t.workoutType,
    energyLevel: "Medium",
    notes: "",
    bodyweight: "",
    exercises:
      t.workoutType === "Run" || !t.exercises.length
        ? [emptyExercise()]
        : t.exercises.map((ex) => ({
            name: ex.name,
            mode: ex.mode ?? "weight_reps",
            unit: ex.unit ?? "kg",
            freeformNote: ex.freeformNote ?? "",
            sets: ex.sets.map((set) => ({
              weight: set.weight !== undefined ? String(set.weight) : "",
              reps: set.reps !== undefined ? String(set.reps) : "",
              duration: set.duration ?? "",
            })),
          })),
    distance: t.distance !== undefined ? String(t.distance) : "",
    duration: t.duration ?? "",
    intervals: t.intervals ?? "",
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKOUT_TYPES: WorkoutType[] = ["Push", "Pull", "Legs", "Run", "Full Body", "Other"];
const ENERGY_LEVELS: EnergyLevel[] = ["Low", "Medium", "High"];

const MODE_LABELS: Record<TrackingMode, string> = {
  weight_reps: "Wt + Reps",
  reps_only: "Reps",
  duration_only: "Time",
  freeform: "Freeform",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionForm({
  initialState,
  initialStartTime,
  initialActiveExIdx,
  submitLabel = "Save Session",
  showDateEdit = false,
  onSave,
  onCancel,
}: {
  initialState?: SessionFormState;
  initialStartTime?: string;  // ISO string from draft resume
  initialActiveExIdx?: number;
  submitLabel?: string;
  showDateEdit?: boolean;
  onSave: (session: WorkoutSession) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SessionFormState>(
    initialState ?? emptySessionForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string | null>(initialStartTime ?? null);
  const [elapsed, setElapsed] = useState(0);
  const [activeExIdx, setActiveExIdx] = useState(initialActiveExIdx ?? 0);
  const [savedPulse, setSavedPulse] = useState(false);

  useEffect(() => {
    getExerciseLibrary().then(setExerciseLibrary);
  }, []);

  // Autosave draft to localStorage once workout has meaningfully started
  useEffect(() => {
    if (!startTime) return;
    const hasData = form.exercises.some(ex => ex.sets.length > 0);
    if (!hasData) return;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify({ version: 1, session: form, startTime, activeExIdx }));
    setSavedPulse(true);
    const t = setTimeout(() => setSavedPulse(false), 2000);
    return () => clearTimeout(t);
  }, [form, startTime]);

  // Live timer
  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const isRun = form.workoutType === "Run";

  // ── Top-level field handler ──────────────────────────────────────────────
  function handleTopLevel(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  // ── Exercise handlers ────────────────────────────────────────────────────
  function handleExerciseName(exIdx: number, value: string) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === exIdx ? { ...ex, name: value } : ex
      ),
    }));
  }

  function handleModeChange(exIdx: number, mode: TrackingMode) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          mode,
          sets: mode === "freeform" ? [] : [emptySet()],
          freeformNote: "",
        };
      }),
    }));
    setError(null);
  }

  function handleUnitChange(exIdx: number, unit: WeightUnit) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === exIdx ? { ...ex, unit } : ex
      ),
    }));
  }

  function handleFreeformNote(exIdx: number, value: string) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === exIdx ? { ...ex, freeformNote: value } : ex
      ),
    }));
  }

  function handleAddExercise() {
    setForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, emptyExercise()],
    }));
  }

  function handleRemoveExercise(exIdx: number) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== exIdx),
    }));
  }

  function handleMoveExercise(exIdx: number, direction: "up" | "down") {
    setForm((prev) => {
      const exs = [...prev.exercises];
      const swapIdx = direction === "up" ? exIdx - 1 : exIdx + 1;
      [exs[exIdx], exs[swapIdx]] = [exs[swapIdx], exs[exIdx]];
      return { ...prev, exercises: exs };
    });
  }

  function handleInsertExerciseBelow(exIdx: number) {
    setForm((prev) => {
      const exs = [...prev.exercises];
      exs.splice(exIdx + 1, 0, emptyExercise());
      return { ...prev, exercises: exs };
    });
  }

  // ── Set handlers ─────────────────────────────────────────────────────────
  function handleSetField(
    exIdx: number,
    setIdx: number,
    field: keyof DraftSet,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) =>
            j === setIdx ? { ...s, [field]: value } : s
          ),
        };
      }),
    }));
  }

  function handleAddSet(exIdx: number) {
    if (!startTime) setStartTime(new Date().toISOString());
    setActiveExIdx(exIdx);
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const newSet = last ? { ...last } : emptySet();
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    }));
  }

  function handleExerciseNote(exIdx: number, value: string) {
    setForm(f => { const exs = [...f.exercises]; exs[exIdx] = { ...exs[exIdx], note: value }; return { ...f, exercises: exs }; });
  }

  function handleOpenNote(exIdx: number) {
    handleExerciseNote(exIdx, "");
  }

  function handleToggleComplete(exIdx: number) {
    const isCompleting = !form.exercises[exIdx].completed;
    setForm(f => {
      const exs = [...f.exercises];
      exs[exIdx] = { ...exs[exIdx], completed: !exs[exIdx].completed };
      return { ...f, exercises: exs };
    });
    if (isCompleting) {
      // Auto-advance to next uncompleted exercise
      const next = form.exercises.findIndex((ex, i) => i > exIdx && !ex.completed);
      if (next !== -1) setActiveExIdx(next);
    } else {
      // Uncompleting — restore focus to this exercise
      setActiveExIdx(exIdx);
    }
  }

  function handleRemoveSet(exIdx: number, setIdx: number) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
      }),
    }));
  }

  // ── Validation + save ────────────────────────────────────────────────────
  function handleSave() {
    if (!form.title.trim()) {
      setError("Please enter a session title.");
      return;
    }

    if (isRun) {
      if (!form.distance || parseFloat(form.distance) <= 0) {
        setError("Please enter a distance.");
        return;
      }
      if (!form.duration.trim()) {
        setError("Please enter a duration.");
        return;
      }
    } else {
      if (form.exercises.length === 0) {
        setError("Add at least one exercise.");
        return;
      }
      for (const ex of form.exercises) {
        if (!ex.name.trim()) {
          setError("All exercises need a name.");
          return;
        }
        const mode = ex.mode;
        if (mode === "freeform") {
          if (!ex.freeformNote.trim()) {
            setError(`"${ex.name}" needs a note for freeform tracking.`);
            return;
          }
        } else {
          if (ex.sets.length === 0) {
            setError(`"${ex.name}" needs at least one set.`);
            return;
          }
          for (const s of ex.sets) {
            if (mode === "weight_reps" && (!s.weight || !s.reps)) {
              setError("All sets need weight and reps.");
              return;
            }
            if (mode === "reps_only" && !s.reps) {
              setError("All sets need reps.");
              return;
            }
            if (mode === "duration_only" && !s.duration.trim()) {
              setError("All sets need a duration.");
              return;
            }
          }
        }
      }
    }

    const exercises: WorkoutExercise[] = isRun
      ? []
      : form.exercises.map((ex) => {
          const mode = ex.mode;
          const buildSet = (s: DraftSet): WorkoutSet => {
            if (mode === "weight_reps") return { weight: parseFloat(s.weight), reps: parseInt(s.reps, 10) };
            if (mode === "reps_only") return { reps: parseInt(s.reps, 10) };
            return { duration: s.duration.trim() };
          };
          return {
            name: ex.name.trim(),
            mode,
            unit: mode === "weight_reps" ? ex.unit : undefined,
            freeformNote: mode === "freeform" ? ex.freeformNote.trim() : undefined,
            sets: mode === "freeform" ? [] : ex.sets.map(buildSet),
            note: ex.note || undefined,
          };
        });

    const session: WorkoutSession = {
      id: crypto.randomUUID(),       // parent overrides for edit mode
      date: form.dateTime ? new Date(form.dateTime).toISOString() : new Date().toISOString(),
      title: form.title.trim(),
      workoutType: form.workoutType,
      energyLevel: form.energyLevel,
      notes: form.notes.trim(),
      exercises,
      bodyweight: form.bodyweight ? parseFloat(form.bodyweight) : undefined,
      ...(isRun && {
        distance: parseFloat(form.distance),
        duration: form.duration.trim(),
        intervals: form.intervals.trim() || undefined,
      }),
    };

    onSave(session);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Active session indicator */}
      {startTime && (
        <div className="flex items-center justify-center gap-2.5 py-2 px-4 rounded-xl bg-indigo-950/50 border border-indigo-500/20 mx-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-indigo-300 tabular-nums">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </span>
          <span className="text-xs text-indigo-500">in progress</span>
          {savedPulse && <span className="text-xs text-neutral-500">· Saved</span>}
        </div>
      )}

      {/* Session title */}
      <Field label="Session Title">
        <input
          name="title"
          type="text"
          placeholder={isRun ? "e.g. Morning Run" : "e.g. Chest / Biceps"}
          value={form.title}
          onChange={handleTopLevel}
          className={inputClass}
        />
      </Field>

      {/* Date & Time (edit page only) */}
      {showDateEdit && (
        <Field label="Date & Time">
          <input
            name="dateTime"
            type="datetime-local"
            value={form.dateTime ?? ""}
            onChange={handleTopLevel}
            className={inputClass}
          />
        </Field>
      )}

      {/* Type + Energy + optional Bodyweight */}
      <div className="flex gap-3">
        <Field label="Type" className="flex-1">
          <select name="workoutType" value={form.workoutType} onChange={handleTopLevel} className={selectClass}>
            {WORKOUT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Energy" className="flex-1">
          <select name="energyLevel" value={form.energyLevel} onChange={handleTopLevel} className={selectClass}>
            {ENERGY_LEVELS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </Field>

        <Field label="BW (kg)" className="w-20 shrink-0">
          <input
            name="bodyweight"
            type="number"
            inputMode="decimal"
            placeholder="—"
            value={form.bodyweight}
            onChange={handleTopLevel}
            className={inputClass}
          />
        </Field>
      </div>

      {/* Conditional fields */}
      {isRun ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Field label="Distance (km)" className="flex-1">
              <input
                name="distance"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 5"
                value={form.distance}
                onChange={handleTopLevel}
                className={inputClass}
              />
            </Field>
            <Field label="Duration" className="flex-1">
              <input
                name="duration"
                type="text"
                placeholder="e.g. 31:45 or 45 min"
                value={form.duration}
                onChange={handleTopLevel}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Intervals (optional)">
            <input
              name="intervals"
              type="text"
              placeholder="e.g. 4 x 400m"
              value={form.intervals}
              onChange={handleTopLevel}
              className={inputClass}
            />
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {form.exercises.map((ex, exIdx) => (
            <div
              key={exIdx}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("input, select, button, textarea")) {
                  setActiveExIdx(exIdx);
                }
              }}
            >
              <ExerciseBlock
                exercise={ex}
                exerciseIdx={exIdx}
                isActive={activeExIdx === exIdx}
                canRemove={form.exercises.length > 1}
                canMoveUp={exIdx > 0}
                canMoveDown={exIdx < form.exercises.length - 1}
                onMoveUp={() => handleMoveExercise(exIdx, "up")}
                onMoveDown={() => handleMoveExercise(exIdx, "down")}
                onInsertBelow={() => handleInsertExerciseBelow(exIdx)}
                onNameChange={(v) => handleExerciseName(exIdx, v)}
                onNameFocus={() => setActiveExIdx(exIdx)}
                onModeChange={(m) => handleModeChange(exIdx, m)}
                onUnitChange={(u) => handleUnitChange(exIdx, u)}
                onFreeformNote={(v) => handleFreeformNote(exIdx, v)}
                onRemoveExercise={() => handleRemoveExercise(exIdx)}
                onSetField={(setIdx, field, v) => handleSetField(exIdx, setIdx, field, v)}
                onAddSet={() => handleAddSet(exIdx)}
                onRemoveSet={(setIdx) => handleRemoveSet(exIdx, setIdx)}
                onNote={(v) => handleExerciseNote(exIdx, v)}
                onOpenNote={() => handleOpenNote(exIdx)}
                onToggleComplete={() => handleToggleComplete(exIdx)}
                exerciseLibrary={exerciseLibrary}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddExercise}
            className="self-start text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Add Exercise
          </button>
        </div>
      )}

      {/* Notes */}
      <Field label="Notes (optional)">
        <textarea
          name="notes"
          placeholder={isRun ? "e.g. Felt good, hilly route" : "e.g. Felt strong today"}
          value={form.notes}
          onChange={handleTopLevel}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </Field>

      {/* Error */}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Actions — lifecycle-aware */}
      {showDateEdit ? (
        // Edit page — always show Cancel + submitLabel
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                       transition-all py-4 text-base font-semibold text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       transition-all py-4 text-base font-semibold text-white shadow-lg"
          >
            {submitLabel}
          </button>
        </div>
      ) : startTime ? (
        // Active workout — Cancel + Finish Workout
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                       transition-all py-4 text-base font-semibold text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-green-600 hover:bg-green-500 active:scale-95
                       transition-all py-4 text-base font-semibold text-white shadow-lg"
          >
            Finish Workout
          </button>
        </div>
      ) : (
        // Pre-start — single full-width Begin button
        <button
          type="button"
          onClick={() => setStartTime(new Date().toISOString())}
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                     transition-all py-5 text-lg font-semibold text-white shadow-lg"
        >
          Begin Workout
        </button>
      )}
    </div>
  );
}

// ─── Exercise block ───────────────────────────────────────────────────────────

function ExerciseBlock({
  exercise,
  exerciseIdx,
  isActive,
  canRemove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  onNameChange,
  onNameFocus,
  onModeChange,
  onUnitChange,
  onFreeformNote,
  onRemoveExercise,
  onSetField,
  onAddSet,
  onRemoveSet,
  onNote,
  onOpenNote,
  onToggleComplete,
  exerciseLibrary,
}: {
  exercise: DraftExercise;
  exerciseIdx: number;
  isActive: boolean;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertBelow: () => void;
  onNameChange: (v: string) => void;
  onNameFocus: () => void;
  onModeChange: (m: TrackingMode) => void;
  onUnitChange: (u: WeightUnit) => void;
  onFreeformNote: (v: string) => void;
  onRemoveExercise: () => void;
  onSetField: (setIdx: number, field: keyof DraftSet, v: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onNote: (v: string) => void;
  onOpenNote: () => void;
  onToggleComplete: () => void;
  exerciseLibrary: string[];
}) {
  const { mode, unit } = exercise;
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const q = exercise.name.trim().toLowerCase();
    if (!q) return [];
    const starts = exerciseLibrary.filter((n) => n.toLowerCase().startsWith(q));
    const contains = exerciseLibrary.filter(
      (n) => !n.toLowerCase().startsWith(q) && n.toLowerCase().includes(q)
    );
    return [...starts, ...contains].slice(0, 6);
  }, [exercise.name, exerciseLibrary]);

  const columnHeaders = () => {
    if (mode === "weight_reps") return <><span className="flex-1 text-xs text-neutral-600">{unit}</span><span className="flex-1 text-xs text-neutral-600">reps</span><span className="w-5" /></>;
    if (mode === "reps_only") return <><span className="flex-1 text-xs text-neutral-600">reps</span><span className="w-5" /></>;
    if (mode === "duration_only") return <><span className="flex-1 text-xs text-neutral-600">duration</span><span className="w-5" /></>;
    return null;
  };

  // Small inline select styling — compact, no full-width padding
  const inlineSelectClass =
    "rounded-lg bg-neutral-700 border border-neutral-600 text-white text-xs " +
    "px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition";

  return (
    <div className={`flex flex-col gap-2 rounded-xl bg-neutral-800/60 border p-3 ${
      exercise.completed
        ? "border-neutral-700/50 opacity-60"
        : isActive
          ? "border-indigo-500/40 ring-1 ring-indigo-500/40"
          : "border-neutral-700"
    }`}>
      {/* Exercise name row */}
      <div className="relative flex gap-2 items-center">
        <input
          type="text"
          placeholder={`Exercise ${exerciseIdx + 1}`}
          value={exercise.name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={() => { setShowSuggestions(true); onNameFocus(); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className={`${inputClass} py-2 text-sm font-medium`}
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemoveExercise}
            className="shrink-0 text-neutral-600 hover:text-red-400 transition-colors text-lg leading-none px-1"
            aria-label="Remove exercise"
          >
            ×
          </button>
        )}

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-8 top-full mt-1 z-10 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl overflow-hidden">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => { onNameChange(name); setShowSuggestions(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600 transition-colors border-b border-neutral-800 last:border-b-0"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reorder / insert strip */}
      <div className="flex gap-3 items-center pl-1">
        {canMoveUp && (
          <button type="button" onClick={onMoveUp}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            ↑ Move up
          </button>
        )}
        {canMoveDown && (
          <button type="button" onClick={onMoveDown}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            ↓ Move down
          </button>
        )}
        <button type="button" onClick={onInsertBelow}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
          + Insert below
        </button>
      </div>

      {/* Mode + unit row */}
      <div className="flex gap-2 items-center pl-1">
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as TrackingMode)}
          className={inlineSelectClass}
        >
          {(Object.keys(MODE_LABELS) as TrackingMode[]).map((m) => (
            <option key={m} value={m}>{MODE_LABELS[m]}</option>
          ))}
        </select>

        {mode === "weight_reps" && (
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value as WeightUnit)}
            className={inlineSelectClass}
          >
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
            <option value="plates">plates</option>
          </select>
        )}
      </div>

      {/* Freeform textarea or set rows */}
      {mode === "freeform" ? (
        <textarea
          placeholder="Describe this exercise (e.g. 3 rounds of 10 push-ups)"
          value={exercise.freeformNote}
          onChange={(e) => onFreeformNote(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none text-sm mt-1`}
        />
      ) : (
        <div className="flex flex-col gap-1.5 pl-1">
          {/* Column headers */}
          <div className="flex gap-2 px-1">
            {columnHeaders()}
          </div>

          {exercise.sets.map((set, setIdx) => (
            <SetRow
              key={setIdx}
              set={set}
              mode={mode}
              canRemove={exercise.sets.length > 1}
              onFieldChange={(field, v) => onSetField(setIdx, field, v)}
              onRemove={() => onRemoveSet(setIdx)}
            />
          ))}

          <button
            type="button"
            onClick={onAddSet}
            className="self-start text-xs text-neutral-500 hover:text-neutral-300 transition-colors mt-0.5 pl-1"
          >
            + Add Set
          </button>
        </div>
      )}

      {/* Bottom actions: Note toggle + Mark done */}
      <div className="flex items-center justify-between mt-1">
        {exercise.note === undefined ? (
          <button
            type="button"
            onClick={onOpenNote}
            className="text-xs text-neutral-600 hover:text-neutral-400 text-left"
          >
            + Note
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onToggleComplete}
          className={`text-xs font-medium transition-colors ${
            exercise.completed ? "text-green-400 hover:text-green-300" : "text-neutral-600 hover:text-neutral-400"
          }`}
        >
          {exercise.completed ? "✓ Done" : "Mark done"}
        </button>
      </div>
      {exercise.note !== undefined && (
        <textarea
          value={exercise.note}
          onChange={e => onNote(e.target.value)}
          placeholder="Note…"
          rows={2}
          className="w-full rounded-lg bg-neutral-700/60 border border-neutral-700 text-sm text-neutral-300 placeholder:text-neutral-600 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
      )}
    </div>
  );
}

// ─── Set row ──────────────────────────────────────────────────────────────────

function SetRow({
  set,
  mode,
  canRemove,
  onFieldChange,
  onRemove,
}: {
  set: DraftSet;
  mode: TrackingMode;
  canRemove: boolean;
  onFieldChange: (field: keyof DraftSet, v: string) => void;
  onRemove: () => void;
}) {
  const setInputClass =
    "flex-1 min-w-0 rounded-lg bg-neutral-700 border border-neutral-600 text-white " +
    "px-2 py-2 text-sm text-center placeholder:text-neutral-500 focus:outline-none " +
    "focus:ring-1 focus:ring-indigo-500 transition";

  const removeBtn = (
    <button
      type="button"
      onClick={onRemove}
      disabled={!canRemove}
      className={`w-5 text-center text-base leading-none transition-colors ${
        canRemove
          ? "text-neutral-600 hover:text-red-400"
          : "text-transparent pointer-events-none"
      }`}
      aria-label="Remove set"
    >
      ×
    </button>
  );

  if (mode === "weight_reps") {
    return (
      <div className="flex gap-2 items-center">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={set.weight}
          onChange={(e) => onFieldChange("weight", e.target.value)}
          className={setInputClass}
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={set.reps}
          onChange={(e) => onFieldChange("reps", e.target.value)}
          className={setInputClass}
        />
        {removeBtn}
      </div>
    );
  }

  if (mode === "reps_only") {
    return (
      <div className="flex gap-2 items-center">
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={set.reps}
          onChange={(e) => onFieldChange("reps", e.target.value)}
          className={setInputClass}
        />
        {removeBtn}
      </div>
    );
  }

  // duration_only
  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="e.g. 5 min or 45s"
        value={set.duration}
        onChange={(e) => onFieldChange("duration", e.target.value)}
        className={setInputClass}
      />
      {removeBtn}
    </div>
  );
}
