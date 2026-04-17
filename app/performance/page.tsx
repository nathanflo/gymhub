"use client";

import { useEffect, useMemo, useState } from "react";
import { getSessions } from "@/lib/sessions";
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [bwEntries, setBwEntries] = useState<BodyweightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("3M");
  const [displayUnit, setDisplayUnit] = useState<"kg" | "lbs">("kg");

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
  }, []);

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

  if (loading) return <LoadingSkeleton />;

  return (
    <main
      className="flex flex-col flex-1 px-6 pt-8 gap-8"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      <div className="animate-[floFormFadeUp_200ms_ease-out_both]">
        <InsightHeader
          headline={heroInsight.headline}
          subtext={heroInsight.subtext ?? undefined}
        />
      </div>

      {/* Range toggle — right-aligned */}
      <div className="flex justify-end -mt-4 animate-[floFormFadeUp_200ms_ease-out_20ms_both]">
        <RangeToggle value={range} onChange={setRange} />
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
  );
}
