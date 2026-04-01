"use client";

import { memo } from "react";
import { DraftSet } from "./types";
import { TrackingMode } from "@/types/session";

export const SetRow = memo(function SetRow({
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
});
