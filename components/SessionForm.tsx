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

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { WorkoutSession, WorkoutExercise, WorkoutSet, TrackingMode, WeightUnit } from "@/types/session";
import { WorkoutType, EnergyLevel } from "@/types/workout";
import { WorkoutTemplate } from "@/types/template";
import { Field, inputClass, selectClass } from "@/components/Field";
import { getExerciseLibrary } from "@/lib/exercises";
import { getSessions } from "@/lib/sessions";
import { ExerciseInsightSheet } from "@/components/ExerciseInsightSheet";
import { getRestTarget } from "@/lib/restTargets";
import { parseIntervalTime } from "@/components/session/helpers";
import { LiftSection } from "@/components/session/LiftSection";
import { RunSection } from "@/components/session/RunSection";
import { YogaSection } from "@/components/session/YogaSection";
import { SwapSheet } from "@/components/session/SwapSheet";
import { LiveIntervalOverlay } from "@/components/session/LiveIntervalOverlay";

import type { DraftSet, DraftExercise, SessionFormState } from "@/components/session/types";
import { emptySet, emptyExercise, emptySessionForm } from "@/components/session/types";

// Re-export for backwards compatibility (edit page, log page import these from SessionForm)
export type { SessionFormState };
export { emptyExercise, emptySessionForm };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKOUT_TYPES: WorkoutType[] = ["Push", "Pull", "Legs", "Arms", "Full Body", "Run", "Yoga", "Other"];
const ENERGY_LEVELS: EnergyLevel[] = ["Low", "Medium", "High"];

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
  // stable: setForm (functional update) + setError are both stable state setters
  const handleTopLevel = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }, []);

  // ── Exercise handlers ────────────────────────────────────────────────────
  // All use setForm in functional-update form — no state captured — stable with []
  const handleExerciseName = useCallback((exIdx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === exIdx ? { ...ex, name: value } : ex
      ),
    }));
  }, []);

  const handleModeChange = useCallback((exIdx: number, mode: TrackingMode) => {
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
  }, []);

  const handleUnitChange = useCallback((exIdx: number, unit: WeightUnit) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === exIdx ? { ...ex, unit } : ex
      ),
    }));
  }, []);

  const handleFreeformNote = useCallback((exIdx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === exIdx ? { ...ex, freeformNote: value } : ex
      ),
    }));
  }, []);

  const handleAddExercise = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, emptyExercise()],
    }));
  }, []);

  const handleRemoveExercise = useCallback((exIdx: number) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== exIdx),
    }));
  }, []);

  const handleMoveExercise = useCallback((exIdx: number, direction: "up" | "down") => {
    setForm((prev) => {
      const exs = [...prev.exercises];
      const swapIdx = direction === "up" ? exIdx - 1 : exIdx + 1;
      [exs[exIdx], exs[swapIdx]] = [exs[swapIdx], exs[exIdx]];
      return { ...prev, exercises: exs };
    });
  }, []);

  const handleInsertExerciseBelow = useCallback((exIdx: number) => {
    setForm((prev) => {
      const exs = [...prev.exercises];
      exs.splice(exIdx + 1, 0, emptyExercise());
      return { ...prev, exercises: exs };
    });
  }, []);

  // ── Set handlers ─────────────────────────────────────────────────────────
  const handleSetField = useCallback((
    exIdx: number,
    setIdx: number,
    field: keyof DraftSet,
    value: string
  ) => {
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
  }, []);

  const handleSetType = useCallback((
    exIdx: number,
    setIdx: number,
    type: "warmup" | "drop" | undefined
  ) => {
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
  }, []);

  // stable: calls only stable state setters
  const resetPauseState = useCallback(() => {
    setIsPaused(false);
    setPausedOffset(0);
    setPauseStartedAt(null);
  }, []);

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

  // reads startTime — updates when workout begins (once per session)
  const handleAddSet = useCallback((exIdx: number) => {
    if (!startTime) {
      setStartTime(new Date().toISOString());
      setIsPaused(false);
      setPausedOffset(0);
      setPauseStartedAt(null);
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
  }, [startTime]);

  const handleExerciseNote = useCallback((exIdx: number, value: string) => {
    setForm(f => { const exs = [...f.exercises]; exs[exIdx] = { ...exs[exIdx], note: value }; return { ...f, exercises: exs }; });
  }, []);

  // inlined setForm call — no longer calls handleExerciseNote — stable with []
  const handleOpenNote = useCallback((exIdx: number) => {
    setForm(f => { const exs = [...f.exercises]; exs[exIdx] = { ...exs[exIdx], note: "" }; return { ...f, exercises: exs }; });
  }, []);

  // reads form.exercises to find next uncompleted index for auto-advance
  const handleToggleComplete = useCallback((exIdx: number) => {
    const isCompleting = !form.exercises[exIdx].completed;
    setForm(f => {
      const exs = [...f.exercises];
      exs[exIdx] = { ...exs[exIdx], completed: !exs[exIdx].completed };
      return { ...f, exercises: exs };
    });
    if (isCompleting) {
      const next = form.exercises.findIndex((ex, i) => i > exIdx && !ex.completed);
      if (next !== -1) setActiveExIdx(next);
    } else {
      setActiveExIdx(exIdx);
    }
  }, [form.exercises]);

  // reads form.exercises to get exercise name by index
  const handleInsights = useCallback((exIdx: number) => {
    setInsightExercise(form.exercises[exIdx].name);
  }, [form.exercises]);

  const handleRemoveSet = useCallback((exIdx: number, setIdx: number) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
      }),
    }));
  }, []);

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
          <YogaSection
            form={form}
            onChange={handleTopLevel}
            setForm={setForm}
            inputClass={inputClass}
            selectClass={selectClass}
          />
        ) : isRun ? (
          <RunSection
            form={form}
            onChange={handleTopLevel}
            setForm={setForm}
            inputClass={inputClass}
            selectClass={selectClass}
          />
        ) : (
          <LiftSection
            exercises={form.exercises}
            activeExIdx={activeExIdx}
            setActiveExIdx={setActiveExIdx}
            exerciseLibrary={exerciseLibrary}
            lastSetByName={lastSetByName}
            lastTopSetByName={lastTopSetByName}
            fromTemplate={fromTemplate}
            onExerciseName={handleExerciseName}
            onModeChange={handleModeChange}
            onUnitChange={handleUnitChange}
            onFreeformNote={handleFreeformNote}
            onAddExercise={handleAddExercise}
            onRemoveExercise={handleRemoveExercise}
            onMoveExercise={handleMoveExercise}
            onInsertExerciseBelow={handleInsertExerciseBelow}
            onSetField={handleSetField}
            onSetType={handleSetType}
            onAddSet={handleAddSet}
            onRemoveSet={handleRemoveSet}
            onExerciseNote={handleExerciseNote}
            onOpenNote={handleOpenNote}
            onToggleComplete={handleToggleComplete}
            onSwap={setSwapIndex}
            onInsights={handleInsights}
          />
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
