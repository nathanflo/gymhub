/**
 * messaging.ts — FloForm intelligent messaging system.
 *
 * Classifies each strength session into one of 11 states and maps it to
 * a curated pool of title + subtitle pairs. Home screen momentum messages
 * use a stable daily seed so they vary day-to-day but don't change on refresh.
 */

import { WorkoutSession } from "@/types/session";

// ─────────────────────────────────────────────────────────────────────────────
// SESSION CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export type SessionState =
  | "PR_DOMINANT"
  | "PROGRESSION"
  | "COMEBACK"
  | "STREAK"
  | "CONSISTENT"
  | "DELOAD"
  | "LONG_SESSION"
  | "SHORT_SESSION"
  | "BACK_TO_BACK"
  | "NEW_EXERCISE"
  | "DEFAULT";

function computeVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (acc, ex) =>
      acc + ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
    0
  );
}

function countSets(session: WorkoutSession): number {
  return session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
}

function daysBetween(isoA: string, isoB: string): number {
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  return Math.abs(
    (toLocal(isoA).getTime() - toLocal(isoB).getTime()) / 86_400_000
  );
}

function seedFromId(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return sum;
}

export function pickMessage(arr: string[], seed: number): string {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

export function classifySession(
  session: WorkoutSession,
  previousSession: WorkoutSession | null,
  allPriorSessions: WorkoutSession[],
  prCount: number
): SessionState {
  const curVol = computeVolume(session);
  const prevVol = previousSession ? computeVolume(previousSession) : 0;
  const ratio = prevVol > 0 && curVol > 0 ? curVol / prevVol : null;
  const sets = countSets(session);

  // 1. PR_DOMINANT
  if (prCount >= 2 || (prCount === 1 && ratio !== null && ratio >= 1.15)) {
    return "PR_DOMINANT";
  }

  // 2. COMEBACK — gap from last session (any type) >= 3 days
  if (allPriorSessions.length > 0) {
    const gap = daysBetween(session.date, allPriorSessions[0].date);
    if (gap >= 3) return "COMEBACK";
  }

  // 3. STREAK — 2+ sessions in the 5 days before this one
  const sessionMs = new Date(session.date).getTime();
  const fiveDaysBeforeMs = sessionMs - 5 * 86_400_000;
  const recentCount = allPriorSessions.filter(
    (s) => new Date(s.date).getTime() >= fiveDaysBeforeMs
  ).length;
  if (recentCount >= 2) return "STREAK";

  // 4. PROGRESSION
  if (ratio !== null && ratio >= 1.1) return "PROGRESSION";

  // 5. DELOAD
  if (ratio !== null && ratio <= 0.85) return "DELOAD";

  // 6. CONSISTENT
  if (ratio !== null && ratio >= 0.95 && ratio < 1.1) return "CONSISTENT";

  // 7. LONG_SESSION
  if (sets >= 18) return "LONG_SESSION";

  // 8. SHORT_SESSION
  if (sets <= 5) return "SHORT_SESSION";

  // 9. BACK_TO_BACK
  if (
    allPriorSessions.length > 0 &&
    allPriorSessions[0].workoutType === session.workoutType
  ) {
    return "BACK_TO_BACK";
  }

  // 10. NEW_EXERCISE
  const last3 = allPriorSessions.slice(0, 3);
  if (last3.length > 0) {
    const seenNames = new Set(
      last3.flatMap((s) => s.exercises.map((e) => e.name.trim().toLowerCase()))
    );
    const hasNew = session.exercises.some(
      (e) => !seenNames.has(e.name.trim().toLowerCase())
    );
    if (hasNew) return "NEW_EXERCISE";
  }

  return "DEFAULT";
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE POOLS
// ─────────────────────────────────────────────────────────────────────────────

const POOLS: Record<SessionState, { titles: string[]; subtitles: string[] }> = {
  PR_DOMINANT: {
    titles: [
      "big session",
      "you pushed it",
      "strong across the board",
      "that moved well",
      "real progress today",
      "numbers moved today",
    ],
    subtitles: [
      "multiple lifts moved forward",
      "this was a step up",
      "you're building something here",
      "not just one — everything improved",
      "this one stands out",
      "the work is showing",
    ],
  },
  PROGRESSION: {
    titles: [
      "moving forward",
      "progress showing",
      "building momentum",
      "a little stronger today",
      "one step ahead",
      "quietly improving",
    ],
    subtitles: [
      "more than last time",
      "quiet improvement",
      "this is how it builds",
      "stacking small wins",
      "small but real",
      "progress doesn't shout",
    ],
  },
  CONSISTENT: {
    titles: [
      "steady work",
      "right on track",
      "holding form",
      "locked in",
      "disciplined",
      "showing up",
    ],
    subtitles: [
      "matched your last session",
      "consistency is there",
      "no drop-off",
      "this is discipline",
      "same level, every time",
      "exactly where you need to be",
    ],
  },
  DELOAD: {
    titles: [
      "lighter day",
      "pulled it back",
      "eased into it",
      "controlled effort",
      "smart session",
    ],
    subtitles: [
      "not every session needs to peak",
      "still showed up",
      "keeping things moving",
      "controlled effort",
      "rest is part of the process",
    ],
  },
  COMEBACK: {
    titles: [
      "back at it",
      "returning",
      "back in motion",
      "picking it back up",
      "starting fresh",
    ],
    subtitles: [
      "first one in a few days",
      "good to be back",
      "starting again matters",
      "this is how momentum restarts",
      "one session at a time",
    ],
  },
  STREAK: {
    titles: [
      "in rhythm",
      "locked into it",
      "consistent lately",
      "on a run",
      "this is habit",
    ],
    subtitles: [
      "you've been showing up",
      "this is a streak forming",
      "habit is taking shape",
      "keep this cadence",
      "momentum is real",
      "you're consistent now",
    ],
  },
  SHORT_SESSION: {
    titles: [
      "quick work",
      "in and out",
      "efficient session",
      "tight session",
      "kept it short",
    ],
    subtitles: [
      "short but effective",
      "kept it tight",
      "not long, still counts",
      "quality over quantity",
      "sometimes less is enough",
    ],
  },
  LONG_SESSION: {
    titles: [
      "full session",
      "put the time in",
      "long effort",
      "committed today",
      "deep work",
    ],
    subtitles: [
      "more volume than usual",
      "you stayed with it",
      "this one took time",
      "long effort, well spent",
      "went the distance",
    ],
  },
  BACK_TO_BACK: {
    titles: [
      "running it back",
      "same focus",
      "doubling down",
      "back for more",
    ],
    subtitles: [
      "same muscle group again",
      "leaning into it",
      "intentional repeat",
      "staying in it",
    ],
  },
  NEW_EXERCISE: {
    titles: [
      "mixing it up",
      "new angles",
      "something different",
      "expanding the work",
    ],
    subtitles: [
      "variation added",
      "trying something new",
      "new range of motion",
      "keeping it fresh",
    ],
  },
  DEFAULT: {
    titles: [
      "good work",
      "solid session",
      "clean effort",
      "well done",
      "that was real work",
    ],
    subtitles: [
      "consistent effort",
      "another one logged",
      "stayed with it",
      "keep building",
      "every session counts",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// YOGA & RUN MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

const YOGA_TITLES = [
  "good practice",
  "time well spent",
  "grounded session",
  "present today",
  "moved with intention",
];

function generateYogaMessages(
  session: WorkoutSession,
  seed: number
): { title: string; subtitle: string } {
  const { yogaIntention, yogaClarityRating, yogaMobilityRating, yogaDurationMinutes } =
    session;

  let subtitle: string;
  if (yogaClarityRating && yogaClarityRating >= 4) {
    subtitle = "left feeling clear and grounded";
  } else if (yogaIntention === "Recovery") {
    subtitle = "recovery focus, well spent";
  } else if (yogaIntention === "Relaxation") {
    subtitle = "took time to reset";
  } else if (yogaIntention === "Energy") {
    subtitle = "moved and felt it";
  } else if (yogaMobilityRating && yogaMobilityRating >= 4) {
    subtitle = "body opened up nicely today";
  } else if (yogaDurationMinutes && yogaDurationMinutes <= 20) {
    subtitle = "short session, still showed up";
  } else {
    subtitle = "nice balance of movement and calm";
  }

  return { title: pickMessage(YOGA_TITLES, seed), subtitle };
}

const RUN_TITLES = [
  "miles logged",
  "out and back",
  "kept moving",
  "on the road",
  "steady pace",
];

function generateRunMessages(
  session: WorkoutSession,
  seed: number
): { title: string; subtitle: string } {
  const isLong = (session.distance ?? 0) >= 10;
  let subtitle: string;
  if (session.energyLevel === "High") {
    subtitle = isLong ? "big aerobic effort" : "pushed the pace today";
  } else if (session.energyLevel === "Low") {
    subtitle = "easy miles, still showing up";
  } else {
    subtitle = "steady aerobic effort";
  }

  return { title: pickMessage(RUN_TITLES, seed), subtitle };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: generateSessionMessages
// ─────────────────────────────────────────────────────────────────────────────

export function generateSessionMessages(
  session: WorkoutSession,
  previousSession: WorkoutSession | null,
  allPriorSessions: WorkoutSession[],
  prCount: number,
  _prExercises: string[]
): { title: string; subtitle: string } {
  const seed = seedFromId(session.id);

  if (session.workoutType === "Yoga") return generateYogaMessages(session, seed);
  if (session.workoutType === "Run") return generateRunMessages(session, seed);

  const state = classifySession(session, previousSession, allPriorSessions, prCount);
  const pool = POOLS[state];

  return {
    title: pickMessage(pool.titles, seed),
    subtitle: pickMessage(pool.subtitles, seed + 1),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME MOMENTUM
// ─────────────────────────────────────────────────────────────────────────────

type HomeState =
  | "HOME_TRAINED_TODAY"
  | "HOME_STREAK_ACTIVE"
  | "HOME_VERY_ACTIVE"
  | "HOME_DAY_AFTER"
  | "HOME_COMEBACK_NEAR"
  | "HOME_COMEBACK_LONG"
  | "HOME_LONG_BREAK"
  | "HOME_DEFAULT";

const HOME_POOLS: Record<HomeState, { titles: string[]; subtitles: (string | null)[] }> = {
  HOME_TRAINED_TODAY: {
    titles: ["back for more", "going again", "dedicated day"],
    subtitles: ["you already trained today", "second session in", "back at it again"],
  },
  HOME_STREAK_ACTIVE: {
    titles: ["in rhythm", "locked in", "consistent lately", "on a streak"],
    subtitles: [
      "you've been showing up",
      "keep this going",
      "habit is forming",
      "this rhythm is working",
    ],
  },
  HOME_VERY_ACTIVE: {
    titles: ["on a roll", "firing on all cylinders", "all in this week"],
    // index 0 subtitle is injected dynamically (sessionsThisWeek count)
    subtitles: [null, "you're locked in", "high output week"],
  },
  HOME_DAY_AFTER: {
    titles: ["building on yesterday", "back in it", "picking it up", "one more day"],
    subtitles: [
      "keeping the momentum going",
      "right on schedule",
      "back for another",
      "continue the work",
    ],
  },
  HOME_COMEBACK_NEAR: {
    titles: ["ready when you are", "picking it up", "back in motion", "returning"],
    subtitles: [
      "a couple days off",
      "ease back into it",
      "the work is still there",
      "pick up where you left off",
    ],
  },
  HOME_COMEBACK_LONG: {
    titles: ["ready when you are", "start again today", "just one session", "ease back in"],
    subtitles: [
      "it's been a few days",
      "ease back in, no rush",
      "first one back counts",
      "the gym is still there",
    ],
  },
  HOME_LONG_BREAK: {
    titles: ["fresh start", "ready when you are", "new chapter"],
    subtitles: [
      "take it at your own pace",
      "start where you are",
      "no pressure, just show up",
      "fresh slate",
    ],
  },
  HOME_DEFAULT: {
    titles: ["ready when you are"],
    subtitles: [null],
  },
};

export function computeHomeMomentum(sessions: WorkoutSession[]): {
  title: string;
  subtitle: string | null;
} {
  if (!sessions || sessions.length === 0) {
    return { title: "ready when you are", subtitle: null };
  }

  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toLocal = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Stable daily seed: changes every day, influenced by total sessions (personal variety)
  const dailySeed =
    now.getFullYear() * 366 +
    now.getMonth() * 31 +
    now.getDate() +
    sessions.length;

  const last7 = sessions.filter((s) => {
    const d = toLocal(new Date(s.date));
    const diff = (todayLocal.getTime() - d.getTime()) / 86_400_000;
    return diff >= 0 && diff < 7;
  });

  const sessionsThisWeek = last7.length;
  const lastSession = sessions[0];
  const lastDate = toLocal(new Date(lastSession.date));
  const gapDays = (todayLocal.getTime() - lastDate.getTime()) / 86_400_000;

  let state: HomeState;

  if (gapDays === 0 && sessions.length >= 2) {
    const prevDate = toLocal(new Date(sessions[1].date));
    const prevGap = (todayLocal.getTime() - prevDate.getTime()) / 86_400_000;
    if (prevGap === 0) {
      state = "HOME_TRAINED_TODAY";
    } else if (sessionsThisWeek >= 3) {
      state = "HOME_STREAK_ACTIVE";
    } else {
      state = "HOME_DAY_AFTER";
    }
  } else if (sessionsThisWeek >= 5) {
    state = "HOME_VERY_ACTIVE";
  } else if (sessionsThisWeek >= 3 && gapDays <= 1) {
    state = "HOME_STREAK_ACTIVE";
  } else if (gapDays === 1) {
    state = "HOME_DAY_AFTER";
  } else if (gapDays >= 2 && gapDays <= 3) {
    state = "HOME_COMEBACK_NEAR";
  } else if (gapDays >= 4 && gapDays <= 6) {
    state = "HOME_COMEBACK_LONG";
  } else if (gapDays >= 7) {
    state = "HOME_LONG_BREAK";
  } else {
    state = "HOME_DEFAULT";
  }

  const pool = HOME_POOLS[state];
  const idx = dailySeed % pool.titles.length;

  const title = pool.titles[idx];

  // HOME_VERY_ACTIVE at idx 0 injects the live session count
  if (state === "HOME_VERY_ACTIVE" && idx === 0) {
    return { title, subtitle: `${sessionsThisWeek} sessions this week` };
  }

  const subtitleIdx = Math.min(idx, pool.subtitles.length - 1);
  const subtitle = pool.subtitles[subtitleIdx];
  return { title, subtitle: subtitle ?? null };
}
