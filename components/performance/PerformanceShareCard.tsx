"use client";

import { forwardRef } from "react";
import { InsightData, PREvent, StrengthSeries } from "@/lib/performance";
import { fmtW } from "@/lib/units";

// ─── SparkLine (share-card variant — no axes, thicker line) ───────────────────

const SPARK_W = 280;
const SPARK_H = 64;
const SPARK_PAD_Y = 6;

function toSvgPts(data: number[]): [number, number][] {
  if (data.length === 0) return [];
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  return data.map((v, i) => {
    const x = data.length === 1 ? SPARK_W / 2 : (i / (data.length - 1)) * SPARK_W;
    const y =
      SPARK_H -
      SPARK_PAD_Y -
      ((v - minV) / range) * (SPARK_H - 2 * SPARK_PAD_Y);
    return [x, y];
  });
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1)
    return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
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
        <linearGradient id="psc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area */}
      <path d={`${line} ${areaClose}`} fill="url(#psc-grad)" />
      {/* Line */}
      <path
        d={line}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot — glow + core */}
      {lastPt && (
        <>
          <circle cx={lastPt[0]} cy={lastPt[1]} r="6" fill="#6366f1" opacity="0.18" />
          <circle cx={lastPt[0]} cy={lastPt[1]} r="3.5" fill="#818cf8" />
        </>
      )}
    </svg>
  );
}

// ─── Headline rewrite for share card ─────────────────────────────────────────

/**
 * Converts in-app hero headlines into shorter, human, post-worthy phrasing.
 * Strips technical exercise names and long subtext; keep it punchy.
 */
function shareHeadline(insight: InsightData): string {
  const h = insight.headline;
  // Match leading % change like "+17%" or "-5%"
  const match = h.match(/^([+-]\d+%)/);
  if (match) {
    const pct = match[1];
    if (insight.subtext?.includes("last month")) return `${pct} stronger this month`;
    if (insight.subtext?.includes("all-time") || insight.subtext?.includes("started")) {
      return `${pct} all-time gain`;
    }
    return `${pct} strength gain`;
  }
  // Session-based insights pass through
  return h;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type PerformanceShareCardProps = {
  insight: InsightData;
  series: StrengthSeries[];
  recentPR: PREvent | null;
  unit: "kg" | "lbs";
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/**
 * 360×640 shareable performance card — two variants.
 * All styles inline (no Tailwind) — required for html-to-image capture.
 */
const PerformanceShareCard = forwardRef<HTMLDivElement, PerformanceShareCardProps>(
  ({ insight, series, recentPR, unit }, ref) => {
    const variant = recentPR !== null ? "pr" : "hero";

    const dateLabel = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // ── Shared container ──────────────────────────────────────────────────────
    const containerStyle: React.CSSProperties = {
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
      fontFamily: FONT_STACK,
    };

    // ── Wordmark ──────────────────────────────────────────────────────────────
    const wordmark = (
      <p
        style={{
          color: "#4f46e5",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.28em",
          textTransform: "uppercase" as const,
          margin: 0,
        }}
      >
        FloForm
      </p>
    );

    // ── Date footer ───────────────────────────────────────────────────────────
    const footer = (
      <p
        style={{
          color: "#1f1f1f",
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: "0.06em",
          margin: 0,
        }}
      >
        {dateLabel}
      </p>
    );

    // ── Hero Progress variant ─────────────────────────────────────────────────
    if (variant === "hero") {
      const primarySeries = series.find((s) => s.points.length >= 2) ?? null;
      const headline = shareHeadline(insight);
      const subtext = insight.subtext;

      return (
        <div ref={ref} style={containerStyle}>
          {wordmark}

          {/* Center content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              width: "100%",
              flex: 1,
              justifyContent: "center",
            }}
          >
            {/* Decorative line */}
            <div
              style={{
                width: 28,
                height: 1,
                backgroundColor: "#6366f1",
                opacity: 0.35,
                marginBottom: 20,
              }}
            />

            {/* Headline */}
            <p
              style={{
                color: "#ffffff",
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1.1,
                textAlign: "center",
                margin: 0,
                letterSpacing: "-0.01em",
                wordBreak: "break-word" as const,
                maxWidth: 280,
              }}
            >
              {headline}
            </p>

            {/* Subtext */}
            {subtext && (
              <p
                style={{
                  color: "#3a3a3a",
                  fontSize: 14,
                  fontWeight: 400,
                  textAlign: "center",
                  margin: "12px 0 0",
                }}
              >
                {subtext}
              </p>
            )}

            {/* Sparkline */}
            {primarySeries && (
              <div
                style={{
                  marginTop: 40,
                  width: SPARK_W,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <SparkLine series={primarySeries} />
              </div>
            )}
          </div>

          {footer}
        </div>
      );
    }

    // ── PR Card variant ───────────────────────────────────────────────────────
    const pr = recentPR!;
    const prDate = new Date(pr.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Find matching series for optional sparkline
    const matchedSeries =
      series.find(
        (s) => s.name.toLowerCase() === pr.exerciseName.toLowerCase()
      ) ?? null;
    const showSpark = matchedSeries !== null && matchedSeries.points.length >= 2;

    const weightDisplay = fmtW(pr.valueKg, unit);

    return (
      <div ref={ref} style={containerStyle}>
        {wordmark}

        {/* Center */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
            gap: 0,
            width: "100%",
          }}
        >
          {/* NEW PR overline */}
          <p
            style={{
              color: "#4f46e5",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              margin: 0,
            }}
          >
            NEW PR
          </p>

          {/* Exercise name */}
          <p
            style={{
              color: "#4b5563",
              fontSize: 13,
              fontWeight: 400,
              textAlign: "center",
              margin: "20px 0 0",
              letterSpacing: "0.01em",
            }}
          >
            {pr.exerciseName}
          </p>

          {/* Weight — hero number */}
          <p
            style={{
              color: "#ffffff",
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1,
              textAlign: "center",
              margin: "12px 0 0",
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {weightDisplay}
          </p>

          {/* Reps */}
          {pr.reps !== null && (
            <p
              style={{
                color: "#374151",
                fontSize: 16,
                fontWeight: 400,
                textAlign: "center",
                margin: "10px 0 0",
              }}
            >
              × {pr.reps}
            </p>
          )}

          {/* Optional sparkline */}
          {showSpark && (
            <div style={{ marginTop: 36, width: SPARK_W }}>
              <SparkLine series={matchedSeries!} />
            </div>
          )}
        </div>

        {/* PR date */}
        <p
          style={{
            color: "#1f1f1f",
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          {prDate}
        </p>
      </div>
    );
  }
);

PerformanceShareCard.displayName = "PerformanceShareCard";

export default PerformanceShareCard;
