"use client";

/**
 * ShareCard — Fixed 360×640 CSS canvas for share image generation.
 *
 * Captured at pixelRatio 3 → 1080×1920 (Instagram Story / 9:16).
 * All dimensions are inline styles (not Tailwind w/h classes) to guarantee
 * the DOM element is exactly 360×640 regardless of surrounding layout.
 * overflow: hidden ensures no child ever escapes the canvas.
 */

import { forwardRef } from "react";
import { formatVolumeKg } from "@/lib/units";
import { WorkoutSession } from "@/types/session";

interface ShareCardProps {
  session: WorkoutSession;
  isYoga: boolean;
  isRun: boolean;
  headline: string;
  prExercises: string[];
  totalSets: number;
  totalVolume: number;
  exerciseCount: number;
  dateLabel: string;
  workoutDuration: string | null;
  city: string | null;
  effort: { label: string; bgColor: string; color: string };
  yogaStyleLabel?: string;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  (
    {
      session,
      isYoga,
      isRun,
      headline,
      prExercises,
      totalSets,
      totalVolume,
      exerciseCount,
      dateLabel,
      workoutDuration,
      city,
      effort,
      yogaStyleLabel,
    },
    ref
  ) => {
    const dark = !isYoga;

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          height: 640,
          backgroundColor: isYoga ? "#f5f5f4" : "#0a0a0a",
          padding: "47px 27px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* ── GROUP 1 — Header ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Brand */}
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: isYoga ? "#6366f1" : "rgba(129,140,248,0.5)",
              fontWeight: 700,
              margin: 0,
              marginBottom: 16,
            }}
          >
            FloForm
          </p>

          {/* Workout title */}
          <h1
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: isYoga ? "#1e1b4b" : "#ffffff",
              margin: 0,
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            {session.title}
          </h1>

          {/* PR Hero — strength with PRs */}
          {!isRun && !isYoga && prExercises.length > 0 && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <p style={{ fontSize: 30, fontWeight: 900, color: "#ffffff", margin: 0 }}>
                {prExercises.length} PR{prExercises.length === 1 ? "" : "s"}
              </p>
              <p style={{ fontSize: 10, color: "#525252", marginTop: 2, margin: 0 }}>
                new record{prExercises.length === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {/* Volume Hero — strength without PRs */}
          {!isRun && !isYoga && prExercises.length === 0 && totalVolume > 0 && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#d4d4d4", margin: 0 }}>
                {formatVolumeKg(totalVolume)} kg
              </p>
              <p style={{ fontSize: 10, color: "#525252", marginTop: 2 }}>total volume</p>
            </div>
          )}

          {/* Headline (strength/run) or Yoga style line */}
          {isYoga ? (
            <p
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "#4338ca",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {yogaStyleLabel}
              {session.yogaDurationMinutes ? ` · ${session.yogaDurationMinutes} min` : ""}
            </p>
          ) : (
            <p
              style={{
                fontSize: 13,
                fontStyle: "italic",
                color: "#737373",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {headline}
            </p>
          )}

          {/* Date / Duration */}
          <p
            style={{
              fontSize: 11,
              color: isYoga ? "#78716c" : "#737373",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {dateLabel}
            {workoutDuration ? ` · ${workoutDuration}` : ""}
          </p>

          {/* City */}
          {city && (
            <p
              style={{
                fontSize: 11,
                color: isYoga ? "#78716c" : "#737373",
                textAlign: "center",
                marginTop: 3,
              }}
            >
              {city}
            </p>
          )}
        </div>

        {/* ── GROUP 2 — Stats + Energy + Exercises ─────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Stats row */}
          {isYoga ? (
            /* Yoga ratings */
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              {(
                [
                  { label: "Mobility", value: session.yogaMobilityRating },
                  { label: "Flexibility", value: session.yogaFlexibilityRating },
                  { label: "Clarity", value: session.yogaClarityRating },
                ] as { label: string; value: number | undefined }[]
              )
                .filter((r) => r.value !== undefined)
                .map(({ label, value }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#1e1b4b" }}>
                      {value}/5
                    </div>
                    <div style={{ fontSize: 10, color: "#78716c" }}>{label}</div>
                  </div>
                ))}
            </div>
          ) : isRun ? (
            /* Run stats */
            <div style={{ display: "flex", justifyContent: "center" }}>
              {session.distance !== undefined && (
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    borderRight: session.duration ? "1px solid #262626" : "none",
                    padding: "0 12px",
                  }}
                >
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
                    {session.distance}
                  </div>
                  <div style={{ fontSize: 10, color: "#525252" }}>km</div>
                </div>
              )}
              {session.duration && (
                <div style={{ flex: 1, textAlign: "center", padding: "0 12px" }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
                    {session.duration}
                  </div>
                  <div style={{ fontSize: 10, color: "#525252" }}>duration</div>
                </div>
              )}
            </div>
          ) : (
            /* Strength stats — 3 columns, always fully visible */
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: "1px solid #262626",
                  padding: "0 8px",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
                  {totalSets}
                </div>
                <div style={{ fontSize: 10, color: "#525252" }}>sets</div>
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: totalVolume > 0 ? "1px solid #262626" : "none",
                  padding: "0 8px",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
                  {exerciseCount}
                </div>
                <div style={{ fontSize: 10, color: "#525252" }}>exercises</div>
              </div>
              {totalVolume > 0 && (
                <div style={{ flex: 1, textAlign: "center", padding: "0 8px" }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
                    {formatVolumeKg(totalVolume)}
                  </div>
                  <div style={{ fontSize: 10, color: "#525252" }}>kg volume</div>
                </div>
              )}
            </div>
          )}

          {/* Energy pill (strength + run) */}
          {!isYoga && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <span
                className={`${effort.bgColor} ${effort.color}`}
                style={{
                  display: "inline-block",
                  padding: "5px 16px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {effort.label}
              </span>
            </div>
          )}

          {/* Yoga intention */}
          {isYoga && session.yogaIntention && (
            <p
              style={{
                fontSize: 13,
                color: "#6366f1",
                textAlign: "center",
                marginTop: 10,
              }}
            >
              {session.yogaIntention}
            </p>
          )}

          {/* Exercise highlights — top 4 */}
          {!isRun && !isYoga && session.exercises.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                marginTop: 14,
              }}
            >
              {session.exercises.slice(0, 4).map((ex, i) => (
                <p key={i} style={{ fontSize: 12, color: "#d4d4d4", margin: 0 }}>
                  {ex.name}{" "}
                  <span style={{ color: "#525252" }}>({ex.sets.length} sets)</span>
                  {prExercises.some(
                    (p) => p.trim().toLowerCase() === ex.name.trim().toLowerCase()
                  )
                    ? " 🔥"
                    : ""}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ── GROUP 3 — Footer branding ─────────────────────────────────── */}
        <p
          style={{
            fontSize: 10,
            color: isYoga ? "#a8a29e" : "#525252",
            textAlign: "center",
            margin: 0,
          }}
        >
          floform.fit
        </p>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;
