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
      { name: "Face Pull",    sets: 2, suggestedRepRange: "12–15 reps" },
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
      { name: "Squat or Leg Press", sets: 3, suggestedRepRange: "6–10 reps" },
      { name: "Romanian Deadlift",  sets: 3, suggestedRepRange: "8–10 reps" },
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
    estimatedDuration: "40–55 min",
    coachingNote: "Great for 2–3x per week training. Keep rest short (60–90 sec) for higher density.",
    exercises: [
      { name: "Squat",             sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Bench Press",       sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Seated Row",        sets: 3, suggestedRepRange: "8–12 reps" },
      { name: "Romanian Deadlift", sets: 3, suggestedRepRange: "8–10 reps" },
      { name: "Plank",             sets: 2, suggestedRepRange: "30–45 sec" },
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
];
