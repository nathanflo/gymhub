"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSessions } from "@/lib/sessions";
import { getBodyweightEntries } from "@/lib/bodyweight";
import { getWellnessForDate } from "@/lib/wellness";
import { relativeDay } from "@/lib/dates";
import { WorkoutSession } from "@/types/session";
import { computeHomeMomentum, capitalize } from "@/lib/messaging";
import { parseLocation, formatLocationLabel } from "@/lib/location";
import { getWeatherGuidance } from "@/lib/weatherGuidance";

// In-memory cache for legacy city-name → coordinates lookups.
// Prevents re-geocoding on every navigation for users without stored lat/lon.
const legacyGeoCache = new Map<string, { lat: number; lon: number }>();
import { getActiveProgram, getCurrentWorkoutInfo, ActiveProgram, PROGRAMS, getCustomPrograms } from "@/lib/programs";
import { RECOMMENDED_TEMPLATES } from "@/lib/recommendedTemplates";
import { BodyweightEntry } from "@/types/bodyweight";
import { WellnessEntry } from "@/types/wellness";

const today = new Date().toISOString().slice(0, 10);
const ANNIVERSARY_DATE = "2026-03-25";
const isAnniversaryDay = today === ANNIVERSARY_DATE;

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


function SessionRow({ session }: { session: WorkoutSession }) {
  const isRun = session.workoutType === "Run";
  const isYoga = session.workoutType === "Yoga";
  const summary = isRun
    ? `${session.distance ?? "—"} km · ${session.duration ?? "—"}`
    : isYoga
    ? `${session.yogaStyle === "Custom" ? (session.yogaCustomStyle || "Custom") : (session.yogaStyle ?? "Yoga")} · ${session.yogaDurationMinutes ? `${session.yogaDurationMinutes} min` : "—"}`
    : session.exercises.slice(0, 2).map(e => e.name).join(", ")
        + (session.exercises.length > 2 ? ` +${session.exercises.length - 2}` : "");

  return (
    <Link
      href={`/edit/${session.id}`}
      className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3
                 active:scale-[0.98] active:brightness-110 transition-all duration-75 ease-out"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-neutral-300">{session.title}</span>
        <span className="text-xs text-neutral-500">{summary}</span>
      </div>
      <span className="text-[10px] font-medium text-neutral-500 bg-neutral-700/50 rounded px-1.5 py-0.5">
        {session.workoutType}
      </span>
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
  const [savedLat, setSavedLat] = useState<number | null>(null);
  const [savedLon, setSavedLon] = useState<number | null>(null);
  const [weather, setWeather] = useState<{ temp: number; label: string } | null>(null);
  const [insight, setInsight] = useState<string>("Ready when you are");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [activeProgram, setActiveProgramState] = useState<ActiveProgram | null>(null);
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

  // Sync active program on mount and whenever the page becomes visible again
  useEffect(() => {
    function sync() { setActiveProgramState(getActiveProgram()); }
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
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
      const momentum = computeHomeMomentum(sessions);
      const now = new Date();
      const dailySeed =
        now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate() + sessions.length;
      const sanitizedName = profileName
        ? profileName.trim().charAt(0).toUpperCase() + profileName.trim().slice(1)
        : null;
      const includeName = !!sanitizedName && dailySeed % 2 === 0;
      setGreeting(capitalize(momentum.title) + (includeName ? `, ${sanitizedName}` : ""));
      setInsight(momentum.subtitle ?? "");
      if (isAnniversaryDay) {
        setGreeting("Happy one week, FloForm!!");
        setInsight("thanks for being here early :)");
      }
      setRecentSessions(sessions.slice(0, 2));
      setTodayBw(bwEntries.find(e => e.date.slice(0, 10) === today));
      setTodayWellness(todayWellness);
      if (profileResult?.data?.city) {
        const loc = parseLocation(profileResult.data.city);
        if (loc.label) setCity(formatLocationLabel(loc.label));
        if (loc.lat !== null) setSavedLat(loc.lat);
        if (loc.lon !== null) setSavedLon(loc.lon);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!city) return;
    setWeather(null);
    let cancelled = false;
    async function fetchWeather() {
      try {
        let lat = savedLat;
        let lon = savedLon;

        if (lat === null || lon === null) {
          // Legacy path: geocode by city name string
          const cached = legacyGeoCache.get(city!);
          if (cached) {
            lat = cached.lat;
            lon = cached.lon;
          } else {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city!)}&count=1&language=en&format=json`
            );
            const geoData = await geoRes.json();
            const loc = geoData?.results?.[0];
            if (!loc || cancelled) return;
            const resolvedLat: number = loc.latitude;
            const resolvedLon: number = loc.longitude;
            lat = resolvedLat;
            lon = resolvedLon;
            legacyGeoCache.set(city!, { lat: resolvedLat, lon: resolvedLon });
          }
        }

        if (lat === null || lon === null || cancelled) return;
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&temperature_unit=celsius`
        );
        const wxData = await wxRes.json();
        const temp = wxData?.current?.temperature_2m;
        const code = wxData?.current?.weathercode;
        if (temp == null || code == null || cancelled) return;
        setWeather({ temp: Math.round(temp), label: weatherLabel(code) });
      } catch {
        // silently fail — city label alone will show
      }
    }
    fetchWeather();
    return () => { cancelled = true; };
  }, [city, savedLat, savedLon]);

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

      </main>
    );
  }

  const programWorkoutInfo = activeProgram ? getCurrentWorkoutInfo(activeProgram) : null;

  let programName: string | null = null;
  let programTotal: number | null = null;
  if (activeProgram) {
    if (activeProgram.kind === "starter") {
      const def = PROGRAMS.find(p => p.id === activeProgram.id);
      if (def) {
        programName = def.name + (activeProgram.id === "ARNOLD" && activeProgram.variant === "advanced" ? " (Advanced)" : "");
        programTotal = def.workouts.length;
      }
    } else {
      const custom = getCustomPrograms().find(p => p.id === activeProgram.id);
      if (custom) {
        programName = custom.name;
        programTotal = custom.workouts.length;
      }
    }
  }
  const programDayLabel = programTotal !== null
    ? `Day ${(activeProgram?.currentIndex ?? 0) + 1} of ${programTotal}`
    : null;

  function getProgramSessionUrl(info: { name: string; linkedTemplateId?: string }): string {
    if (info.linkedTemplateId) {
      const isRec = RECOMMENDED_TEMPLATES.some(t => t.id === info.linkedTemplateId);
      return isRec
        ? `/log?rec=${info.linkedTemplateId}&program=1`
        : `/log?template=${info.linkedTemplateId}&program=1`;
    }
    const matchingRec = RECOMMENDED_TEMPLATES.find(t => t.name === info.name);
    if (matchingRec) return `/log?rec=${matchingRec.id}&program=1`;
    return `/log?program=1&programTitle=${encodeURIComponent(info.name)}`;
  }

  return (
    <main className="px-6 pt-6 flex flex-col gap-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {/* Anniversary glow — fixed to viewport top so it covers nav + hero with no gap */}
      {isAnniversaryDay && (
        <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-indigo-400 blur-3xl animate-[floFormGlowPulse_1600ms_ease-out_200ms_both]" />
      )}

      {/* Hero + context card + primary CTA */}
      <div className="flex flex-col gap-4">

        {/* Hero text — fades up when data arrives */}
        <div className={`flex flex-col gap-2 ${greeting ? 'animate-[floFormFadeUp_180ms_ease-out_both]' : 'opacity-0'}`}>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Today · {dateLabel}
          </p>
          <h1 className={`text-2xl font-bold ${isAnniversaryDay ? "text-indigo-100" : "text-white"}`}>
            {greeting}
          </h1>
          {insight && (
            <p className="text-sm text-indigo-300/90">{insight}</p>
          )}
        </div>

        {/* Today context card — weather, guidance, last session */}
        {(city || lastSession || weeklyCount > 0) && (
          <div className="rounded-2xl bg-neutral-800/50 border border-neutral-700/40 px-4 py-4 flex flex-col gap-2">
            {city && (
              <p className="text-xs text-neutral-400">
                {city}{weather ? ` · ${weather.temp}°C · ${weather.label}` : ""}
              </p>
            )}
            {weather && (() => {
              const guidance = getWeatherGuidance(weather.temp, weather.label);
              return guidance ? (
                <p className="text-xs text-neutral-500 italic mt-0.5 animate-[floFormFadeIn_500ms_ease-out_both]">{guidance}</p>
              ) : null;
            })()}
            <p className="text-xs text-neutral-400">
              {lastSession
                ? `Last session: ${lastSession.title} · ${relativeDay(lastSession.date)}`
                : "No sessions logged yet"}
            </p>
            {weeklyCount > 0 && (
              <p className="text-xs text-neutral-500">
                {weeklyCount} session{weeklyCount !== 1 ? "s" : ""} this week
              </p>
            )}
          </div>
        )}

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
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-center text-sm active:scale-[0.96] active:brightness-110 transition-all duration-75 ease-out"
                >
                  Resume
                </Link>
                <Link
                  href="/log"
                  onClick={() => {
                    localStorage.removeItem("activeWorkoutDraft");
                    setActiveDraft(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-neutral-700 text-neutral-300 text-sm text-center active:scale-[0.96] active:brightness-110 transition-all duration-75 ease-out"
                >
                  Start New
                </Link>
              </div>
            </div>
          );
        })() : (
          <Link
            href="/log"
            className={`w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 hover:brightness-105
                       active:scale-[0.96] active:brightness-110
                       transition-all duration-75 ease-out py-5 text-lg font-semibold text-white text-center
                       border border-indigo-400/20 shadow-[0_6px_18px_rgba(99,102,241,0.25)]
                       ${greeting ? 'animate-[floFormFadeUp_200ms_ease-out_80ms_both]' : 'opacity-0'}`}
          >
            Start Session
          </Link>
        )}
      </div>{/* end hero+CTA group */}

      {/* Quick Actions */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="flex gap-3">
          <Link
            href="/templates"
            className="flex-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-[0.96] active:brightness-110
                       transition-all duration-75 ease-out py-2.5 text-sm text-neutral-100 text-center font-medium"
          >
            Start from Template
          </Link>
          <Link
            href="/wellness"
            className="flex-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-[0.96] active:brightness-110
                       transition-all duration-75 ease-out py-2.5 text-sm text-neutral-100 text-center font-medium"
          >
            Log Wellness
          </Link>
        </div>
      </section>

      {/* Program — Today card */}
      {programWorkoutInfo && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Today
          </h2>
          <div className="rounded-xl bg-neutral-800 border border-neutral-700/60 px-4 py-3 flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              {programName && (
                <p className="text-xs text-neutral-500">{programName}</p>
              )}
              {programDayLabel && (
                <p className="text-[11px] text-neutral-600">{programDayLabel}</p>
              )}
              <p className="text-base font-semibold text-white">{programWorkoutInfo.name}</p>
            </div>
            <Link
              href={getProgramSessionUrl(programWorkoutInfo)}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.96] active:brightness-110
                         transition-all duration-75 ease-out py-3 text-sm font-semibold text-white text-center"
            >
              Start Session
            </Link>
          </div>
        </section>
      )}

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

    </main>
  );
}
