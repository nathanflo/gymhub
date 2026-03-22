"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSessions } from "@/lib/sessions";
import { getBodyweightEntries } from "@/lib/bodyweight";
import { getWellnessForDate } from "@/lib/wellness";
import { relativeDay } from "@/lib/dates";
import { WorkoutSession } from "@/types/session";
import { BodyweightEntry } from "@/types/bodyweight";
import { WellnessEntry } from "@/types/wellness";

const today = new Date().toISOString().slice(0, 10);

function workoutTimeAgo(isoString: string): string {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  if (code <= 82) return "Showers";
  return "Stormy";
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

function computeMomentumMessage(sessions: WorkoutSession[]): {
  title: string;
  subtitle: string | null;
} {
  if (!sessions || sessions.length === 0) {
    return { title: "Ready when you are", subtitle: null };
  }

  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const toLocal = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Sessions in last 7 days
  const last7 = sessions.filter((s) => {
    const d = toLocal(new Date(s.date));
    const diff = (todayLocal.getTime() - d.getTime()) / 86_400_000;
    return diff >= 0 && diff < 7;
  });

  const sessionsThisWeek = last7.length;

  const activeDays = new Set(
    last7.map((s) => toLocal(new Date(s.date)).toISOString().slice(0, 10))
  ).size;

  const lastSession = sessions[0];
  const lastDate = toLocal(new Date(lastSession.date));
  const diffDays = (todayLocal.getTime() - lastDate.getTime()) / 86_400_000;

  const sameTypeCount = last7.filter(
    (s) => s.workoutType === lastSession.workoutType
  ).length;

  // A. Trained today
  if (diffDays === 0) {
    return { title: "Back again", subtitle: "Building momentum" };
  }

  // B. Trained yesterday
  if (diffDays === 1) {
    return { title: "Picking it up", subtitle: "You trained yesterday" };
  }

  // C. Repeating same workout type this week
  if (sameTypeCount >= 2) {
    return {
      title: "Locked in",
      subtitle: `${sameTypeCount} ${lastSession.workoutType} sessions this week`,
    };
  }

  // D. Very active week
  if (sessionsThisWeek >= 4) {
    return { title: "On a roll", subtitle: `${sessionsThisWeek} sessions this week` };
  }

  // E. Multiple active days
  if (activeDays >= 3) {
    return { title: "Still going", subtitle: `${activeDays} active days this week` };
  }

  // F. Default fallback
  return { title: "Ready when you are", subtitle: null };
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
  const [greeting, setGreeting] = useState<string>("");
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [lastSession, setLastSession] = useState<WorkoutSession | undefined>(undefined);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [todayBw, setTodayBw] = useState<BodyweightEntry | undefined>(undefined);
  const [todayWellness, setTodayWellness] = useState<WellnessEntry | undefined>(undefined);
  const [city, setCity] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ temp: number; label: string } | null>(null);
  const [insight, setInsight] = useState<string>("Ready when you are");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [activeDraft, setActiveDraft] = useState<{ session: { title?: string }; startTime: string; isPaused?: boolean; pausedOffset?: number; pauseStartedAt?: number | null } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("activeWorkoutDraft");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.version === 1 && parsed?.startTime ? parsed : null;
    } catch { return null; }
  });

  // Re-sync on every navigation back to home (guards against Next.js router cache)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("activeWorkoutDraft");
      if (!raw) { setActiveDraft(null); return; }
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && parsed?.startTime) {
        setActiveDraft(parsed);
      } else {
        localStorage.removeItem("activeWorkoutDraft");
        setActiveDraft(null);
      }
    } catch { setActiveDraft(null); }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setSignedIn(!!user);

      const [sessions, bwEntries, todayWellness, profileResult] = await Promise.all([
        getSessions(),
        getBodyweightEntries(),
        getWellnessForDate(today),
        user
          ? supabase.from("profiles").select("name, city").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setLastSession(sessions[0]);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const count = sessions.filter(s => s.date.slice(0, 10) >= sevenDaysAgo).length;
      const profileName = profileResult?.data?.name ?? null;
      setWeeklyCount(count);
      const momentum = computeMomentumMessage(sessions);
      setGreeting(momentum.title + (profileName ? `, ${profileName}` : ""));
      setInsight(momentum.subtitle ?? "");
      setRecentSessions(sessions.slice(0, 2));
      setTodayBw(bwEntries.find(e => e.date.slice(0, 10) === today));
      setTodayWellness(todayWellness);
      if (profileResult?.data?.city) setCity(profileResult.data.city);
    }
    load();
  }, []);

  useEffect(() => {
    if (!city) return;
    setWeather(null);
    let cancelled = false;
    async function fetchWeather() {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city!)}&count=1&language=en&format=json`
        );
        const geoData = await geoRes.json();
        const loc = geoData?.results?.[0];
        if (!loc || cancelled) return;
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weathercode&temperature_unit=celsius`
        );
        const wxData = await wxRes.json();
        const temp = wxData?.current?.temperature_2m;
        const code = wxData?.current?.weathercode;
        if (temp == null || code == null || cancelled) return;
        setWeather({ temp: Math.round(temp), label: weatherLabel(code) });
      } catch {
        // silently fail — city name alone will show
      }
    }
    fetchWeather();
    return () => { cancelled = true; };
  }, [city]);

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (signedIn === null) return null;

  if (signedIn === false) {
    return (
      <main className="px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Train with intention</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Build strength. Track progress. See who you&apos;re becoming.
          </p>
        </div>

        <Link
          href="/login"
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                     transition-all py-5 text-lg font-semibold text-white text-center shadow-lg"
        >
          Start your journey
        </Link>

        <p className="text-xs text-neutral-500 text-center mt-1">
          Takes 10 seconds. Saves everything.
        </p>

        <Link
          href="/log"
          className="w-full rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                     transition-all py-5 text-lg font-semibold text-neutral-300 text-center"
        >
          Continue as Guest
        </Link>

        <p className="text-xs text-neutral-600">FloForm v1.11.0</p>
      </main>
    );
  }

  return (
    <main className="px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
          Today · {dateLabel}
        </p>
        <h1 className="text-xl font-semibold text-white">{greeting}</h1>

        {/* Insight line */}
        {insight && <p className="text-sm text-neutral-400 mt-1">{insight}</p>}

        {/* City + weather — city shows immediately, weather fills in when ready */}
        {city && (
          <p className="text-xs text-neutral-500 mt-1">
            {city}{weather ? ` · ${weather.temp}°C · ${weather.label}` : ""}
          </p>
        )}

        {/* Last session context */}
        <p className="text-sm text-neutral-400 mt-2">
          {lastSession
            ? `Last session: ${lastSession.title} · ${relativeDay(lastSession.date)}`
            : "No workouts logged yet — start your first session"}
        </p>

        {/* Weekly count */}
        {weeklyCount > 0 && (
          <p className="text-xs text-neutral-500 mt-0.5">
            You&apos;ve trained {weeklyCount} time{weeklyCount !== 1 ? "s" : ""} this week
          </p>
        )}
      </div>

      {/* Primary CTA — in-progress card if draft exists, else normal button */}
      {activeDraft ? (() => {
        const homeElapsed = (() => {
          const startMs = new Date(activeDraft.startTime).getTime();
          if (isNaN(startMs)) return 0;
          const base = activeDraft.isPaused && activeDraft.pauseStartedAt
            ? Math.floor((activeDraft.pauseStartedAt - startMs) / 1000)
            : Math.floor((Date.now() - startMs) / 1000);
          return Math.max(0, base - (activeDraft.pausedOffset ?? 0));
        })();
        return (
        <div className="w-full rounded-2xl bg-neutral-800 border border-indigo-500/30 px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${activeDraft.isPaused ? "bg-amber-400/40" : "bg-indigo-400 animate-pulse"}`} />
            <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              {activeDraft.isPaused ? "Workout paused" : "Workout in progress"} · {String(Math.floor(homeElapsed / 60)).padStart(2, "0")}:{String(homeElapsed % 60).padStart(2, "0")}
            </span>
          </div>
          {activeDraft.session?.title && (
            <p className="text-white font-semibold text-base">{activeDraft.session.title}</p>
          )}
          <div className="flex gap-2 mt-1">
            <Link
              href="/log?resume=1"
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-center text-sm active:scale-95 transition-all"
            >
              Resume
            </Link>
            <Link
              href="/log"
              onClick={() => {
                localStorage.removeItem("activeWorkoutDraft");
                setActiveDraft(null);
              }}
              className="flex-1 py-3 rounded-xl bg-neutral-700 text-neutral-300 text-sm text-center active:scale-95 transition-all"
            >
              Start New
            </Link>
          </div>
        </div>
        );
      })() : (
        <Link
          href="/log"
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                     transition-all py-5 text-lg font-semibold text-white text-center shadow-lg"
        >
          Start Workout
        </Link>
      )}

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
      <p className="text-xs text-neutral-600">FloForm v1.11.0</p>
    </main>
  );
}
