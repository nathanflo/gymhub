"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSessions } from "@/lib/sessions";
import { getBodyweightEntries } from "@/lib/bodyweight";
import { getWellnessForDate } from "@/lib/wellness";
import { WorkoutSession } from "@/types/session";
import { BodyweightEntry } from "@/types/bodyweight";
import { WellnessEntry } from "@/types/wellness";

const today = new Date().toISOString().slice(0, 10);

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

function wellnessSummary(entry: WellnessEntry): string {
  const parts: string[] = [];
  if (entry.sleep != null) parts.push(`💤 ${entry.sleep}h`);
  if (entry.hydration != null) parts.push(`💧 ${entry.hydration}L`);
  if (entry.caffeine != null) parts.push(`☕ ${entry.caffeine}`);
  if (entry.mood != null) parts.push(`Mood ${entry.mood}/5`);
  if (entry.soreness != null) parts.push(`Soreness ${entry.soreness}/5`);
  return parts.join(" · ");
}

function SessionRow({ session }: { session: WorkoutSession }) {
  const isRun = session.workoutType === "Run";
  const summary = isRun
    ? `${session.distance ?? "—"} km · ${session.duration ?? "—"}`
    : session.exercises.slice(0, 2).map(e => e.name).join(", ")
        + (session.exercises.length > 2 ? ` +${session.exercises.length - 2}` : "");

  return (
    <Link
      href={`/edit/${session.id}`}
      className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3
                 active:scale-95 transition-all"
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{session.title}</span>
        <span className="text-xs text-neutral-400">{summary}</span>
      </div>
      <p className="text-xs text-neutral-600">{session.workoutType}</p>
    </Link>
  );
}

export default function HomePage() {
  const [greetingIdx] = useState(() => Math.floor(Math.random() * 3));
  const [todaySession, setTodaySession] = useState<WorkoutSession | undefined>(undefined);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [lastSession, setLastSession] = useState<WorkoutSession | undefined>(undefined);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [todayBw, setTodayBw] = useState<BodyweightEntry | undefined>(undefined);
  const [todayWellness, setTodayWellness] = useState<WellnessEntry | undefined>(undefined);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      const [sessions, bwEntries, todayWellness, profileResult] = await Promise.all([
        getSessions(),
        getBodyweightEntries(),
        getWellnessForDate(today),
        user
          ? supabase.from("profiles").select("name").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setLastSession(sessions[0]);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      setWeeklyCount(sessions.filter(s => s.date.slice(0, 10) >= sevenDaysAgo).length);
      setTodaySession(sessions.find(s => s.date.slice(0, 10) === today));
      setRecentSessions(sessions.slice(0, 2));
      setTodayBw(bwEntries.find(e => e.date.slice(0, 10) === today));
      setTodayWellness(todayWellness);
      if (profileResult?.data?.name) setUserName(profileResult.data.name);
    }
    load();
  }, []);

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const greetings = userName
    ? [
        `Ready to train, ${userName}?`,
        `Let's get after it, ${userName}`,
        `Back at it, ${userName}`,
      ]
    : ["Ready to train?", "Let's go.", "Time to work."];
  const greeting = greetings[greetingIdx];

  return (
    <main className="px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
          Today · {dateLabel}
        </p>
        <h1 className="text-2xl font-bold text-white">{greeting}</h1>

        {/* Last session context */}
        <p className="text-sm text-neutral-400 mt-2">
          {lastSession
            ? `Last session: ${lastSession.title} · ${daysAgo(lastSession.date)}`
            : "No workouts logged yet — start your first session"}
        </p>

        {/* Weekly count */}
        {weeklyCount > 0 && (
          <p className="text-xs text-neutral-500 mt-0.5">
            You&apos;ve trained {weeklyCount} time{weeklyCount !== 1 ? "s" : ""} this week
          </p>
        )}
      </div>

      {/* Primary CTA */}
      <Link
        href={todaySession ? `/edit/${todaySession.id}` : "/log"}
        className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                   transition-all py-5 text-lg font-semibold text-white text-center shadow-lg"
      >
        {todaySession ? "Continue Workout" : "Start Workout"}
      </Link>

      {/* Quick Actions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="flex gap-3">
          <Link
            href="/templates"
            className="flex-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                       transition-all py-3 text-sm text-white text-center font-medium"
          >
            Start from Template
          </Link>
          <Link
            href="/wellness"
            className="flex-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                       transition-all py-3 text-sm text-white text-center font-medium"
          >
            Log Wellness
          </Link>
        </div>
      </section>

      {/* Today Snapshot */}
      {(todayBw || todayWellness) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Today
          </h2>
          <div className="rounded-xl bg-neutral-800 px-4 py-3 flex flex-col gap-1.5">
            {todayBw && (
              <div className="flex justify-between">
                <span className="text-xs text-neutral-500">Bodyweight</span>
                <span className="text-sm font-semibold text-white">{todayBw.weight} kg</span>
              </div>
            )}
            {todayWellness && (
              <div className="flex justify-between">
                <span className="text-xs text-neutral-500">Wellness</span>
                <span className="text-xs text-neutral-400">{wellnessSummary(todayWellness)}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Recent
          </h2>
          <div className="flex flex-col gap-2">
            {recentSessions.map(s => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Version stamp */}
      <p className="text-xs text-neutral-600">v1.2 – workout summaries</p>
    </main>
  );
}
