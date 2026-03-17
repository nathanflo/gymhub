/**
 * Homepage – GymHub landing screen.
 *
 * Future additions:
 * - Quick-stats banner (total sessions this week, last PR, etc.)
 * - Bottom navigation with tabs: Workouts | Wellness | Music | Insights
 * - Greeting based on time of day ("Good morning, Nathan 💪")
 */

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 px-6 py-12 gap-10">
      {/* Brand */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          GymHub
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Your personal fitness OS
        </p>
      </div>

      {/* Primary actions */}
      <div className="flex flex-col w-full gap-4">
        <Link
          href="/log"
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                     transition-all text-center py-5 text-lg font-semibold text-white shadow-lg"
        >
          Log Workout
        </Link>

        <Link
          href="/templates"
          className="w-full rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                     transition-all text-center py-5 text-lg font-semibold text-white shadow-lg"
        >
          Templates
        </Link>

        <Link
          href="/workouts"
          className="w-full rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                     transition-all text-center py-5 text-lg font-semibold text-white shadow-lg"
        >
          View Workouts
        </Link>

        <Link
          href="/progress"
          className="w-full rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95
                     transition-all text-center py-5 text-lg font-semibold text-white shadow-lg"
        >
          Progress
        </Link>
      </div>

      {/* Version stamp – easy to spot during iteration */}
      <p className="text-xs text-neutral-600">v0.4 – templates</p>
    </main>
  );
}
