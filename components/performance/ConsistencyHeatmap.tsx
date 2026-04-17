"use client";

import { WorkoutSession } from "@/types/session";

const NUM_WEEKS = 16;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function cellStyle(count: number, isFuture: boolean): string {
  if (isFuture) return "bg-neutral-900/50";
  if (count === 0) return "bg-neutral-800/60";
  if (count === 1) return "bg-indigo-900";
  if (count === 2) return "bg-indigo-700/70";
  return "bg-indigo-500/80";
}

export default function ConsistencyHeatmap({ sessions }: { sessions: WorkoutSession[] }) {
  // Build date → session count map
  const countMap = new Map<string, number>();
  for (const s of sessions) {
    const d = s.date.slice(0, 10);
    countMap.set(d, (countMap.get(d) ?? 0) + 1);
  }

  // Start from the Monday that is (NUM_WEEKS - 1) weeks before this week's Monday
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;

  const thisMon = new Date(today);
  thisMon.setDate(today.getDate() - daysFromMon);
  thisMon.setHours(0, 0, 0, 0);

  const startDate = new Date(thisMon);
  startDate.setDate(thisMon.getDate() - (NUM_WEEKS - 1) * 7);

  const todayStr = localDateStr(today);

  // Build cells in column-major order (week0-Mon, week0-Tue, ..., week0-Sun, week1-Mon, ...)
  // so that grid-flow-col + grid-rows-7 renders them correctly
  const cells: { dateStr: string; count: number; isFuture: boolean }[] = [];
  for (let w = 0; w < NUM_WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = localDateStr(date);
      cells.push({
        dateStr,
        count: countMap.get(dateStr) ?? 0,
        isFuture: dateStr > todayStr,
      });
    }
  }

  const totalThisWeek = sessions.filter(
    (s) => s.date.slice(0, 10) >= localDateStr(thisMon)
  ).length;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
          Consistency
        </p>
        {totalThisWeek > 0 && (
          <span className="text-xs text-neutral-500">
            {totalThisWeek} this week
          </span>
        )}
      </div>

      {/* Heatmap grid — 7 rows (Mon–Sun), NUM_WEEKS columns */}
      <div className="flex gap-1">
        {/* Day labels column */}
        <div className="flex flex-col gap-1 mr-0.5">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-[8px] text-neutral-700 flex items-center"
              style={{ height: 10 }}
            >
              {i % 2 === 0 ? label : ""}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div
          className="flex-1 grid grid-flow-col grid-rows-7 gap-1"
        >
          {cells.map(({ dateStr, count, isFuture }) => (
            <div
              key={dateStr}
              className={`rounded-[2px] ${cellStyle(count, isFuture)}`}
              style={{ aspectRatio: "1" }}
              title={`${dateStr}: ${count} session${count !== 1 ? "s" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
