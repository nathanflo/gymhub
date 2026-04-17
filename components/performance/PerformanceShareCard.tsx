"use client";

import { forwardRef } from "react";
import { InsightData, StrengthSeries } from "@/lib/performance";

// ─── SVG spark line (stripped-down, share-ready) ──────────────────────────────

const SPARK_W = 280;
const SPARK_H = 60;
const SPARK_PAD_Y = 6;

function toSvgPts(data: number[]): [number, number][] {
  if (data.length === 0) return [];
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  return data.map((v, i) => {
    const x = data.length === 1 ? SPARK_W / 2 : (i / (data.length - 1)) * SPARK_W;
    const y = SPARK_H - SPARK_PAD_Y - ((v - minV) / range) * (SPARK_H - 2 * SPARK_PAD_Y);
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

function SparkLine({ series }: { series: StrengthSeries }) {
  const vals = series.points.map((p) => p.valueKg);
  if (vals.length < 2) return null;
  const pts = toSvgPts(vals);
  const line = smoothPath(pts);
  const lastPt = pts[pts.length - 1];
  const areaClose = `L ${SPARK_W} ${SPARK_H} L 0 ${SPARK_H} Z`;

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      width={SPARK_W}
      height={SPARK_H}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="ps-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Baseline */}
      <line x1="0" y1={SPARK_H - 1} x2={SPARK_W} y2={SPARK_H - 1} stroke="#1e1e2e" strokeWidth="1" />
      {/* Area */}
      <path d={`${line} ${areaClose}`} fill="url(#ps-grad)" />
      {/* Line */}
      <path d={line} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      {lastPt && (
        <>
          <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill="#6366f1" opacity="0.2" />
          <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill="#818cf8" />
        </>
      )}
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type PerformanceShareCardProps = {
  insight: InsightData;
  series: StrengthSeries[];
};

/**
 * 360×640 shareable performance card.
 * All styles are inline (no Tailwind) — required for html-to-image capture.
 * Use forwardRef to support future toPng() capture.
 */
const PerformanceShareCard = forwardRef<HTMLDivElement, PerformanceShareCardProps>(
  ({ insight, series }, ref) => {
    const primarySeries = series.find((s) => s.points.length >= 2) ?? null;

    // Date label: "Apr 2026"
    const dateLabel = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          height: 640,
          backgroundColor: "#080808",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 40px 48px",
          boxSizing: "border-box",
          overflow: "hidden",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Top: wordmark */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          <p
            style={{
              color: "#6366f1",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            FloForm
          </p>
        </div>

        {/* Center: hero insight */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            width: "100%",
            flex: 1,
            justifyContent: "center",
            paddingBottom: primarySeries ? 16 : 0,
          }}
        >
          {/* Decorative top line */}
          <div
            style={{
              width: 24,
              height: 1,
              backgroundColor: "#6366f1",
              opacity: 0.4,
              marginBottom: 8,
            }}
          />

          <p
            style={{
              color: "#ffffff",
              fontSize: 42,
              fontWeight: 800,
              lineHeight: 1.1,
              textAlign: "center",
              margin: 0,
              letterSpacing: "-0.01em",
              wordBreak: "break-word",
              maxWidth: 280,
            }}
          >
            {insight.headline}
          </p>

          {insight.subtext && (
            <p
              style={{
                color: "#525252",
                fontSize: 14,
                fontWeight: 400,
                textAlign: "center",
                margin: 0,
                letterSpacing: "0.01em",
              }}
            >
              {insight.subtext}
            </p>
          )}
        </div>

        {/* Chart — conditionally rendered */}
        {primarySeries && (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {/* Subtle section label */}
            <p
              style={{
                color: "#2a2a2a",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                margin: 0,
                alignSelf: "flex-start",
              }}
            >
              {primarySeries.name}
            </p>
            <SparkLine series={primarySeries} />
          </div>
        )}

        {/* Bottom: date */}
        <p
          style={{
            color: "#2a2a2a",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          {dateLabel}
        </p>
      </div>
    );
  }
);

PerformanceShareCard.displayName = "PerformanceShareCard";

export default PerformanceShareCard;
