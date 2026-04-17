"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { getSessions } from "@/lib/sessions";
import { WorkoutSession } from "@/types/session";
import { resolveKg, fmtW } from "@/lib/units";

// ─── Types ────────────────────────────────────────────────────────────────────

type SetRecord = {
  weightKg: number;
  reps: number | null;
};

type SessionEntry = {
  date: string;           // YYYY-MM-DD
  topSet: SetRecord;      // best working set by weight
};

// ─── SVG helpers (single-series drilldown chart) ──────────────────────────────

const W = 300;
const H = 100;
const PAD_Y = 10;
const PAD_LEFT = 32;

function toSvgPts(data: number[]): [number, number][] {
  if (data.length === 0) return [];
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const usableW = W - PAD_LEFT;
  return data.map((v, i) => {
    const x = PAD_LEFT + (data.length === 1 ? usableW / 2 : (i / (data.length - 1)) * usableW);
    const y = H - PAD_Y - ((v - minV) / range) * (H - 2 * PAD_Y);
    return [x, y];
  });
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx.toFixed(1)} ${y0.toFixed(1)} ${cpx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

function yFor(v: number, minV: number, maxV: number): number {
  const range = maxV - minV || 1;
  return H - PAD_Y - ((v - minV) / range) * (H - 2 * PAD_Y);
}

// ─── Drilldown chart ──────────────────────────────────────────────────────────

function DrilldownChart({
  points,
  unit,
}: {
  points: { date: string; valueKg: number }[];
  unit: "kg" | "lbs";
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) return null;

  const vals = points.map((p) => p.valueKg);
  const pts = toSvgPts(vals);
  const line = smoothPath(pts);
  const lastPt = pts[pts.length - 1];
  const areaClose = `L ${W} ${H} L ${PAD_LEFT} ${H} Z`;
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const midV = (minV + maxV) / 2;
  const activePt = activeIdx !== null ? pts[activeIdx] : null;
  const activePoint = activeIdx !== null ? points[activeIdx] : null;
  const tooltipLeft = activePt ? `${((activePt[0] / W) * 100).toFixed(1)}%` : "50%";

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const nearest = pts.reduce(
      (best, _, i) =>
        Math.abs(pts[i][0] - svgX) < Math.abs(pts[best][0] - svgX) ? i : best,
      0
    );
    setActiveIdx(nearest);
  }

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      <div className="relative" style={{ paddingTop: activePt ? 48 : 0, transition: "padding-top 120ms ease" }}>
        {/* Tooltip */}
        {activePt && activePoint && (
          <div
            className="absolute pointer-events-none z-10 rounded-lg bg-neutral-800 border border-neutral-700/60 px-2.5 py-1.5 text-center"
            style={{ left: tooltipLeft, top: 0, transform: "translateX(-50%)" }}
          >
            <p className="text-xs font-semibold text-white">
              {fmtW(activePoint.valueKg, unit)}
            </p>
            <p className="text-[9px] text-neutral-500">
              {new Date(activePoint.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          aria-hidden="true"
          style={{ display: "block", overflow: "visible", touchAction: "none" }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIdx(null)}
        >
          <defs>
            <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <filter id="dd-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
            </filter>
          </defs>

          {/* Y-axis labels */}
          <text x="2" y={yFor(maxV, minV, maxV) + 3} fontSize="8" fill="#3f3f3f" dominantBaseline="auto">
            {fmtW(maxV, unit)}
          </text>
          <text x="2" y={yFor(midV, minV, maxV) + 3} fontSize="8" fill="#3f3f3f" dominantBaseline="middle">
            {fmtW(midV, unit)}
          </text>
          <text x="2" y={yFor(minV, minV, maxV) - 2} fontSize="8" fill="#3f3f3f" dominantBaseline="auto">
            {fmtW(minV, unit)}
          </text>

          {/* Baseline */}
          <line x1={PAD_LEFT} y1={H - 1} x2={W} y2={H - 1} stroke="#1c1c1c" strokeWidth="1" />

          {/* Area */}
          <path d={`${line} ${areaClose}`} fill="url(#dd-grad)" />

          {/* Glow */}
          <path d={line} fill="none" stroke="#6366f1" strokeWidth="6" strokeOpacity="0.12" filter="url(#dd-glow)" />

          {/* Line */}
          <path d={line} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Active guide */}
          {activePt && (
            <>
              <line
                x1={activePt[0].toFixed(1)} y1={PAD_Y}
                x2={activePt[0].toFixed(1)} y2={H - 1}
                stroke="#6366f1" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 2"
              />
              <circle cx={activePt[0]} cy={activePt[1]} r="5" fill="#6366f1" opacity="0.2" />
              <circle cx={activePt[0]} cy={activePt[1]} r="3" fill="#818cf8" />
            </>
          )}

          {/* Last point (resting state) */}
          {!activePt && lastPt && (
            <>
              <circle cx={lastPt[0]} cy={lastPt[1]} r="5" fill="#6366f1" opacity="0.15" />
              <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill="#818cf8" />
            </>
          )}
        </svg>
      </div>

      {/* Time anchors */}
      <div className="flex justify-between px-0.5 -mt-2">
        <span className="text-[9px] text-neutral-700">
          {new Date(points[0].date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
        </span>
        <span className="text-[9px] text-neutral-700">Now</span>
      </div>
    </div>
  );
}

// ─── Recent top sets ──────────────────────────────────────────────────────────

function RecentTopSets({
  entries,
  unit,
}: {
  entries: SessionEntry[];
  unit: "kg" | "lbs";
}) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
        Recent top sets
      </p>
      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500 tabular-nums w-16">
              {new Date(entry.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-semibold text-white tabular-nums">
                {fmtW(entry.topSet.weightKg, unit)}
              </span>
              {entry.topSet.reps !== null && (
                <span className="text-xs text-neutral-500">
                  × {entry.topSet.reps}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <main
      className="flex flex-col flex-1 px-6 pt-6 gap-6"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      <div className="h-4 w-8 rounded bg-neutral-800/60 animate-pulse" />
      <div className="flex flex-col gap-2 pt-2">
        <div className="h-2.5 w-16 rounded bg-neutral-800/60 animate-pulse" />
        <div className="h-8 w-48 rounded-lg bg-neutral-800/60 animate-pulse" />
        <div className="h-3 w-28 rounded bg-neutral-800/40 animate-pulse mt-1" />
      </div>
      <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/50 animate-pulse h-36" />
      <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/50 animate-pulse h-48" />
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExerciseDrilldownPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const exerciseKey = slug.replace(/-/g, " ");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [allTimePR, setAllTimePR] = useState<number | null>(null);
  const [pctChange, setPctChange] = useState<number | null>(null);
  const [points, setPoints] = useState<{ date: string; valueKg: number }[]>([]);
  const [recentEntries, setRecentEntries] = useState<SessionEntry[]>([]);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");

  useEffect(() => {
    const stored = localStorage.getItem("gymhub-workingUnit");
    if (stored === "lbs" || stored === "kg") setUnit(stored);

    async function load() {
      const sessions = await getSessions();

      // Find matching sessions (case-insensitive slug match)
      const matching: WorkoutSession[] = [];
      let foundDisplayName = "";

      for (const session of sessions) {
        for (const ex of session.exercises) {
          const normalized = ex.name.trim().toLowerCase().replace(/\s+/g, " ");
          if (normalized === exerciseKey) {
            if (!foundDisplayName) foundDisplayName = ex.name.trim();
            matching.push(session);
            break;
          }
        }
      }

      if (matching.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setDisplayName(foundDisplayName);

      // Build per-session max weight map (oldest → newest)
      const pointMap = new Map<string, number>();

      for (const session of matching) {
        const ex = session.exercises.find(
          (e) => e.name.trim().toLowerCase().replace(/\s+/g, " ") === exerciseKey
        );
        if (!ex) continue;

        let maxKg = 0;
        for (const set of ex.sets) {
          if (set.type === "warmup" || set.weight === undefined) continue;
          const kg = resolveKg(set.weight, ex.unit, ex._canonicalKg);
          if (kg !== null && kg > maxKg) maxKg = kg;
        }
        if (maxKg <= 0) continue;

        const dateKey = session.date.slice(0, 10);
        const existing = pointMap.get(dateKey);
        if (existing === undefined || maxKg > existing) pointMap.set(dateKey, maxKg);
      }

      const derivedPoints = [...pointMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, valueKg]) => ({ date, valueKg }));

      setPoints(derivedPoints);

      const pr = derivedPoints.length > 0
        ? Math.max(...derivedPoints.map((p) => p.valueKg))
        : null;
      setAllTimePR(pr);

      if (derivedPoints.length >= 2) {
        const first = derivedPoints[0].valueKg;
        const last = derivedPoints[derivedPoints.length - 1].valueKg;
        setPctChange(Math.round(((last - first) / first) * 100));
      }

      // Recent top sets — newest 8 sessions, each showing best working set
      const newestFirst = [...matching].sort((a, b) => b.date.localeCompare(a.date));
      const entries: SessionEntry[] = [];

      for (const session of newestFirst.slice(0, 8)) {
        const ex = session.exercises.find(
          (e) => e.name.trim().toLowerCase().replace(/\s+/g, " ") === exerciseKey
        );
        if (!ex) continue;

        let best: SetRecord | null = null;
        for (const set of ex.sets) {
          if (set.type === "warmup" || set.weight === undefined) continue;
          const kg = resolveKg(set.weight, ex.unit, ex._canonicalKg);
          if (kg === null) continue;
          if (!best || kg > best.weightKg) {
            best = { weightKg: kg, reps: set.reps ?? null };
          }
        }
        if (best) {
          entries.push({ date: session.date.slice(0, 10), topSet: best });
        }
      }

      setRecentEntries(entries);
      setLoading(false);
    }

    load();
  }, [exerciseKey]);

  if (loading) return <Skeleton />;

  if (notFound) {
    return (
      <main
        className="flex flex-col flex-1 px-6 pt-8 gap-6"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <Link
          href="/performance"
          className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          ← Performance
        </Link>
        <p className="text-sm text-neutral-600 pt-8 text-center">
          No data found for this exercise.
        </p>
      </main>
    );
  }

  return (
    <main
      className="flex flex-col flex-1 px-6 pt-6 gap-8"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      {/* Back */}
      <Link
        href="/performance"
        className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors animate-[floFormFadeUp_150ms_ease-out_both]"
      >
        ← Performance
      </Link>

      {/* Hero */}
      <div className="flex flex-col gap-1.5 animate-[floFormFadeUp_200ms_ease-out_both]">
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
          Exercise
        </p>
        <h1 className="text-3xl font-bold text-white leading-tight">{displayName}</h1>
        {allTimePR !== null && (
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-sm text-neutral-500">All-time best</span>
            <span className="text-lg font-semibold text-white tabular-nums">
              {fmtW(allTimePR, unit)}
            </span>
            {pctChange !== null && pctChange !== 0 && (
              <span
                className={`text-sm font-semibold tabular-nums ${
                  pctChange > 0 ? "text-indigo-400" : "text-red-400"
                }`}
              >
                {pctChange > 0 ? "+" : ""}
                {pctChange}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* History chart */}
      <div className="animate-[floFormFadeUp_200ms_ease-out_40ms_both]">
        <DrilldownChart points={points} unit={unit} />
      </div>

      {/* Recent top sets */}
      <div className="animate-[floFormFadeUp_200ms_ease-out_80ms_both]">
        <RecentTopSets entries={recentEntries} unit={unit} />
      </div>
    </main>
  );
}
