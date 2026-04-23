"use client";

import { hapticSelection } from "@/lib/haptics";

export type Range = "30D" | "3M" | "6M" | "ALL";

const OPTIONS: Range[] = ["30D", "3M", "6M", "ALL"];

export default function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="flex rounded-xl bg-neutral-800/60 border border-neutral-700/40 p-0.5 gap-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => { hapticSelection(); onChange(opt); }}
          className={`flex-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            value === opt
              ? "bg-neutral-700 text-white"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
