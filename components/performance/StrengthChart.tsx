"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { StrengthSeries } from "@/lib/performance";
import { fmtW } from "@/lib/units";

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const W = 300;
const H = 80;
const PAD_Y = 8;
const PAD_LEFT = 28; // room for Y-axis labels

function toSvgPts(
  data: { valueKg: number }[],
  w = W,
  h = H,
  padY = PAD_Y,
  padLeft = PAD_LEFT
): [number, number][] {
  if (data.length === 0) return [];
  const vals = data.map((d) => d.valueKg);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const usableW = w - padLeft;
  return data.map((d, i) => {
    const x = padLeft + (data.length === 1 ? usableW / 2 : (i / (data.length - 1)) * usableW);
    const y = h - padY - ((d.valueKg - minV) / range) * (h - 2 * padY);
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

function yForValue(v: number, minV: number, maxV: number): number {
  const range = maxV - minV || 1;
  return H - PAD_Y - ((v - minV) / range) * (H - 2 * PAD_Y);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StrengthChart({
  series,
  unit,
}: {
  series: StrengthSeries[];
  unit: "kg" | "lbs";
}) {
  const [activeEx, setActiveEx] = useState(0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Clamp active exercise index if series length changes
  const exIdx = Math.min(activeEx, series.length - 1);
  const activeSeries = series[exIdx] ?? null;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || !activeSeries || activeSeries.points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const pts = toSvgPts(activeSeries.points);
    const nearest = pts.reduce(
      (best, _, i) =>
        Math.abs(pts[i][0] - svgX) < Math.abs(pts[best][0] - svgX) ? i : best,
      0
    );
    setActiveIdx(nearest);
  }

  function handlePointerLeave() {
    setActiveIdx(null);
  }

  if (series.length === 0) {
    return (
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
            Strength
          </p>
          <span className="text-[9px] text-neutral-700">max weight</span>
        </div>
        <p className="text-sm text-neutral-700 text-center py-8">
          Log 3+ sessions of the same exercise
          <br />
          to see your strength curve.
        </p>
      </div>
    );
  }

  const pts = toSvgPts(activeSeries.points);
  const line = smoothPath(pts);
  const lastPt = pts[pts.length - 1];
  const areaClose = `L ${W} ${H} L ${PAD_LEFT} ${H} Z`;

  const vals = activeSeries.points.map((p) => p.valueKg);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const midV = (minV + maxV) / 2;

  const activePt = activeIdx !== null ? pts[activeIdx] : null;
  const activeData = activeIdx !== null ? activeSeries.points[activeIdx] : null;
  const tooltipLeft = activePt ? `${((activePt[0] / W) * 100).toFixed(1)}%` : "50%";

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
          Strength
        </p>
        <span className="text-[9px] text-neutral-700">max weight</span>
      </div>

      {/* SVG chart */}
      <div className="relative" style={{ paddingTop: 48 }}>
        {/* Tooltip */}
        {activePt && activeData && (
          <div
            className="absolute pointer-events-none z-10 rounded-lg bg-neutral-800 border border-neutral-700/60 px-2.5 py-1.5 text-center"
            style={{ left: tooltipLeft, top: 0, transform: "translateX(-50%)" }}
          >
            <p className="text-xs font-semibold text-white">
              {fmtW(activeData.valueKg, unit)}
            </p>
            <p className="text-[9px] text-neutral-500">
              {new Date(activeData.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
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
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            <linearGradient id="sc-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <filter id="sc-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
            </filter>
          </defs>

          {/* Y-axis labels */}
          <text x="2" y={yForValue(maxV, minV, maxV) + 3} fontSize="8" fill="#3f3f3f" dominantBaseline="auto">
            {fmtW(maxV, unit)}
          </text>
          <text x="2" y={yForValue(midV, minV, maxV) + 3} fontSize="8" fill="#3f3f3f" dominantBaseline="middle">
            {fmtW(midV, unit)}
          </text>
          <text x="2" y={yForValue(minV, minV, maxV) - 2} fontSize="8" fill="#3f3f3f" dominantBaseline="auto">
            {fmtW(minV, unit)}
          </text>

          {/* Baseline */}
          <line x1={PAD_LEFT} y1={H - 1} x2={W} y2={H - 1} stroke="#1c1c1c" strokeWidth="1" />

          {/* Area fill */}
          <path d={`${line} ${areaClose}`} fill="url(#sc-grad)" />

          {/* Glow */}
          <path
            d={line}
            fill="none"
            stroke="#6366f1"
            strokeWidth="5"
            strokeOpacity="0.12"
            filter="url(#sc-glow)"
          />

          {/* Line */}
          <path
            d={line}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active touch guide + dot */}
          {activePt && (
            <>
              <line
                x1={activePt[0].toFixed(1)}
                y1={PAD_Y}
                x2={activePt[0].toFixed(1)}
                y2={H - 1}
                stroke="#6366f1"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3 2"
              />
              <circle cx={activePt[0]} cy={activePt[1]} r="5" fill="#6366f1" opacity="0.2" />
              <circle cx={activePt[0]} cy={activePt[1]} r="3" fill="#818cf8" />
            </>
          )}

          {/* Last point (when not touching) */}
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
          {new Date(activeSeries.points[0].date).toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          })}
        </span>
        <span className="text-[9px] text-neutral-700">Now</span>
      </div>

      {/* Exercise chips */}
      {series.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {series.slice(0, 3).map((s, i) => (
            <button
              key={s.name}
              onClick={() => { setActiveEx(i); setActiveIdx(null); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                exIdx === i
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {s.name.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </div>
      )}

      {/* Stat rows — tap to drill down into that exercise */}
      <div className="flex flex-col gap-3 pt-1 border-t border-neutral-800/70">
        {series.map((s, idx) => {
          const isPrimary = idx === exIdx;
          const slug = s.name.trim().toLowerCase().replace(/\s+/g, "-");
          return (
            <Link
              key={s.name}
              href={`/performance/exercise/${slug}`}
              className="flex items-center justify-between active:opacity-60 transition-opacity"
            >
              <span className={`text-sm ${isPrimary ? "text-white" : "text-neutral-400"}`}>
                {s.name}
              </span>
              {s.pctChange !== null ? (
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    isPrimary
                      ? s.pctChange > 0
                        ? "text-indigo-400"
                        : s.pctChange < 0
                        ? "text-red-400"
                        : "text-neutral-500"
                      : "text-neutral-500"
                  }`}
                >
                  {s.pctChange > 0 ? "+" : ""}
                  {s.pctChange}%
                </span>
              ) : (
                <span className="text-sm text-neutral-700">—</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
