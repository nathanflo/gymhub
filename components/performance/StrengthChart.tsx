"use client";

import { StrengthSeries } from "@/lib/performance";

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const W = 300;
const H = 80;
const PAD_Y = 8;

function toSvgPts(
  data: { valueKg: number }[],
  w = W,
  h = H,
  padY = PAD_Y
): [number, number][] {
  if (data.length === 0) return [];
  const vals = data.map((d) => d.valueKg);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  return data.map((d, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function StrengthChart({ series }: { series: StrengthSeries[] }) {
  const primary = series[0] ?? null;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-4">
      <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
        Strength
      </p>

      {primary === null ? (
        <p className="text-sm text-neutral-700 text-center py-8">
          Log 3+ sessions of the same exercise<br />to see your strength curve.
        </p>
      ) : (
        <>
          {/* SVG line chart */}
          {(() => {
            const pts = toSvgPts(primary.points);
            const line = smoothPath(pts);
            const lastPt = pts[pts.length - 1];
            const areaClose = `L ${W} ${H} L 0 ${H} Z`;
            return (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                aria-hidden="true"
                style={{ display: "block", overflow: "visible" }}
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

                {/* Baseline */}
                <line
                  x1="0" y1={H - 1} x2={W} y2={H - 1}
                  stroke="#1c1c1c" strokeWidth="1"
                />

                {/* Area fill */}
                <path d={`${line} ${areaClose}`} fill="url(#sc-grad)" />

                {/* Glow */}
                <path
                  d={line} fill="none"
                  stroke="#6366f1" strokeWidth="5" strokeOpacity="0.12"
                  filter="url(#sc-glow)"
                />

                {/* Line */}
                <path
                  d={line} fill="none"
                  stroke="#6366f1" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"
                />

                {/* Last point */}
                {lastPt && (
                  <>
                    <circle cx={lastPt[0]} cy={lastPt[1]} r="5" fill="#6366f1" opacity="0.15" />
                    <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill="#818cf8" />
                  </>
                )}
              </svg>
            );
          })()}

          {/* Stat row per exercise */}
          <div className="flex flex-col gap-2.5 pt-1 border-t border-neutral-800/70">
            {series.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">{s.name}</span>
                {s.pctChange !== null ? (
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      s.pctChange > 0
                        ? "text-indigo-400"
                        : s.pctChange < 0
                        ? "text-red-400"
                        : "text-neutral-500"
                    }`}
                  >
                    {s.pctChange > 0 ? "+" : ""}
                    {s.pctChange}%
                  </span>
                ) : (
                  <span className="text-sm text-neutral-700">—</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
