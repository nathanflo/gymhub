import { WorkoutSession } from "@/types/session";

export type Milestone = {
  id: string;
  title: string;
  subtitle?: string;
} | null;

const STORAGE_KEY = "gymhub-seen-milestones";

export function getSeenMilestones(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markMilestoneSeen(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getSeenMilestones();
    existing.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing]));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/** Count consecutive days with at least one session, ending at the most recent session date. */
function computeStreakDays(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => s.date.slice(0, 10)));
  const mostRecent = sessions[0].date.slice(0, 10); // sessions sorted desc
  let streak = 0;
  let cursor = new Date(mostRecent);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Count sessions in the current Mon–Sun calendar week. */
function computeWeekCount(sessions: WorkoutSession[]): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, …
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEndDate.toISOString().slice(0, 10);
  return sessions.filter((s) => {
    const d = s.date.slice(0, 10);
    return d >= weekStartStr && d <= weekEndStr;
  }).length;
}

/**
 * Return the highest-priority unseen milestone the user currently qualifies for.
 *
 * Priority: streak → weekly → return → session count.
 *
 * Session-count milestones use exact equality (sessions.length === N) so the
 * card only appears at the exact moment the threshold is reached.
 *
 * Return milestone fires when the most recent session is today and the gap
 * from the previous session is ≥ 5 days. ID is date-scoped so a future
 * return event produces a fresh unseen ID.
 */
export function computeMilestone(
  sessions: WorkoutSession[],
  seenIds: Set<string>
): Milestone {
  const total = sessions.length;
  if (total === 0) return null;

  const streak = computeStreakDays(sessions);
  const weekCount = computeWeekCount(sessions);

  // ── 1. Streak milestones ─────────────────────────────────────────────────
  const streakMilestones: Array<[number, string]> = [
    [14, "14-day consistency"],
    [7,  "7-day consistency"],
    [3,  "3-day consistency"],
  ];
  for (const [threshold, title] of streakMilestones) {
    if (streak >= threshold) {
      const id = `streak-${threshold}`;
      if (!seenIds.has(id)) return { id, title };
    }
  }

  // ── 2. Weekly milestones ─────────────────────────────────────────────────
  const weeklyMilestones: Array<[number, string]> = [
    [5, "5 this week"],
    [3, "3 this week"],
  ];
  for (const [threshold, title] of weeklyMilestones) {
    if (weekCount >= threshold) {
      const id = `week-${threshold}`;
      if (!seenIds.has(id)) return { id, title };
    }
  }

  // ── 3. Return milestone ──────────────────────────────────────────────────
  if (total >= 2) {
    const today = new Date().toISOString().slice(0, 10);
    const mostRecentDate = sessions[0].date.slice(0, 10);
    if (mostRecentDate === today) {
      const gapDays = Math.round(
        (new Date(sessions[0].date).getTime() - new Date(sessions[1].date).getTime()) /
        86400000
      );
      if (gapDays >= 5) {
        const id = `return-${today}`;
        if (!seenIds.has(id)) return { id, title: "Back again" };
      }
    }
  }

  // ── 4. Session count milestones (exact match only — recency rule) ────────
  const sessionMilestones: Array<[number, string]> = [
    [50, "50 sessions"],
    [25, "25 sessions"],
    [10, "10 sessions"],
    [5,  "5 sessions"],
    [3,  "3 sessions"],
  ];
  for (const [threshold, title] of sessionMilestones) {
    if (total === threshold) {
      const id = `sessions-${threshold}`;
      if (!seenIds.has(id)) return { id, title };
    }
  }

  return null;
}
