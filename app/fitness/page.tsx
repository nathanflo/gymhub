"use client";

import Link from "next/link";

const subPages = [
  { href: "/workouts", label: "History", subtitle: "Browse past sessions" },
  { href: "/progress", label: "Progress", subtitle: "Bodyweight & personal records" },
  { href: "/templates", label: "Templates", subtitle: "Saved workout templates" },
];

export default function FitnessPage() {
  return (
    <main className="px-6 py-8 flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
          Fitness
        </p>
        <h1 className="text-2xl font-bold text-white">Your Training</h1>
      </div>

      <Link
        href="/log"
        className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                   transition-all py-5 text-lg font-semibold text-white text-center shadow-lg"
      >
        + Log Workout
      </Link>

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
