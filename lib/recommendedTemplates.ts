export interface RecommendedExercise {
  name: string;
  sets: number;
  suggestedRepRange: string;
}

export interface RecommendedTemplate {
  id: string;
  name: string;
  workoutType: "Push" | "Pull" | "Legs" | "Full Body" | "Run";
  description: string;
  estimatedDuration: string;
  coachingNote: string;
  exercises: RecommendedExercise[];
  hidden?: true;  // if set, excluded from the Recommended list on the Templates page
}

import { WorkoutTemplate } from "@/types/template";
import { WorkoutType } from "@/types/workout";

export function recommendedToWorkoutTemplate(rec: RecommendedTemplate): WorkoutTemplate {
  return {
    id: rec.id,
    name: rec.name,
    workoutType: rec.workoutType as WorkoutType,
    exercises: rec.exercises.map((ex) => ({
      name: ex.name,
      mode: "weight_reps" as const,
      unit: "kg" as const,
      sets: Array.from({ length: ex.sets }, () => ({})),
      freeformNote: "",
      target: ex.suggestedRepRange,
    })),
  };
}

export const RECOMMENDED_TEMPLATES: RecommendedTemplate[] = [
  {
    id: "rec-push",
    name: "Push",
    workoutType: "Push",
    description: "Upper-body pushing workout for chest, shoulders, and triceps.",
    estimatedDuration: "45–60 min",
    coachingNote: "Rest 2–3 min between compound sets. Adjust weight so last reps are challenging.",
    exercises: [
      { name: "Bench Press",      sets: 3, suggestedRepRange: "6–10 reps" },
      { name: "Incline DB Press", sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Shoulder Press",   sets: 3, suggestedRepRange: "8–10 reps" },
      { name: "Lateral Raise",    sets: 2, suggestedRepRange: "12–15 reps" },
      { name: "Tricep Pushdown",  sets: 3, suggestedRepRange: "10–15 reps" },
    ],
  },
  {
    id: "rec-pull",
    name: "Pull",
    workoutType: "Pull",
    description: "Back and biceps workout focused on pulling movements.",
    estimatedDuration: "45–60 min",
    coachingNote: "Focus on full range of motion and controlled lowering on each rep.",
    exercises: [
      { name: "Lat Pulldown", sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Seated Row",   sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Rear Delt Fly", sets: 2, suggestedRepRange: "12–15 reps" },
      { name: "Bicep Curl",   sets: 3, suggestedRepRange: "10–15 reps" },
    ],
  },
  {
    id: "rec-legs",
    name: "Legs",
    workoutType: "Legs",
    description: "Lower-body workout covering quads, hamstrings, and calves.",
    estimatedDuration: "50–65 min",
    coachingNote: "Warm up thoroughly before heavy sets. Keep core braced on all compound movements.",
    exercises: [
      { name: "Leg Press",    sets: 3, suggestedRepRange: "6–10 reps" },
      { name: "Goblet Squat", sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Leg Extension",      sets: 2, suggestedRepRange: "10–15 reps" },
      { name: "Hamstring Curl",     sets: 2, suggestedRepRange: "10–15 reps" },
      { name: "Calf Raise",         sets: 2, suggestedRepRange: "12–20 reps" },
    ],
  },
  {
    id: "rec-fullbody",
    name: "Full Body",
    workoutType: "Full Body",
    description: "Simple full-body workout covering all major movement patterns.",
    estimatedDuration: "45–60 min",
    coachingNote: "Great for 2–3x per week training. Keep rest short (60–90 sec) for higher density.",
    exercises: [
      { name: "Squat",          sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Hamstring Curl", sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Bench Press",    sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Seated Row",     sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Lat Pulldown",   sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Shoulder Press", sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Plank",          sets: 2, suggestedRepRange: "30–45 sec" },
    ],
  },
  {
    id: "rec-interval-run",
    name: "Interval Run",
    workoutType: "Run",
    description: "Alternating fast and easy running intervals to build aerobic capacity.",
    estimatedDuration: "20–30 min",
    coachingNote: "Easy pace should feel conversational. Fast pace should be a 7–8/10 effort.",
    exercises: [
      { name: "Warm-up",       sets: 1, suggestedRepRange: "5 min easy" },
      { name: "Fast interval", sets: 8, suggestedRepRange: "30 sec hard" },
      { name: "Easy interval", sets: 8, suggestedRepRange: "60 sec easy" },
      { name: "Cool-down",     sets: 1, suggestedRepRange: "5 min easy" },
    ],
  },
  // ── Arnold Split templates (hidden from Recommended list; linked via program) ─
  {
    id: "rec-arnold-chest-back",
    hidden: true,
    name: "Arnold — Chest & Back",
    workoutType: "Push",
    description: "Arnold-inspired upper-body session pairing chest and back.",
    estimatedDuration: "45–60 min",
    coachingNote: "Move with control and keep the pace steady through both push and pull work.",
    exercises: [
      { name: "Bench Press",      sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Incline DB Press", sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Seated Row",       sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Lat Pulldown",     sets: 2, suggestedRepRange: "12–15 reps" },
      { name: "Rear Delt Fly",    sets: 2, suggestedRepRange: "12–15 reps" },
    ],
  },
  {
    id: "rec-arnold-shoulders-arms",
    hidden: true,
    name: "Arnold — Shoulders & Arms",
    workoutType: "Push",
    description: "Arnold-inspired upper-body session focused on delts, biceps, and triceps.",
    estimatedDuration: "45–60 min",
    coachingNote: "Keep reps smooth and avoid rushing through the smaller muscle groups.",
    exercises: [
      { name: "Shoulder Press",            sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Lateral Raise",             sets: 3, suggestedRepRange: "12–15 reps" },
      { name: "Tricep Pushdown",           sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Overhead Tricep Extension", sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Bicep Curl",                sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Hammer Curl",               sets: 2, suggestedRepRange: "10–12 reps" },
    ],
  },
  {
    id: "rec-arnold-legs",
    hidden: true,
    name: "Arnold — Legs",
    workoutType: "Legs",
    description: "Arnold-inspired lower-body session with beginner-friendly machine and staple movements.",
    estimatedDuration: "45–60 min",
    coachingNote: "Start controlled, use full range of motion, and keep each lower-body set deliberate.",
    exercises: [
      { name: "Leg Press",      sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Hamstring Curl", sets: 3, suggestedRepRange: "12–15 reps" },
      { name: "Goblet Squat",   sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Calf Raise",     sets: 2, suggestedRepRange: "12–20 reps" },
    ],
  },
  // ── Arnold Advanced templates ──────────────────────────────────────────────
  {
    id: "rec-arnold-advanced-chest-back",
    hidden: true,
    name: "Arnold — Chest & Back (Advanced)",
    workoutType: "Push",
    description: "Higher-volume Arnold chest and back session.",
    estimatedDuration: "75–90 min",
    coachingNote: "Treat the compound sets as your strength work. Control the tempo on accessory movements.",
    exercises: [
      { name: "Bench Press",       sets: 4, suggestedRepRange: "6–10 reps" },
      { name: "Incline DB Press",  sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Chest Fly",         sets: 3, suggestedRepRange: "12–15 reps" },
      { name: "Seated Row",        sets: 4, suggestedRepRange: "8–12 reps" },
      { name: "Lat Pulldown",      sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Single Arm DB Row", sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Rear Delt Fly",     sets: 2, suggestedRepRange: "12–15 reps" },
    ],
  },
  {
    id: "rec-arnold-advanced-shoulders-arms",
    hidden: true,
    name: "Arnold — Shoulders & Arms (Advanced)",
    workoutType: "Push",
    description: "Higher-volume Arnold shoulder and arm session.",
    estimatedDuration: "75–90 min",
    coachingNote: "Keep form tight on the smaller muscle groups — fatigue accumulates fast.",
    exercises: [
      { name: "Shoulder Press",            sets: 4, suggestedRepRange: "8–10 reps" },
      { name: "Lateral Raise",             sets: 3, suggestedRepRange: "12–15 reps" },
      { name: "Rear Delt Fly",             sets: 2, suggestedRepRange: "12–15 reps" },
      { name: "Tricep Pushdown",           sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Overhead Tricep Extension", sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Skull Crushers",            sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Bicep Curl",                sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Hammer Curl",               sets: 3, suggestedRepRange: "10–12 reps" },
    ],
  },
  {
    id: "rec-arnold-advanced-legs",
    hidden: true,
    name: "Arnold — Legs (Advanced)",
    workoutType: "Legs",
    description: "Higher-volume Arnold leg session.",
    estimatedDuration: "75–90 min",
    coachingNote: "Warm up well. Take full rest on Leg Press and RDL sets.",
    exercises: [
      { name: "Leg Press",         sets: 4, suggestedRepRange: "6–10 reps" },
      { name: "Goblet Squat",      sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Leg Extension",     sets: 3, suggestedRepRange: "10–15 reps" },
      { name: "Hamstring Curl",    sets: 3, suggestedRepRange: "10–15 reps" },
      { name: "Romanian Deadlift", sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Calf Raise",        sets: 3, suggestedRepRange: "12–20 reps" },
    ],
  },
  // ── Upper / Lower templates (hidden from Recommended list; linked via program) ─
  {
    id: "rec-upper-a",
    hidden: true,
    name: "Upper A",
    workoutType: "Push",
    description: "Balanced upper-body session focused on pressing, pulling, and arm accessories.",
    estimatedDuration: "50–65 min",
    coachingNote: "Treat the first compounds as your main lifts, then move steadily through accessories.",
    exercises: [
      { name: "Bench Press",     sets: 3, suggestedRepRange: "6–10 reps" },
      { name: "Seated Row",      sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Shoulder Press",  sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Lat Pulldown",    sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Tricep Pushdown", sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Bicep Curl",      sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Lateral Raise",   sets: 2, suggestedRepRange: "12–15 reps" },
    ],
  },
  {
    id: "rec-lower-a",
    hidden: true,
    name: "Lower A",
    workoutType: "Legs",
    description: "Balanced lower-body session with quad, hamstring, calf, and core work.",
    estimatedDuration: "50–65 min",
    coachingNote: "Move with control on every rep. Focus on full range of motion through each lower-body movement.",
    exercises: [
      { name: "Leg Press",      sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Hamstring Curl", sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Leg Extension",  sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Calf Raise",     sets: 3, suggestedRepRange: "12–15 reps" },
      { name: "Goblet Squat",   sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Plank",          sets: 2, suggestedRepRange: "30–45 sec" },
    ],
  },
  {
    id: "rec-upper-b",
    hidden: true,
    name: "Upper B",
    workoutType: "Push",
    description: "Second upper-body session with slightly different angles and accessories.",
    estimatedDuration: "50–65 min",
    coachingNote: "Use this session to vary the angles while keeping effort steady across the whole upper body.",
    exercises: [
      { name: "Incline DB Press",          sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Cable Row",                 sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Rear Delt Fly",             sets: 2, suggestedRepRange: "12–15 reps" },
      { name: "Lat Pulldown",              sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Overhead Tricep Extension", sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Hammer Curl",               sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Chest Fly",                 sets: 2, suggestedRepRange: "12–15 reps" },
    ],
  },
  {
    id: "rec-lower-b",
    hidden: true,
    name: "Lower B",
    workoutType: "Legs",
    description: "Second lower-body session with a slightly different lower-body emphasis.",
    estimatedDuration: "50–65 min",
    coachingNote: "Focus on movement quality and accessory control. Use this session to address any weaknesses from Lower A.",
    exercises: [
      { name: "Squat",             sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Hamstring Curl",    sets: 3, suggestedRepRange: "10–12 reps" },
      { name: "Leg Press",         sets: 2, suggestedRepRange: "10–12 reps" },
      { name: "Seated Calf Raise", sets: 3, suggestedRepRange: "12–15 reps" },
      { name: "Reverse Lunge",     sets: 2, suggestedRepRange: "10 each leg" },
      { name: "Plank",             sets: 2, suggestedRepRange: "30–45 sec" },
    ],
  },
];
