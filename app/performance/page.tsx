"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSessions } from "@/lib/sessions";
import { hapticSuccess } from "@/lib/haptics";
import { track } from "@/lib/analytics";
import { getBodyweightEntries } from "@/lib/bodyweight";
import {
  deriveStrengthSeries,
  deriveHeroInsight,
  deriveMonthlyGains,
  deriveRecentPRs,
  derivePatternInsights,
  isoDateStr,
} from "@/lib/performance";
import { WorkoutSession } from "@/types/session";
import { BodyweightEntry } from "@/types/bodyweight";
import InsightHeader from "@/components/performance/InsightHeader";
import StrengthChart from "@/components/performance/StrengthChart";
import BodyweightChart from "@/components/performance/BodyweightChart";
import ConsistencyHeatmap from "@/components/performance/ConsistencyHeatmap";
import WeeklyBarChart from "@/components/performance/WeeklyBarChart";
import RangeToggle, { Range } from "@/components/performance/RangeToggle";
import RecentPRs from "@/components/performance/RecentPRs";
import PatternInsights from "@/components/performance/PatternInsights";
import PerformanceShareCard from "@/components/performance/PerformanceShareCard";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <main
      className="flex flex-col flex-1 px-6 pt-8 gap-8"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      {/* Hero */}
      <div className="flex flex-col gap-2 pb-2">
        <div className="h-2.5 w-20 rounded bg-neutral-800/60 animate-pulse" />
        <div className="h-9 w-56 rounded-lg bg-neutral-800/60 animate-pulse" />
        <div className="h-2.5 w-36 rounded bg-neutral-800/40 animate-pulse" />
      </div>
      {/* Cards */}
      {[96, 80, 72, 64, 56, 48].map((h, i) => (
        <div
          key={i}
          className="rounded-2xl bg-neutral-900/60 border border-neutral-800/50 animate-pulse"
          style={{ height: h }}
        />
      ))}
    </main>
  );
}

// ─── Share icon (upload arrow) ────────────────────────────────────────────────

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [bwEntries, setBwEntries] = useState<BodyweightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("3M");
  const [displayUnit, setDisplayUnit] = useState<"kg" | "lbs">("kg");
  const [showShareModal, setShowShareModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [s, bw] = await Promise.all([getSessions(), getBodyweightEntries()]);
      setSessions(s);
      setBwEntries(bw);
      setLoading(false);
    }
    load();
    const stored = localStorage.getItem("gymhub-workingUnit");
    if (stored === "lbs" || stored === "kg") setDisplayUnit(stored);
    track("performance_opened");
  }, []);

  // Fade-in animation for modal
  useEffect(() => {
    if (showShareModal) {
      requestAnimationFrame(() => setModalVisible(true));
    } else {
      setModalVisible(false);
    }
  }, [showShareModal]);

  // Sessions filtered by range — used by charts only
  const chartSessions = useMemo(() => {
    if (range === "ALL") return sessions;
    const days = range === "30D" ? 30 : range === "3M" ? 90 : 180;
    const cutoff = isoDateStr(new Date(Date.now() - days * 86400000));
    return sessions.filter((s) => s.date.slice(0, 10) >= cutoff);
  }, [sessions, range]);

  // Strength series reacts to range
  const strengthSeries = useMemo(
    () => deriveStrengthSeries(chartSessions),
    [chartSessions]
  );

  // Hero insight + monthly gains always use full session history
  const monthlyGains = useMemo(
    () => deriveMonthlyGains(sessions),
    [sessions]
  );
  const heroInsight = useMemo(
    () => deriveHeroInsight(sessions, bwEntries, strengthSeries, monthlyGains),
    [sessions, bwEntries, strengthSeries, monthlyGains]
  );
  const recentPRs = useMemo(() => deriveRecentPRs(sessions), [sessions]);
  const patternInsights = useMemo(() => derivePatternInsights(sessions), [sessions]);

  // PR recency filter: only show PR card if PR is from last 5 sessions or last 10 days
  const prForCard = useMemo(() => {
    const pr = recentPRs[0] ?? null;
    if (!pr) return null;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 10);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    const last5Dates = new Set(sessions.slice(0, 5).map((s) => s.date.slice(0, 10)));
    const isRecent = last5Dates.has(pr.date) || pr.date >= cutoffStr;
    return isRecent ? pr : null;
  }, [recentPRs, sessions]);

  // Capture helpers
  async function captureCard(): Promise<string> {
    const { toPng } = await import("html-to-image");
    return toPng(shareCardRef.current!, { pixelRatio: 3 });
  }

  async function handleShare() {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "floform-progress.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Progress — FloForm" });
        hapticSuccess();
        track("share_completed", { context: "performance" });
      } else {
        triggerDownload(dataUrl);
      }
    } finally {
      setIsCapturing(false);
    }
  }

  async function handleSave() {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard();
      triggerDownload(dataUrl);
    } finally {
      setIsCapturing(false);
    }
  }

  function triggerDownload(dataUrl: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "floform-progress.png";
    a.click();
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <>
      <main
        className="flex flex-col flex-1 px-6 pt-8 gap-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        {/* Hero row with share button */}
        <div className="flex items-start justify-between gap-4 animate-[floFormFadeUp_200ms_ease-out_both]">
          <div className="flex-1">
            <InsightHeader
              headline={heroInsight.headline}
              subtext={heroInsight.subtext ?? undefined}
            />
          </div>
          <button
            onClick={() => { setShowShareModal(true); track("share_opened", { context: "performance" }); }}
            aria-label="Share performance"
            className="mt-1 p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <ShareIcon />
          </button>
        </div>

        {/* Range toggle — right-aligned */}
        <div className="flex justify-end -mt-4 animate-[floFormFadeUp_200ms_ease-out_20ms_both]">
          <RangeToggle value={range} onChange={(r) => { setRange(r); track("performance_range_changed", { range: r }); }} />
        </div>

        <div className="animate-[floFormFadeUp_200ms_ease-out_40ms_both]">
          <StrengthChart series={strengthSeries} unit={displayUnit} />
        </div>

        <div className="animate-[floFormFadeUp_200ms_ease-out_80ms_both]">
          <BodyweightChart entries={bwEntries} unit={displayUnit} />
        </div>

        <div className="animate-[floFormFadeUp_200ms_ease-out_120ms_both]">
          <ConsistencyHeatmap sessions={chartSessions} />
        </div>

        <div className="animate-[floFormFadeUp_200ms_ease-out_160ms_both]">
          <WeeklyBarChart sessions={chartSessions} />
        </div>

        <div className="animate-[floFormFadeUp_200ms_ease-out_200ms_both]">
          <RecentPRs prs={recentPRs} unit={displayUnit} />
        </div>

        <div className="animate-[floFormFadeUp_200ms_ease-out_240ms_both]">
          <PatternInsights insights={patternInsights} />
        </div>
      </main>

      {/* Share modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            opacity: modalVisible ? 1 : 0,
            transform: modalVisible ? "scale(1)" : "scale(0.97)",
            transition: "opacity 180ms ease, transform 180ms ease",
          }}
          onClick={() => !isCapturing && setShowShareModal(false)}
        >
          {/* Close row */}
          <div className="flex justify-end px-5 py-4">
            <button
              onClick={() => setShowShareModal(false)}
              className="text-neutral-500 hover:text-neutral-300 transition-colors text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Card preview */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ transform: "scale(0.82)", transformOrigin: "center center" }}>
              <PerformanceShareCard
                ref={shareCardRef}
                insight={heroInsight}
                series={strengthSeries}
                recentPR={prForCard}
                unit={displayUnit}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div
            className="flex flex-col gap-3 px-6 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleShare}
              disabled={isCapturing}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
            >
              {isCapturing ? "Preparing…" : "Share"}
            </button>
            <button
              onClick={handleSave}
              disabled={isCapturing}
              className="w-full py-4 rounded-2xl bg-neutral-800 text-neutral-300 font-medium text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
            >
              Save Image
            </button>
          </div>
        </div>
      )}
    </>
  );
}
