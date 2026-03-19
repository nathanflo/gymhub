"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const subPages = [
  { href: "/workouts", label: "History", subtitle: "Browse past sessions" },
  { href: "/progress", label: "Progress", subtitle: "Bodyweight & personal records" },
  { href: "/templates", label: "Templates", subtitle: "Saved workout templates" },
];

function workoutTimeAgo(isoString: string): string {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

export default function FitnessPage() {
  const [activeDraft, setActiveDraft] = useState<{ session: { title?: string }; startTime: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("activeWorkoutDraft");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.version === 1 && parsed?.startTime ? parsed : null;
    } catch { return null; }
  });

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

  return (
    <main className="px-6 py-8 flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
          Fitness
        </p>
        <h1 className="text-2xl font-bold text-white">Your Training</h1>
      </div>

      {activeDraft ? (
        <div className="w-full rounded-2xl bg-neutral-800 border border-indigo-500/30 px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Workout in progress</span>
          </div>
          {activeDraft.session.title && (
            <p className="text-white font-semibold text-base">{activeDraft.session.title}</p>
          )}
          <p className="text-xs text-neutral-500">Started {workoutTimeAgo(activeDraft.startTime)}</p>
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
      ) : (
        <Link
          href="/log"
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                     transition-all py-5 text-lg font-semibold text-white text-center shadow-lg"
        >
          Start Workout
        </Link>
      )}

      <div className="flex flex-col gap-3">
        {subPages.map(({ href, label, subtitle }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl bg-neutral-800 px-5 py-4 flex items-center justify-between
                       active:scale-95 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{label}</span>
              <span className="text-xs text-neutral-400">{subtitle}</span>
            </div>
            <span className="text-neutral-500 text-lg leading-none">›</span>
          </Link>
        ))}
      </div>

    </main>
  );
}
