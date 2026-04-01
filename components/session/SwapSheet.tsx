"use client";

import { getExerciseAlternatives } from "@/lib/exerciseAlternatives";

export function SwapSheet({
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
