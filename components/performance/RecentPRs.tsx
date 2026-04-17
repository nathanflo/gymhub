"use client";

import { PREvent } from "@/lib/performance";
import { fmtW } from "@/lib/units";

export default function RecentPRs({
  prs,
  unit,
}: {
  prs: PREvent[];
  unit: "kg" | "lbs";
}) {
  if (prs.length === 0) return null;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
        Recent records
      </p>
      <div className="flex flex-col gap-3">
        {prs.map((pr, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-neutral-300">{pr.exerciseName}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-white tabular-nums">
                {fmtW(pr.valueKg, unit)}
              </span>
              <span className="text-[10px] text-neutral-600 w-12 text-right">
                {new Date(pr.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
