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

import { useState, useMemo, useEffect, useRef } from "react";
import { WorkoutSession, WorkoutExercise, WorkoutSet, TrackingMode, WeightUnit } from "@/types/session";
import { WorkoutType, EnergyLevel } from "@/types/workout";
import { WorkoutTemplate } from "@/types/template";
import { Field, inputClass, selectClass } from "@/components/Field";
import { getExerciseLibrary } from "@/lib/exercises";
import { getSessions } from "@/lib/sessions";
import { getExerciseAlternatives } from "@/lib/exerciseAlternatives";
import { ExerciseInsightSheet } from "@/components/ExerciseInsightSheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const compoundKeywords = [
  "bench", "squat", "deadlift", "press", "row",
  "pull up", "chin up", "pulldown", "leg press",
];
const accessoryKeywords = [
  "curl", "extension", "fly", "raise", "pushdown",
  "calf", "leg curl", "leg extension", "lateral raise", "tricep", "bicep",
];
const coreKeywords = [
  "plank", "crunch", "sit up", "core",
  "yoga", "stretch", "stretching", "mobility",
];

function getRestTarget(exerciseName: string): number {
  const name = exerciseName.toLowerCase();
  if (compoundKeywords.some(k => name.includes(k))) return 120;
  if (accessoryKeywords.some(k => name.includes(k))) return 60;
  if (coreKeywords.some(k => name.includes(k))) return 45;
  return 75;
}


// ─── Draft types ──────────────────────────────────────────────────────────────
// Numeric fields stored as strings to avoid controlled-input NaN issues.

export interface DraftSet {
  weight: string;
  reps: string;
  duration: string;
  type?: "warmup" | "drop";
}

export interface DraftExercise {
  name: string;
  mode: TrackingMode;
  unit: WeightUnit;
  sets: DraftSet[];
  freeformNote: string;
  note?: string;    // undefined = hidden, "" or string = textarea shown
  target?: string;  // guidance from recommended templates (e.g. "8–12 reps")
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
  // Structured run fields (V2)
  runSubtype: "easy" | "intervals" | "incline" | "tempo" | "long" | "custom";
  runIntervalWork: string;
  runIntervalRecover: string;
  runIntervalRepeat: string;
  runIncline: string;
  runSpeed: string;
  dateTime?: string;
  // Yoga fields
  yogaStyle: string;
  yogaCustomStyle: string;
  yogaDurationMinutes: string;
  yogaIntention: string;
  yogaSource: string;
  yogaMobilityRating: string;
  yogaFlexibilityRating: string;
  yogaClarityRating: string;
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
  runSubtype: "easy",
  runIntervalWork: "",
  runIntervalRecover: "",
  runIntervalRepeat: "",
  runIncline: "",
  runSpeed: "",
  yogaStyle: "Flow",
  yogaCustomStyle: "",
  yogaDurationMinutes: "",
  yogaIntention: "",
  yogaSource: "",
  yogaMobilityRating: "",
  yogaFlexibilityRating: "",
  yogaClarityRating: "",
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
      s.workoutType === "Run" || s.workoutType === "Yoga" || !s.exercises.length
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
              type: set.type,
            })),
          })),
    distance: s.distance !== undefined ? String(s.distance) : "",
    duration: s.duration ?? "",
    intervals: s.intervals ?? "",
    runSubtype: s.runSubtype ?? "custom",
    runIntervalWork: s.runIntervalWork ?? "",
    runIntervalRecover: s.runIntervalRecover ?? "",
    runIntervalRepeat: s.runIntervalRepeat !== undefined ? String(s.runIntervalRepeat) : "",
    runIncline: s.runIncline !== undefined ? String(s.runIncline) : "",
    runSpeed: s.runSpeed ?? "",
    dateTime: toDateTimeLocal(s.date),
    yogaStyle: s.yogaStyle ?? "Flow",
    yogaCustomStyle: s.yogaCustomStyle ?? "",
    yogaDurationMinutes: s.yogaDurationMinutes !== undefined ? String(s.yogaDurationMinutes) : "",
    yogaIntention: s.yogaIntention ?? "",
    yogaSource: s.yogaSource ?? "",
    yogaMobilityRating: s.yogaMobilityRating !== undefined ? String(s.yogaMobilityRating) : "",
    yogaFlexibilityRating: s.yogaFlexibilityRating !== undefined ? String(s.yogaFlexibilityRating) : "",
    yogaClarityRating: s.yogaClarityRating !== undefined ? String(s.yogaClarityRating) : "",
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
      t.workoutType === "Run" || t.workoutType === "Yoga" || !t.exercises.length
        ? [emptyExercise()]
        : t.exercises.map((ex) => ({
            name: ex.name,
            mode: ex.mode ?? "weight_reps",
            unit: ex.unit ?? "kg",
            freeformNote: ex.freeformNote ?? "",
            target: ex.target,
            sets: ex.sets.map((set) => ({
              weight: set.weight !== undefined ? String(set.weight) : "",
              reps: set.reps !== undefined ? String(set.reps) : "",
              duration: set.duration ?? "",
            })),
          })),
    distance: t.distance !== undefined ? String(t.distance) : "",
    duration: t.duration ?? "",
    intervals: t.intervals ?? "",
    runSubtype: "easy",
    runIntervalWork: "",
    runIntervalRecover: "",
    runIntervalRepeat: "",
    runIncline: "",
    runSpeed: "",
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

// ─── Run helpers ──────────────────────────────────────────────────────────────

function buildRunSummary(form: SessionFormState): string | undefined {
  if (form.runSubtype === "intervals") {
    const base = `${form.runIntervalWork} / ${form.runIntervalRecover} × ${form.runIntervalRepeat}`;
    return form.runIncline ? `${base} · ${form.runIncline}% incline` : base;
  }
  if (form.runSubtype === "incline" && form.runIncline) {
    return `${form.runIncline}% incline`;
  }
  return form.intervals.trim() || undefined;
}

/** Parse "3:00" or "0:45" → total seconds. Returns 0 for invalid input. */
function parseIntervalTime(str: string): number {
  const parts = str.trim().split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  const secs = parseInt(str, 10);
  return isNaN(secs) ? 0 : secs;
}

/** Format seconds → "m:ss" (e.g. 134 → "2:14"). */
function formatIntervalTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKOUT_TYPES: WorkoutType[] = ["Push", "Pull", "Legs", "Arms", "Full Body", "Run", "Yoga", "Other"];
const RUN_SUBTYPE_LABELS = {
  easy: "Easy Run", intervals: "Intervals", incline: "Incline Walk",
  tempo: "Tempo", long: "Long Run", custom: "Custom",
} as const;
const YOGA_STYLES = ["Flow", "Vinyasa", "Power", "Yin", "Stretch", "Custom"] as const;
const YOGA_INTENTIONS = ["Recovery", "Mobility", "Flexibility", "Relaxation", "Energy", "Mindfulness"] as const;
const YOGA_SOURCES = ["Self-guided", "Guided (App/Video)", "Class (Studio)"] as const;
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
  initialIsPaused,
  initialPausedOffset,
  initialPauseStartedAt,
  submitLabel = "Save Session",
  showDateEdit = false,
  fromTemplate = false,
  isRecommended = false,
  onSave,
  onCancel,
}: {
  initialState?: SessionFormState;
  initialStartTime?: string;  // ISO string from draft resume
  initialActiveExIdx?: number;
  initialIsPaused?: boolean;
  initialPausedOffset?: number;
  initialPauseStartedAt?: number | null;
  submitLabel?: string;
  showDateEdit?: boolean;
  fromTemplate?: boolean;
  isRecommended?: boolean;
  onSave: (session: WorkoutSession) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SessionFormState>(
    initialState ?? emptySessionForm()
  );
  const [error, setError] = useState<string | null>(null);
  const [actionsNearView, setActionsNearView] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<string[]>([]);
  const [pastSessions, setPastSessions] = useState<WorkoutSession[]>([]);
  const [startTime, setStartTime] = useState<string | null>(initialStartTime ?? null);
  const [elapsed, setElapsed] = useState(() => {
    if (initialIsPaused && initialStartTime && initialPauseStartedAt != null) {
      return Math.max(0, Math.floor(
        (initialPauseStartedAt - new Date(initialStartTime).getTime()) / 1000
      ) - (initialPausedOffset ?? 0));
    }
    return 0;
  });
  const [activeExIdx, setActiveExIdx] = useState(initialActiveExIdx ?? 0);
  const currentExercise = form.exercises[activeExIdx];
  const restTarget = currentExercise?.name ? getRestTarget(currentExercise.name) : 60;
  const [savedPulse, setSavedPulse] = useState(false);
  const [isPaused, setIsPaused] = useState(initialIsPaused ?? false);
  const [pausedOffset, setPausedOffset] = useState(initialPausedOffset ?? 0);
  const [pauseStartedAt, setPauseStartedAt] = useState<number | null>(initialPauseStartedAt ?? null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [insightExercise, setInsightExercise] = useState<string | null>(null);
  const [liveIntervalActive, setLiveIntervalActive] = useState(false);

  useEffect(() => {
    getExerciseLibrary().then(setExerciseLibrary);
  }, []);

  useEffect(() => {
    getSessions().then(setPastSessions);
  }, []);

  const lastSetByName = useMemo(() => {
    const map = new Map<string, { weight?: number; reps?: number; duration?: string }>();
    for (const session of pastSessions) {
      for (const ex of session.exercises) {
        const key = ex.name.trim().toLowerCase();
        if (map.has(key)) continue;
        const exMode = ex.mode ?? "weight_reps";
        const firstValid = ex.sets.find((s) => {
          if (exMode === "weight_reps") return s.weight !== undefined && s.reps !== undefined;
          if (exMode === "reps_only") return s.reps !== undefined;
          if (exMode === "duration_only") return !!s.duration;
          return false;
        });
        if (firstValid) map.set(key, firstValid);
      }
    }
    return map;
  }, [pastSessions]);

  const lastTopSetByName = useMemo(() => {
    const map = new Map<string, { weight: number; reps: number }>();
    for (const session of pastSessions) {
      for (const ex of session.exercises) {
        const key = ex.name.trim().toLowerCase();
        if (map.has(key)) continue;
        if ((ex.mode ?? "weight_reps") !== "weight_reps") continue;
        const top = ex.sets.reduce<{ weight: number; reps: number } | null>((best, s) => {
          if (s.weight === undefined || s.reps === undefined) return best;
          if (!best || s.weight > best.weight) return s as { weight: number; reps: number };
          return best;
        }, null);
        if (top) map.set(key, top);
      }
    }
    return map;
  }, [pastSessions]);

  // Autosave draft to localStorage as soon as workout has started
  useEffect(() => {
    if (!startTime) return;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify({ version: 1, session: form, startTime, activeExIdx, isPaused, pausedOffset, pauseStartedAt }));
    setSavedPulse(true);
    const t = setTimeout(() => setSavedPulse(false), 2000);
    return () => clearTimeout(t);
  }, [form, startTime, isPaused, pausedOffset, pauseStartedAt]);

  // Live timer
  useEffect(() => {
    if (!startTime || isPaused) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000) - pausedOffset);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, isPaused, pausedOffset]);

  useEffect(() => {
    if (!isPaused || pauseStartedAt === null) {
      setRestElapsed(0);
      return;
    }
    const tick = () =>
      setRestElapsed(Math.floor((Date.now() - pauseStartedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPaused, pauseStartedAt]);

  const isRun = form.workoutType === "Run";
  const isYoga = form.workoutType === "Yoga";

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

  function handleSetType(
    exIdx: number,
    setIdx: number,
    type: "warmup" | "drop" | undefined
  ) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) =>
            j === setIdx ? { ...s, type } : s
          ),
        };
      }),
    }));
  }

  function resetPauseState() {
    setIsPaused(false);
    setPausedOffset(0);
    setPauseStartedAt(null);
  }

  function handlePause() {
    setPauseStartedAt(Date.now());
    setIsPaused(true);
  }

  function handleResume() {
    if (pauseStartedAt !== null) {
      setPausedOffset(prev => prev + Math.floor((Date.now() - pauseStartedAt) / 1000));
    }
    setPauseStartedAt(null);
    setIsPaused(false);
  }

  function handleAddSet(exIdx: number) {
    if (!startTime) {
      setStartTime(new Date().toISOString());
      resetPauseState();
    }
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

    if (isYoga) {
      if (!form.yogaStyle.trim()) { setError("Please select a style."); return; }
      if (form.yogaStyle === "Custom" && !form.yogaCustomStyle.trim()) {
        setError("Please enter your custom style."); return;
      }
      if (!form.yogaDurationMinutes || parseFloat(form.yogaDurationMinutes) <= 0) {
        setError("Please enter a duration."); return;
      }
    } else if (isRun) {
      if (form.runSubtype === "intervals") {
        if (!form.runIntervalWork.trim()) { setError("Please enter a work duration."); return; }
        if (!form.runIntervalRecover.trim()) { setError("Please enter a recovery duration."); return; }
        const rep = parseInt(form.runIntervalRepeat);
        if (!rep || rep < 1) { setError("Please enter a repeat count."); return; }
      } else if (form.runSubtype === "long" || form.runSubtype === "custom") {
        if (!form.distance || parseFloat(form.distance) <= 0) { setError("Please enter a distance."); return; }
        if (!form.duration.trim()) { setError("Please enter a duration."); return; }
      } else {
        // easy, tempo, incline
        if (!form.duration.trim()) { setError("Please enter a duration."); return; }
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

    const exercises: WorkoutExercise[] = isRun || isYoga
      ? []
      : form.exercises.map((ex) => {
          const mode = ex.mode;
          const buildSet = (s: DraftSet): WorkoutSet => {
            const t = s.type ? { type: s.type } : {};
            if (mode === "weight_reps") return { weight: parseFloat(s.weight), reps: parseInt(s.reps, 10), ...t };
            if (mode === "reps_only") return { reps: parseInt(s.reps, 10), ...t };
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
      started_at: startTime ?? undefined,
      ended_at: new Date().toISOString(),
      ...(isRun && {
        distance: form.runSubtype !== "intervals" && form.distance
          ? parseFloat(form.distance) : undefined,
        duration: form.runSubtype !== "intervals"
          ? form.duration.trim() || undefined : undefined,
        intervals: buildRunSummary(form),
        runSubtype: form.runSubtype,
        ...(form.runSubtype === "intervals" ? {
          runIntervalWork: form.runIntervalWork.trim(),
          runIntervalRecover: form.runIntervalRecover.trim(),
          runIntervalRepeat: parseInt(form.runIntervalRepeat),
          runIncline: form.runIncline ? parseFloat(form.runIncline) : undefined,
          runSpeed: form.runSpeed.trim() || undefined,
        } : form.runSubtype === "incline" ? {
          runIncline: form.runIncline ? parseFloat(form.runIncline) : undefined,
          runSpeed: form.runSpeed.trim() || undefined,
        } : form.runSubtype === "tempo" ? {
          runSpeed: form.runSpeed.trim() || undefined,
        } : {}),
      }),
      ...(isYoga && {
        yogaStyle: form.yogaStyle,
        yogaCustomStyle: form.yogaStyle === "Custom" ? form.yogaCustomStyle.trim() || undefined : undefined,
        yogaDurationMinutes: parseFloat(form.yogaDurationMinutes),
        yogaIntention: form.yogaIntention || undefined,
        yogaSource: form.yogaSource || undefined,
        yogaMobilityRating: form.yogaMobilityRating ? parseInt(form.yogaMobilityRating) : undefined,
        yogaFlexibilityRating: form.yogaFlexibilityRating ? parseInt(form.yogaFlexibilityRating) : undefined,
        yogaClarityRating: form.yogaClarityRating ? parseInt(form.yogaClarityRating) : undefined,
      }),
    };

    resetPauseState();
    onSave(session);
  }

  // Raise pill when action buttons are visible so pill doesn't overlap them
  useEffect(() => {
    const check = () => {
      const el = actionsRef.current;
      if (!el) return;
      // Raise pill when action row is within 200px of the viewport bottom
      const rect = el.getBoundingClientRect();
      setActionsNearView(rect.top < window.innerHeight + 200);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("touchmove", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("touchmove", check);
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating timer pill — persists while scrolling */}
      {startTime && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40"
          style={{
            bottom: actionsNearView
              ? 'calc(env(safe-area-inset-bottom) + 160px)'
              : 'calc(env(safe-area-inset-bottom) + 16px)',
            transition: 'bottom 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <button
            type="button"
            onClick={() => isPaused ? handleResume() : handlePause()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-indigo-500/30 backdrop-blur-sm shadow-lg cursor-pointer hover:border-indigo-400/50 transition-colors"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isPaused ? "bg-amber-400/40" : "bg-indigo-400 animate-pulse"
              }`}
            />
            <span className={`text-sm font-semibold tabular-nums ${isPaused ? "text-indigo-300/50" : "text-indigo-300"}`}>
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </span>
            {isPaused && !isYoga && (
              <span className="text-xs text-amber-400/50 tabular-nums">
                · Rest {String(Math.floor(restElapsed / 60)).padStart(2, "0")}:{String(restElapsed % 60).padStart(2, "0")}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Active session indicator */}
        {startTime && (
          <div className="flex items-center justify-center gap-2.5 py-2 px-4 rounded-xl bg-indigo-950/50 border border-indigo-500/20 mx-auto">
            {isPaused ? (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/40 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            )}
            <span className="text-sm font-semibold text-indigo-300 tabular-nums">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </span>
            {isPaused ? (
              <span className="text-xs text-amber-500/80">{isYoga ? "paused" : "resting"}</span>
            ) : (
              <span className="text-xs text-indigo-500">{isYoga ? "Session" : "in progress"}</span>
            )}
            {isPaused && !isYoga && (
              <>
                <span className="text-xs text-amber-400/50 tabular-nums">
                  Rest {String(Math.floor(restElapsed / 60)).padStart(2, "0")}:{String(restElapsed % 60).padStart(2, "0")}
                </span>
                <span className="text-xs text-amber-400/50 tabular-nums">
                  · Target {restTarget}s
                </span>
              </>
            )}
            {!isPaused && savedPulse && <span className="text-xs text-neutral-500">· Saved</span>}
            {isPaused ? (
                  <button
                  type="button"
                  onClick={handleResume}
                  className="ml-1 flex items-center justify-center w-5 h-5 text-indigo-300 hover:text-indigo-200"
                  aria-label="Resume"
                >
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                    <polygon points="2,1 9,5 2,9" />
                  </svg>
                </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="ml-1 flex items-center justify-center w-5 h-5 text-indigo-400 hover:text-indigo-300"
                aria-label="Pause"
              >
                <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
                  <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
                </svg>
              </button>
            )}
          </div>
        )}

      {/* Session title */}
      <Field label="Session Title">
        <input
          name="title"
          type="text"
          placeholder={isYoga ? "e.g. Morning Flow" : isRun ? "e.g. Morning Run" : "e.g. Chest / Biceps"}
          value={form.title}
          onChange={handleTopLevel}
          className={inputClass}
        />
      </Field>

      {/* Recommended session guidance */}
      {isRecommended && (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3">
          <p className="text-sm text-indigo-200">
            Follow the targets — adjust weight so the last reps feel challenging.
          </p>
        </div>
      )}

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
      {isYoga ? (
        <div className="flex flex-col gap-5">
          {/* Style */}
          <Field label="Style">
            <select name="yogaStyle" value={form.yogaStyle} onChange={handleTopLevel} className={selectClass}>
              {YOGA_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {form.yogaStyle === "Custom" && (
            <Field label="Custom style">
              <input name="yogaCustomStyle" type="text" placeholder="e.g. Restorative"
                value={form.yogaCustomStyle} onChange={handleTopLevel} className={inputClass} />
            </Field>
          )}

          {/* Duration */}
          <Field label="Duration (min)">
            <input name="yogaDurationMinutes" type="number" inputMode="numeric" placeholder="e.g. 30"
              value={form.yogaDurationMinutes} onChange={handleTopLevel} className={inputClass} />
          </Field>

          {/* Intention chips */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Intention (optional)
            </span>
            <div className="flex flex-wrap gap-2">
              {YOGA_INTENTIONS.map(intention => (
                <button key={intention} type="button"
                  onClick={() => setForm(f => ({ ...f, yogaIntention: f.yogaIntention === intention ? "" : intention }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                    ${form.yogaIntention === intention
                      ? "bg-indigo-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:text-neutral-300"}`}>
                  {intention}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Source (optional)
            </span>
            <div className="flex flex-wrap gap-2">
              {YOGA_SOURCES.map(source => (
                <button key={source} type="button"
                  onClick={() => setForm(f => ({ ...f, yogaSource: f.yogaSource === source ? "" : source }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                    ${form.yogaSource === source
                      ? "bg-indigo-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:text-neutral-300"}`}>
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Reflection ratings */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Reflection (optional)
            </span>
            {[
              { label: "Mobility",    field: "yogaMobilityRating" as const },
              { label: "Flexibility", field: "yogaFlexibilityRating" as const },
              { label: "Clarity",     field: "yogaClarityRating" as const },
            ].map(({ label, field }) => (
              <div key={field} className="flex items-center justify-between">
                <span className="text-sm text-neutral-400 w-24">{label}</span>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button"
                      onClick={() => setForm(f => ({ ...f, [field]: f[field] === String(n) ? "" : String(n) }))}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                        ${form[field] === String(n)
                          ? "bg-indigo-600 text-white"
                          : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isRun ? (
        <div className="flex flex-col gap-5">
          {/* Run subtype selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Run type</label>
            <div className="flex flex-wrap gap-2">
              {(["easy", "intervals", "incline", "tempo", "long", "custom"] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, runSubtype: sub }))}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    form.runSubtype === sub
                      ? "bg-indigo-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {RUN_SUBTYPE_LABELS[sub]}
                </button>
              ))}
            </div>
          </div>

          {/* Subtype-specific fields */}
          {form.runSubtype === "easy" && (
            <div className="flex gap-3">
              <Field label="Duration" className="flex-1">
                <input name="duration" type="text" placeholder="e.g. 31:45 or 45 min"
                  value={form.duration} onChange={handleTopLevel} className={inputClass} />
              </Field>
              <Field label="Distance (km) — optional" className="flex-1">
                <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 5"
                  value={form.distance} onChange={handleTopLevel} className={inputClass} />
              </Field>
            </div>
          )}

          {form.runSubtype === "intervals" && (
            <div className="flex flex-col gap-4">
              {/* Quick presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-neutral-500 tracking-wide">Quick presets</span>
                <div className="flex gap-2 flex-wrap">
                  <button type="button"
                    onClick={() => setForm((f) => ({ ...f, runIntervalWork: "3:00", runIntervalRecover: "1:00", runIntervalRepeat: "6", runIncline: "6" }))}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                    3:00 incline + 1:00 run × 6
                  </button>
                  <button type="button"
                    onClick={() => setForm((f) => ({ ...f, runIntervalWork: "1:00", runIntervalRecover: "1:00", runIntervalRepeat: "8", runIncline: "" }))}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                    1:00 / 1:00 × 8
                  </button>
                </div>
              </div>
              {/* Interval builder */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-neutral-500 tracking-wide">Define your interval pattern</span>
                <div className="bg-neutral-800/50 border border-white/5 rounded-2xl px-4 py-4">
                  <div className="flex gap-3">
                    <Field label="Work" className="flex-1">
                      <input name="runIntervalWork" type="text" placeholder="e.g. 3:00 (incline walk)"
                        value={form.runIntervalWork} onChange={handleTopLevel} className={inputClass} />
                    </Field>
                    <Field label="Recover" className="flex-1">
                      <input name="runIntervalRecover" type="text" placeholder="e.g. 1:00 (easy jog)"
                        value={form.runIntervalRecover} onChange={handleTopLevel} className={inputClass} />
                    </Field>
                    <Field label="Repeat" className="w-20">
                      <input name="runIntervalRepeat" type="number" inputMode="numeric" placeholder="8"
                        value={form.runIntervalRepeat} onChange={handleTopLevel} className={inputClass} />
                    </Field>
                  </div>
                </div>
              </div>
              {/* Optional: incline + speed */}
              <div className="flex gap-3">
                <Field label="Incline % (optional)" className="flex-1">
                  <input name="runIncline" type="number" inputMode="decimal" placeholder="e.g. 6"
                    value={form.runIncline} onChange={handleTopLevel} className={inputClass} />
                </Field>
                <Field label="Speed note (optional)" className="flex-1">
                  <input name="runSpeed" type="text" placeholder="e.g. 6.5 km/h"
                    value={form.runSpeed} onChange={handleTopLevel} className={inputClass} />
                </Field>
              </div>
            </div>
          )}

          {form.runSubtype === "incline" && (
            <div className="flex flex-col gap-3">
              <Field label="Duration">
                <input name="duration" type="text" placeholder="e.g. 30 min"
                  value={form.duration} onChange={handleTopLevel} className={inputClass} />
              </Field>
              <div className="flex gap-3">
                <Field label="Incline %" className="flex-1">
                  <input name="runIncline" type="number" inputMode="decimal" placeholder="e.g. 6"
                    value={form.runIncline} onChange={handleTopLevel} className={inputClass} />
                </Field>
                <Field label="Speed (optional)" className="flex-1">
                  <input name="runSpeed" type="text" placeholder="e.g. 6.5 km/h"
                    value={form.runSpeed} onChange={handleTopLevel} className={inputClass} />
                </Field>
              </div>
            </div>
          )}

          {form.runSubtype === "tempo" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Field label="Duration" className="flex-1">
                  <input name="duration" type="text" placeholder="e.g. 25 min"
                    value={form.duration} onChange={handleTopLevel} className={inputClass} />
                </Field>
                <Field label="Distance (km) — optional" className="flex-1">
                  <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 5"
                    value={form.distance} onChange={handleTopLevel} className={inputClass} />
                </Field>
              </div>
              <Field label="Pace / effort note (optional)">
                <input name="runSpeed" type="text" placeholder="e.g. 5:10 /km, threshold effort"
                  value={form.runSpeed} onChange={handleTopLevel} className={inputClass} />
              </Field>
            </div>
          )}

          {form.runSubtype === "long" && (
            <div className="flex gap-3">
              <Field label="Distance (km)" className="flex-1">
                <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 10"
                  value={form.distance} onChange={handleTopLevel} className={inputClass} />
              </Field>
              <Field label="Duration" className="flex-1">
                <input name="duration" type="text" placeholder="e.g. 58:10"
                  value={form.duration} onChange={handleTopLevel} className={inputClass} />
              </Field>
            </div>
          )}

          {form.runSubtype === "custom" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Field label="Distance (km)" className="flex-1">
                  <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 5"
                    value={form.distance} onChange={handleTopLevel} className={inputClass} />
                </Field>
                <Field label="Duration" className="flex-1">
                  <input name="duration" type="text" placeholder="e.g. 31:45 or 45 min"
                    value={form.duration} onChange={handleTopLevel} className={inputClass} />
                </Field>
              </div>
              <Field label="Intervals (optional)">
                <input name="intervals" type="text" placeholder="e.g. 4 x 400m"
                  value={form.intervals} onChange={handleTopLevel} className={inputClass} />
              </Field>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {fromTemplate && (
            <p className="text-xs text-neutral-500 -mt-1">Based on your last session</p>
          )}
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
                onSetType={(setIdx, type) => handleSetType(exIdx, setIdx, type)}
                onNote={(v) => handleExerciseNote(exIdx, v)}
                onOpenNote={() => handleOpenNote(exIdx)}
                onToggleComplete={() => handleToggleComplete(exIdx)}
                onSwap={() => setSwapIndex(exIdx)}
                onInsights={() => setInsightExercise(form.exercises[exIdx].name)}
                exerciseLibrary={exerciseLibrary}
                lastSet={lastSetByName.get(ex.name.trim().toLowerCase()) ?? null}
                lastTopSet={lastTopSetByName.get(ex.name.trim().toLowerCase()) ?? null}
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
        <div ref={actionsRef} className="flex gap-3">
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
        <div ref={actionsRef} className="flex gap-3">
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
        // Pre-start — optionally "Start Live Intervals" then "Begin Workout"
        <div className="flex flex-col gap-3">
          {isRun && form.runSubtype === "intervals" && (
            <button
              type="button"
              onClick={() => {
                const workSecs = parseIntervalTime(form.runIntervalWork);
                const recoverSecs = parseIntervalTime(form.runIntervalRecover);
                const rep = parseInt(form.runIntervalRepeat);
                if (!workSecs || !recoverSecs || !rep || rep < 1) {
                  setError("Please fill in Work, Recover, and Repeat before starting live intervals.");
                  return;
                }
                setError(null);
                setStartTime(new Date().toISOString());
                resetPauseState();
                setLiveIntervalActive(true);
              }}
              className="w-full rounded-2xl bg-neutral-800 border border-white/5 py-4
                         text-base font-semibold text-indigo-400 hover:text-indigo-300
                         active:scale-[0.98] transition-all"
            >
              Start Live Intervals
            </button>
          )}
          <button
            type="button"
            onClick={() => { setStartTime(new Date().toISOString()); resetPauseState(); }}
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       transition-all py-5 text-lg font-semibold text-white shadow-lg"
          >
            Begin Workout
          </button>
        </div>
      )}
    </div>

      {/* Exercise swap sheet */}
      {swapIndex !== null && (
        <SwapSheet
          exerciseName={form.exercises[swapIndex]?.name ?? ""}
          onSelect={(name) => handleExerciseName(swapIndex, name)}
          onClose={() => setSwapIndex(null)}
        />
      )}

      {/* Exercise insights sheet */}
      {insightExercise !== null && (
        <ExerciseInsightSheet
          exerciseName={insightExercise}
          onClose={() => setInsightExercise(null)}
        />
      )}

      {/* Live interval overlay */}
      {liveIntervalActive && (
        <LiveIntervalOverlay
          work={form.runIntervalWork}
          recover={form.runIntervalRecover}
          repeat={parseInt(form.runIntervalRepeat)}
          onClose={() => setLiveIntervalActive(false)}
        />
      )}
  </>
  );
}

// ─── Exercise block ───────────────────────────────────────────────────────────

function computeNextSetSuggestion(
  sets: DraftSet[],
  lastTopSet: { weight: number; reps: number },
  unit: string
): string | null {
  const curTop = sets.reduce<{ weight: number; reps: number } | null>((best, s) => {
    const w = parseFloat(s.weight);
    const r = parseInt(s.reps, 10);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return best;
    if (!best || w > best.weight) return { weight: w, reps: r };
    return best;
  }, null);

  if (!curTop) return null;

  const prevW = lastTopSet.weight;
  const prevR = lastTopSet.reps;
  const curW = curTop.weight;
  const curR = curTop.reps;

  if (curW < prevW) return `Suggested: match last top set`;
  if (curW === prevW && curR < prevR) return `Suggested: match last top set`;
  if (curW === prevW && curR === prevR) {
    const inc = unit === "lbs" ? 5 : 2.5;
    const nextW = curW + inc;
    const repLow = Math.max(6, prevR - 1);
    return `Suggested: ${nextW}${unit} × ${repLow}–${prevR}`;
  }
  // E & F: already beating previous top — no suggestion needed
  return null;
}

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
  onSetType,
  onAddSet,
  onRemoveSet,
  onNote,
  onOpenNote,
  onToggleComplete,
  onSwap,
  onInsights,
  exerciseLibrary,
  lastSet,
  lastTopSet,
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
  onSetType: (setIdx: number, type: "warmup" | "drop" | undefined) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onNote: (v: string) => void;
  onOpenNote: () => void;
  onToggleComplete: () => void;
  onSwap: () => void;
  onInsights: () => void;
  exerciseLibrary: string[];
  lastSet: { weight?: number; reps?: number; duration?: string } | null;
  lastTopSet: { weight: number; reps: number } | null;
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

  const appliedPrefillRef = useRef<string | null>(null);

  useEffect(() => {
    const normalized = exercise.name.trim().toLowerCase();
    if (!lastSet || !normalized) return;
    if (appliedPrefillRef.current === normalized) return;
    const firstSet = exercise.sets[0];
    if (!firstSet) return;
    if (firstSet.weight !== "" || firstSet.reps !== "") return;
    appliedPrefillRef.current = normalized;
    if (lastSet.weight !== undefined) onSetField(0, "weight", String(lastSet.weight));
    if (lastSet.reps !== undefined) onSetField(0, "reps", String(lastSet.reps));
  }, [exercise.name, lastSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const columnHeaders = () => {
    if (mode === "weight_reps") return <><span className="flex-1 text-xs text-neutral-600">{unit}</span><span className="flex-1 text-xs text-neutral-600">reps</span><span className="w-6 text-center text-xs text-neutral-500">Type</span><span className="w-5" /></>;
    if (mode === "reps_only") return <><span className="flex-1 text-xs text-neutral-600">reps</span><span className="w-6 text-center text-xs text-neutral-500">Type</span><span className="w-5" /></>;
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
        <button
          type="button"
          onClick={() => {
            const name = exercise.name?.trim();
            if (!name) return;
            onInsights();
          }}
          className={`shrink-0 text-xs transition-colors ${lastSet ? "text-neutral-400" : "text-neutral-500"} hover:text-white`}
        >
          Insights
        </button>
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
        <span className="ml-auto">
          <button type="button" onClick={onSwap}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            Swap
          </button>
        </span>
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

      {/* Target guidance — recommended templates only */}
      {exercise.target && (
        <p className="text-xs text-indigo-400/80 pl-1">Target: {exercise.target}</p>
      )}

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
              onTypeChange={(type) => onSetType(setIdx, type)}
              onRemove={() => onRemoveSet(setIdx)}
            />
          ))}

          {(() => {
            if (!exercise.name.trim()) return null;

            if (mode === "weight_reps") {
              // Previous hint: always shown when not completed (uses first valid set)
              if (!exercise.completed) {
                const prevLine = lastSet && lastSet.weight !== undefined && lastSet.reps !== undefined
                  ? `Previous: ${lastSet.weight} × ${lastSet.reps}`
                  : null;
                const suggestion = lastTopSet && unit !== "plates"
                  ? computeNextSetSuggestion(exercise.sets, lastTopSet, unit)
                  : null;
                if (!prevLine && !suggestion) return null;
                return (
                  <div className="pl-1 flex flex-col gap-0.5">
                    {prevLine && <p className="text-xs text-neutral-500">{prevLine}</p>}
                    {suggestion && <p className="text-xs text-indigo-400/70">{suggestion}</p>}
                  </div>
                );
              }

              // Completed: show first-valid "Previous" line + top-set delta
              const prevLine = lastSet && lastSet.weight !== undefined && lastSet.reps !== undefined
                ? `Previous: ${lastSet.weight} × ${lastSet.reps}`
                : null;

              let deltaLine: string | null = null;
              if (lastTopSet) {
                const curTop = exercise.sets.reduce<DraftSet | null>((best, s) => {
                  const w = parseFloat(s.weight);
                  if (isNaN(w) || isNaN(parseInt(s.reps, 10))) return best;
                  if (!best || w > parseFloat(best.weight)) return s;
                  return best;
                }, null);
                const curTopW = curTop ? parseFloat(curTop.weight) : NaN;
                if (!isNaN(curTopW)) {
                  const dW = curTopW - lastTopSet.weight;
                  const sign = dW > 0 ? "+" : "";
                  const label = unit === "plates"
                    ? `${sign}${dW} ${Math.abs(dW) === 1 ? "plate" : "plates"}`
                    : `${sign}${dW}${unit}`;
                  deltaLine = dW === 0 ? "Top set: same as last time" : `Top set: ${label} vs last time`;
                }
              }

              if (!prevLine && !deltaLine) return null;
              return (
                <div className="pl-1 flex flex-col gap-0.5 mt-0.5">
                  {prevLine && <p className="text-xs text-neutral-500">{prevLine}</p>}
                  {deltaLine && <p className="text-xs font-medium text-neutral-300">{deltaLine}</p>}
                </div>
              );
            }

            // Other modes — unchanged
            if (!lastSet) return null;
            const lastHint =
              mode === "reps_only" && lastSet.reps !== undefined
                ? `Previous: ${lastSet.reps} reps`
                : mode === "duration_only" && lastSet.duration
                ? `Previous: ${lastSet.duration}`
                : null;
            return lastHint ? <p className="text-xs text-neutral-500 pl-1">{lastHint}</p> : null;
          })()}

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
  onTypeChange,
  onRemove,
}: {
  set: DraftSet;
  mode: TrackingMode;
  canRemove: boolean;
  onFieldChange: (field: keyof DraftSet, v: string) => void;
  onTypeChange: (type: "warmup" | "drop" | undefined) => void;
  onRemove: () => void;
}) {
  const isWarmup = set.type === "warmup";
  const setInputClass =
    "flex-1 min-w-0 rounded-lg bg-neutral-700 border border-neutral-600 px-2 py-2 text-sm text-center " +
    "placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition " +
    (isWarmup ? "text-amber-300/70 opacity-70" : "text-white");

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

  const nextType = (cur: DraftSet["type"]) =>
    cur === undefined ? "warmup" : cur === "warmup" ? "drop" : undefined;

  const typeBtn = (
    <button
      type="button"
      onClick={() => onTypeChange(nextType(set.type))}
      className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded transition-colors ${
        set.type === "warmup"
          ? "text-amber-400"
          : set.type === "drop"
          ? "text-blue-400"
          : "text-neutral-400"
      }`}
      aria-label="Set type"
    >
      {set.type === "warmup" ? "W" : set.type === "drop" ? "D" : "–"}
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
        {typeBtn}
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
        {typeBtn}
        {removeBtn}
      </div>
    );
  }

  // duration_only — no type toggle
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

// ─── Swap sheet ───────────────────────────────────────────────────────────────

function SwapSheet({
  exerciseName,
  onSelect,
  onClose,
}: {
  exerciseName: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const key = exerciseName.trim();
  const alternatives = getExerciseAlternatives(key);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-neutral-950/70"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="px-5 pt-5 pb-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
            Swap exercise
          </p>
          <p className="text-sm font-medium text-white truncate">{key || "—"}</p>
        </div>

        {alternatives.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-neutral-500">No alternatives available.</p>
        ) : (
          <div className="flex flex-col pb-4">
            {alternatives.map((alt) => (
              <button
                key={alt}
                type="button"
                onClick={() => { onSelect(alt); onClose(); }}
                className="w-full text-left px-5 py-3.5 text-sm text-neutral-200
                           hover:bg-neutral-800 active:bg-neutral-700 transition-colors
                           border-b border-neutral-800 last:border-b-0"
              >
                {alt}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Live interval overlay ────────────────────────────────────────────────────

function LiveIntervalOverlay({
  work,
  recover,
  repeat,
  onClose,
}: {
  work: string;
  recover: string;
  repeat: number;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"work" | "recover">("work");
  const [timeRemaining, setTimeRemaining] = useState(() => parseIntervalTime(work));
  const [currentInterval, setCurrentInterval] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Countdown tick
  useEffect(() => {
    if (isPaused || isComplete || timeRemaining <= 0) return;
    const id = setTimeout(() => setTimeRemaining((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeRemaining, isPaused, isComplete]);

  // Phase transition when time hits 0
  useEffect(() => {
    if (timeRemaining > 0 || isPaused || isComplete) return;
    if (phase === "work") {
      setPhase("recover");
      setTimeRemaining(parseIntervalTime(recover));
    } else {
      if (currentInterval >= repeat) {
        setIsComplete(true);
      } else {
        setCurrentInterval((i) => i + 1);
        setPhase("work");
        setTimeRemaining(parseIntervalTime(work));
      }
    }
  }, [timeRemaining, phase, isPaused, isComplete, currentInterval, repeat, work, recover]);

  function handleSkip() {
    if (phase === "work") {
      setPhase("recover");
      setTimeRemaining(parseIntervalTime(recover));
    } else {
      if (currentInterval >= repeat) {
        setIsComplete(true);
      } else {
        setCurrentInterval((i) => i + 1);
        setPhase("work");
        setTimeRemaining(parseIntervalTime(work));
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950 flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Top: label + summary */}
      <div className="px-6 pt-6 flex flex-col gap-0.5">
        <p className="text-[11px] text-neutral-600 tracking-widest uppercase">Intervals</p>
        <p className="text-sm text-neutral-500">{work} / {recover} × {repeat}</p>
      </div>

      {/* Center: phase + timer + progress */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        {isComplete ? (
          <p className="text-2xl font-bold text-white">Intervals complete</p>
        ) : (
          <>
            <p className={`text-sm font-semibold tracking-widest uppercase ${
              phase === "work" ? "text-white" : "text-indigo-300"
            }`}>
              {phase === "work" ? "Work" : "Recover"}
            </p>
            <p className="text-7xl font-bold tracking-tight text-white tabular-nums">
              {formatIntervalTime(timeRemaining)}
            </p>
            <p className="text-sm text-neutral-500">
              Interval {currentInterval} of {repeat}
            </p>
          </>
        )}
      </div>

      {/* Bottom: controls */}
      <div className="px-6 pb-8 flex flex-col gap-3">
        {isComplete ? (
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-base
                       active:scale-[0.98] transition-all"
          >
            Back to session
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="w-full py-4 rounded-2xl bg-neutral-800 text-white font-semibold text-base
                         active:scale-[0.98] transition-all"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-2xl bg-neutral-800/60 text-neutral-400 text-sm
                           active:scale-[0.98] transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => { if (window.confirm("End interval session?")) onClose(); }}
                className="flex-1 py-3 rounded-2xl bg-neutral-800/60 text-neutral-500 text-sm
                           active:scale-[0.98] transition-all"
              >
                End
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
