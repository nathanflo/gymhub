"use client";

import { useState, useMemo, useEffect, useRef, memo } from "react";
import { TrackingMode, WeightUnit } from "@/types/session";
import { inputClass } from "@/components/Field";
import { DraftSet, DraftExercise } from "./types";
import { SetRow } from "./SetRow";
import { toKg, round2 } from "@/lib/units";

const MODE_LABELS: Record<TrackingMode, string> = {
  weight_reps: "Wt + Reps",
  reps_only: "Reps",
  duration_only: "Time",
  freeform: "Freeform",
};

function computeNextSetSuggestion(
  sets: DraftSet[],
  lastTopSet: { weight: number; reps: number; unit?: string },
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

  const prevUnit = lastTopSet.unit ?? "kg";

  // Cross-unit comparison: convert to kg to decide direction, but suppress numeric suggestion
  if (prevUnit !== unit) {
    const curKg  = toKg(curTop.weight, unit);
    const prevKg = toKg(lastTopSet.weight, prevUnit);
    if (curKg === null || prevKg === null) return null;
    if (curKg < prevKg) return `Suggested: match last top set`;
    return null; // beating previous in kg terms — no increment suggestion across units
  }

  // Same unit — existing logic unchanged
  const prevW = lastTopSet.weight;
  const prevR = lastTopSet.reps;
  const curW  = curTop.weight;
  const curR  = curTop.reps;

  if (curW < prevW) return `Suggested: match last top set`;
  if (curW === prevW && curR < prevR) return `Suggested: match last top set`;
  if (curW === prevW && curR === prevR) {
    const inc = unit === "lbs" ? 5 : 2.5;
    const nextW = curW + inc;
    const repLow = Math.max(6, prevR - 1);
    return `Suggested: ${nextW}${unit} × ${repLow}–${prevR}`;
  }
  // Already beating previous top — no suggestion needed
  return null;
}

export const ExerciseBlock = memo(function ExerciseBlock({
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
  lastTopSet: { weight: number; reps: number; unit?: string } | null;
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
                  const prevUnit = lastTopSet.unit ?? "kg";
                  if (unit === "plates" || prevUnit === "plates") {
                    // Plates: only compare if same unit
                    if (unit === prevUnit) {
                      const dW = curTopW - lastTopSet.weight;
                      const sign = dW > 0 ? "+" : "";
                      deltaLine = dW === 0
                        ? "Top set: same as last time"
                        : `Top set: ${sign}${dW} ${Math.abs(dW) === 1 ? "plate" : "plates"} vs last time`;
                    }
                  } else if (unit === prevUnit) {
                    // Same unit — show raw delta in that unit
                    const dW = curTopW - lastTopSet.weight;
                    const sign = dW > 0 ? "+" : "";
                    deltaLine = dW === 0
                      ? "Top set: same as last time"
                      : `Top set: ${sign}${dW}${unit} vs last time`;
                  } else {
                    // Different units — convert both to kg, display delta in kg
                    const curKg  = toKg(curTopW, unit);
                    const prevKg = toKg(lastTopSet.weight, prevUnit);
                    if (curKg !== null && prevKg !== null) {
                      const dKg = round2(curKg - prevKg);
                      const sign = dKg > 0 ? "+" : "";
                      deltaLine = dKg === 0
                        ? "Top set: same as last time"
                        : `Top set: ${sign}${dKg}kg vs last time`;
                    }
                  }
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
});
