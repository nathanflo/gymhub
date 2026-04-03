"use client";

import { memo } from "react";
import { TrackingMode, WeightUnit } from "@/types/session";
import { DraftSet, DraftExercise } from "./types";
import { ExerciseBlock } from "./ExerciseBlock";

export const LiftSection = memo(function LiftSection({
  exercises,
  activeExIdx,
  setActiveExIdx,
  exerciseLibrary,
  lastSetByName,
  lastTopSetByName,
  fromTemplate,
  onExerciseName,
  onModeChange,
  onUnitChange,
  onFreeformNote,
  onAddExercise,
  onRemoveExercise,
  onMoveExercise,
  onInsertExerciseBelow,
  onSetField,
  onSetType,
  onAddSet,
  onRemoveSet,
  onExerciseNote,
  onOpenNote,
  onToggleComplete,
  onSwap,
  onInsights,
  workingUnit,
}: {
  exercises: DraftExercise[];
  activeExIdx: number;
  setActiveExIdx: (i: number) => void;
  exerciseLibrary: string[];
  lastSetByName: Map<string, { weight?: number; reps?: number; duration?: string }>;
  lastTopSetByName: Map<string, { weight: number; reps: number }>;
  workingUnit: "kg" | "lbs";
  fromTemplate?: boolean;
  onExerciseName: (exIdx: number, value: string) => void;
  onModeChange: (exIdx: number, mode: TrackingMode) => void;
  onUnitChange: (exIdx: number, unit: WeightUnit) => void;
  onFreeformNote: (exIdx: number, value: string) => void;
  onAddExercise: () => void;
  onRemoveExercise: (exIdx: number) => void;
  onMoveExercise: (exIdx: number, direction: "up" | "down") => void;
  onInsertExerciseBelow: (exIdx: number) => void;
  onSetField: (exIdx: number, setIdx: number, field: keyof DraftSet, value: string) => void;
  onSetType: (exIdx: number, setIdx: number, type: "warmup" | "drop" | undefined) => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
  onExerciseNote: (exIdx: number, value: string) => void;
  onOpenNote: (exIdx: number) => void;
  onToggleComplete: (exIdx: number) => void;
  onSwap: (exIdx: number) => void;
  onInsights: (exIdx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {fromTemplate && (
        <p className="text-xs text-neutral-500 -mt-1">Based on your last session</p>
      )}
      {exercises.map((ex, exIdx) => (
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
            canRemove={exercises.length > 1}
            canMoveUp={exIdx > 0}
            canMoveDown={exIdx < exercises.length - 1}
            onMoveUp={() => onMoveExercise(exIdx, "up")}
            onMoveDown={() => onMoveExercise(exIdx, "down")}
            onInsertBelow={() => onInsertExerciseBelow(exIdx)}
            onNameChange={(v) => onExerciseName(exIdx, v)}
            onNameFocus={() => setActiveExIdx(exIdx)}
            onModeChange={(m) => onModeChange(exIdx, m)}
            onUnitChange={(u) => onUnitChange(exIdx, u)}
            onFreeformNote={(v) => onFreeformNote(exIdx, v)}
            onRemoveExercise={() => onRemoveExercise(exIdx)}
            onSetField={(setIdx, field, v) => onSetField(exIdx, setIdx, field, v)}
            onAddSet={() => onAddSet(exIdx)}
            onRemoveSet={(setIdx) => onRemoveSet(exIdx, setIdx)}
            onSetType={(setIdx, type) => onSetType(exIdx, setIdx, type)}
            onNote={(v) => onExerciseNote(exIdx, v)}
            onOpenNote={() => onOpenNote(exIdx)}
            onToggleComplete={() => onToggleComplete(exIdx)}
            onSwap={() => onSwap(exIdx)}
            onInsights={() => onInsights(exIdx)}
            exerciseLibrary={exerciseLibrary}
            lastSet={lastSetByName.get(ex.name.trim().toLowerCase()) ?? null}
            lastTopSet={lastTopSetByName.get(ex.name.trim().toLowerCase()) ?? null}
            workingUnit={workingUnit}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={onAddExercise}
        className="self-start text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        + Add Exercise
      </button>
    </div>
  );
});
