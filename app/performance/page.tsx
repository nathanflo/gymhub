"use client";

import { useEffect, useMemo, useState } from "react";
import { getSessions } from "@/lib/sessions";
import { getBodyweightEntries } from "@/lib/bodyweight";
import {
  deriveStrengthSeries,
  deriveHeroInsight,
  deriveMonthlyGains,
} from "@/lib/performance";
import { WorkoutSession } from "@/types/session";
import { BodyweightEntry } from "@/types/bodyweight";
import InsightHeader from "@/components/performance/InsightHeader";
import StrengthChart from "@/components/performance/StrengthChart";
import BodyweightChart from "@/components/performance/BodyweightChart";
import ConsistencyHeatmap from "@/components/performance/ConsistencyHeatmap";
import WeeklyBarChart from "@/components/performance/WeeklyBarChart";

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
      {[96, 80, 72, 64].map((h, i) => (
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

  useEffect(() => {
    async function load() {
      const [s, bw] = await Promise.all([getSessions(), getBodyweightEntries()]);
      setSessions(s);
      setBwEntries(bw);
      setLoading(false);
    }
    load();
  }, []);

  const strengthSeries = useMemo(
    () => deriveStrengthSeries(sessions),
    [sessions]
  );
  const monthlyGains = useMemo(
    () => deriveMonthlyGains(sessions),
    [sessions]
  );
  const heroInsight = useMemo(
    () => deriveHeroInsight(sessions, bwEntries, strengthSeries, monthlyGains),
    [sessions, bwEntries, strengthSeries, monthlyGains]
  );

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

      <div className="animate-[floFormFadeUp_200ms_ease-out_40ms_both]">
        <StrengthChart series={strengthSeries} />
      </div>

      <div className="animate-[floFormFadeUp_200ms_ease-out_80ms_both]">
        <BodyweightChart entries={bwEntries} />
      </div>

      <div className="animate-[floFormFadeUp_200ms_ease-out_120ms_both]">
        <ConsistencyHeatmap sessions={sessions} />
      </div>

      <div className="animate-[floFormFadeUp_200ms_ease-out_160ms_both]">
        <WeeklyBarChart sessions={sessions} />
      </div>
    </main>
  );
}
