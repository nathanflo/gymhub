"use client";

import { useRef, useState } from "react";
import { BodyweightEntry } from "@/types/bodyweight";
import { fmtW } from "@/lib/units";

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const W = 300;
const H = 64;
const PAD_Y = 6;
const PAD_LEFT = 28;

function toSvgPts(data: number[], w = W, h = H, padY = PAD_Y, padLeft = PAD_LEFT): [number, number][] {
  if (data.length === 0) return [];
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const usableW = w - padLeft;
  return data.map((v, i) => {
    const x = padLeft + (data.length === 1 ? usableW / 2 : (i / (data.length - 1)) * usableW);
    const y = h - padY - ((v - minV) / range) * (h - 2 * padY);
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

export default function BodyweightChart({
  entries,
  unit,
}: {
  entries: BodyweightEntry[];
  unit: "kg" | "lbs";
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // entries arrive newest-first — reverse for chart (oldest → newest)
  const sorted = [...entries].reverse();

  const rawDelta =
    sorted.length >= 2
      ? Math.round((sorted[sorted.length - 1].weight - sorted[0].weight) * 10) / 10
      : null;

  // Convert delta to display unit
  const displayDelta = rawDelta === null ? null
    : unit === "lbs"
    ? Math.round((rawDelta / 0.453592) * 10) / 10
    : rawDelta;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || sorted.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const pts = toSvgPts(sorted.map((e) => e.weight));
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

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
          Bodyweight
        </p>
        <div className="flex items-center gap-3">
          {sorted.length >= 2 && (
            <span className="text-[9px] text-neutral-600">past 30 days</span>
          )}
          {displayDelta !== null && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                displayDelta > 0
                  ? "text-neutral-400"
                  : displayDelta < 0
                  ? "text-indigo-400"
                  : "text-neutral-600"
              }`}
            >
              {displayDelta > 0 ? "+" : ""}
              {displayDelta} {unit}
            </span>
          )}
        </div>
      </div>

      {sorted.length < 2 ? (
        <p className="text-sm text-neutral-700 text-center py-6">
          Log bodyweight in a few sessions
          <br />
          to see your trend.
        </p>
      ) : (
        (() => {
          const vals = sorted.map((e) => e.weight);
          const pts = toSvgPts(vals);
          const line = smoothPath(pts);
          const lastPt = pts[pts.length - 1];
          const areaClose = `L ${W} ${H} L ${PAD_LEFT} ${H} Z`;

          const minV = Math.min(...vals);
          const maxV = Math.max(...vals);
          const midV = (minV + maxV) / 2;

          const activePt = activeIdx !== null ? pts[activeIdx] : null;
          const activeEntry = activeIdx !== null ? sorted[activeIdx] : null;
          const tooltipLeft = activePt ? `${((activePt[0] / W) * 100).toFixed(1)}%` : "50%";

          return (
            <>
              <div className="relative" style={{ paddingTop: 44 }}>
                {/* Tooltip */}
                {activePt && activeEntry && (
                  <div
                    className="absolute pointer-events-none z-10 rounded-lg bg-neutral-800 border border-neutral-700/60 px-2.5 py-1.5 text-center"
                    style={{ left: tooltipLeft, top: 0, transform: "translateX(-50%)" }}
                  >
                    <p className="text-xs font-semibold text-white">
                      {fmtW(activeEntry.weight, unit)}
                    </p>
                    <p className="text-[9px] text-neutral-500">
                      {new Date(activeEntry.date).toLocaleDateString("en-US", {
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
                    <linearGradient id="bw-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a3a3a3" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="#a3a3a3" stopOpacity="0" />
                    </linearGradient>
                    <filter id="bw-glow" x="-30%" y="-30%" width="160%" height="160%">
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
                  <path d={`${line} ${areaClose}`} fill="url(#bw-grad)" />

                  {/* Glow */}
                  <path
                    d={line}
                    fill="none"
                    stroke="#a3a3a3"
                    strokeWidth="5"
                    strokeOpacity="0.08"
                    filter="url(#bw-glow)"
                  />

                  {/* Line */}
                  <path
                    d={line}
                    fill="none"
                    stroke="#737373"
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
                        stroke="#737373"
                        strokeWidth="1"
                        strokeOpacity="0.3"
                        strokeDasharray="3 2"
                      />
                      <circle cx={activePt[0]} cy={activePt[1]} r="5" fill="#737373" opacity="0.2" />
                      <circle cx={activePt[0]} cy={activePt[1]} r="3" fill="#a3a3a3" />
                    </>
                  )}

                  {/* Last point (when not touching) */}
                  {!activePt && lastPt && (
                    <>
                      <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill="#737373" opacity="0.15" />
                      <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill="#a3a3a3" />
                    </>
                  )}
                </svg>
              </div>

              {/* Time anchors */}
              <div className="flex justify-between px-0.5 -mt-2">
                <span className="text-[9px] text-neutral-700">Start</span>
                <span className="text-[9px] text-neutral-700">Now</span>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
