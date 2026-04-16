"use client";

import { memo, useRef, useState, useEffect } from "react";
import { DraftSet } from "./types";
import { TrackingMode, WeightUnit } from "@/types/session";
import { round2 } from "@/lib/units";

/** Convert a canonical-kg draft value to a display string in the given unit. */
function toDisplayStr(canonicalKg: string, unit: WeightUnit): string {
  if (!canonicalKg) return "";
  const n = parseFloat(canonicalKg);
  if (isNaN(n)) return canonicalKg; // pass through non-numeric (shouldn't happen)
  if (unit === "lbs") return String(Math.round((n / 0.453592) * 10) / 10); // 1 decimal
  return canonicalKg; // kg or plates: show canonical value as-is
}

export const SetRow = memo(function SetRow({
  set,
  setIdx,
  mode,
  displayUnit,
  canRemove,
  onSetField,
  onTypeChange,
  onRemove,
}: {
  set: DraftSet;
  setIdx: number;
  mode: TrackingMode;
  displayUnit: WeightUnit;
  canRemove: boolean;
  onSetField: (setIdx: number, field: keyof DraftSet, v: string) => void;
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

  // Local state for weight input — allows free typing without round-trip reformatting.
  // Commits canonical kg to draft on blur.
  const focusedRef = useRef(false);
  const [localWeight, setLocalWeight] = useState(() =>
    toDisplayStr(set.weight, displayUnit)
  );

  // Sync display when canonical draft value or display unit changes (e.g. toggle, template load).
  useEffect(() => {
    if (!focusedRef.current) {
      setLocalWeight(toDisplayStr(set.weight, displayUnit));
    }
  }, [set.weight, displayUnit]);

  const commitWeight = (raw: string) => {
    if (raw === "") {
      onSetField(setIdx, "weight", "");
      return;
    }
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      const kg = displayUnit === "lbs" ? round2(n * 0.453592) : n;
      onSetField(setIdx, "weight", String(kg));
    }
    // Invalid string: no commit — leave draft unchanged
  };

  if (mode === "weight_reps") {
    return (
      <div className="flex gap-2 items-center">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={localWeight}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={(e) => {
            focusedRef.current = false;
            commitWeight(e.target.value);
          }}
          onChange={(e) => setLocalWeight(e.target.value)}
          className={setInputClass}
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={set.reps}
          onChange={(e) => onSetField(setIdx, "reps", e.target.value)}
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
          onChange={(e) => onSetField(setIdx, "reps", e.target.value)}
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
        onChange={(e) => onSetField(setIdx, "duration", e.target.value)}
        className={setInputClass}
      />
      {removeBtn}
    </div>
  );
});
