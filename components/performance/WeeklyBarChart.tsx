"use client";

import { WorkoutSession } from "@/types/session";

const NUM_WEEKS = 12;
const SVG_W = 300;
const SVG_H = 56;
const BAR_GAP = 4;
const PAD_TOP = 6;
const PAD_BOT = 4;

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekMonday(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return localDateStr(d);
}

export default function WeeklyBarChart({ sessions }: { sessions: WorkoutSession[] }) {
  // Build last NUM_WEEKS week-start dates (Mon), oldest first
  const today = new Date();
  const weekStarts: string[] = [];
  for (let i = NUM_WEEKS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    weekStarts.push(weekMonday(d));
  }

  // Count sessions per week
  const countMap = new Map<string, number>();
  for (const s of sessions) {
    const wk = weekMonday(new Date(s.date));
    if (weekStarts.includes(wk)) {
      countMap.set(wk, (countMap.get(wk) ?? 0) + 1);
    }
  }

  const counts = weekStarts.map((wk) => countMap.get(wk) ?? 0);
  const maxCount = Math.max(...counts, 1);
  const currentWeek = weekMonday(today);

  const barW = (SVG_W - (NUM_WEEKS - 1) * BAR_GAP) / NUM_WEEKS;
  const maxBarH = SVG_H - PAD_TOP - PAD_BOT;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
        Weekly
      </p>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        {weekStarts.map((wk, i) => {
          const count = counts[i];
          const barH = count === 0 ? 2 : Math.max(4, (count / maxCount) * maxBarH);
          const x = i * (barW + BAR_GAP);
          const y = SVG_H - PAD_BOT - barH;
          const isCurrentWeek = wk === currentWeek;
          const fill = count === 0
            ? "#1c1c1c"
            : isCurrentWeek
            ? "#6366f1"
            : "#404040";

          return (
            <rect
              key={wk}
              x={x.toFixed(1)}
              y={y.toFixed(1)}
              width={barW.toFixed(1)}
              height={barH.toFixed(1)}
              rx="2"
              fill={fill}
              opacity={count === 0 ? 0.6 : 1}
            />
          );
        })}
      </svg>

      {/* Minimal x-axis hint */}
      <div className="flex justify-between px-0.5">
        <span className="text-[9px] text-neutral-700">
          {new Date(weekStarts[0]).toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-[9px] text-neutral-700">now</span>
      </div>
    </div>
  );
}
