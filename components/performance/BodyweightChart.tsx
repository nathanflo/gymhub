"use client";

import { BodyweightEntry } from "@/types/bodyweight";

// ─── SVG helpers (same approach as StrengthChart) ─────────────────────────────

const W = 300;
const H = 64;
const PAD_Y = 6;

function toSvgPts(data: number[], w = W, h = H, padY = PAD_Y): [number, number][] {
  if (data.length === 0) return [];
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  return data.map((v, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function BodyweightChart({ entries }: { entries: BodyweightEntry[] }) {
  // entries arrive newest-first — reverse for chart (oldest → newest)
  const sorted = [...entries].reverse();

  const delta =
    sorted.length >= 2
      ? Math.round((sorted[sorted.length - 1].weight - sorted[0].weight) * 10) / 10
      : null;

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
          {delta !== null && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                delta > 0 ? "text-neutral-400" : delta < 0 ? "text-indigo-400" : "text-neutral-600"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta} kg
            </span>
          )}
        </div>
      </div>

      {sorted.length < 2 ? (
        <p className="text-sm text-neutral-700 text-center py-6">
          Log bodyweight in a few sessions<br />to see your trend.
        </p>
      ) : (
        (() => {
          const vals = sorted.map((e) => e.weight);
          const pts = toSvgPts(vals);
          const line = smoothPath(pts);
          const lastPt = pts[pts.length - 1];
          const areaClose = `L ${W} ${H} L 0 ${H} Z`;

          return (
            <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              aria-hidden="true"
              style={{ display: "block", overflow: "visible" }}
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

              {/* Baseline */}
              <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="#1c1c1c" strokeWidth="1" />

              {/* Area fill */}
              <path d={`${line} ${areaClose}`} fill="url(#bw-grad)" />

              {/* Glow */}
              <path
                d={line} fill="none"
                stroke="#a3a3a3" strokeWidth="5" strokeOpacity="0.08"
                filter="url(#bw-glow)"
              />

              {/* Line */}
              <path
                d={line} fill="none"
                stroke="#737373" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
              />

              {/* Last point */}
              {lastPt && (
                <>
                  <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill="#737373" opacity="0.15" />
                  <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill="#a3a3a3" />
                </>
              )}
            </svg>

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
