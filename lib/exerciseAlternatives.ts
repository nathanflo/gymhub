export const EXERCISE_SWAP_GROUPS: string[][] = [
  // Chest
  ["Bench Press", "DB Bench Press", "Machine Chest Press", "Incline DB Press"],
  // Shoulders
  ["Shoulder Press", "DB Shoulder Press", "Arnold Press", "Machine Shoulder Press"],
  // Triceps
  ["Tricep Pushdown", "Overhead Tricep Extension", "Skull Crushers", "Dips"],
  // Lateral raises
  ["Lateral Raise", "Machine Lateral Raise", "Cable Lateral Raise"],
  // Back — vertical pull
  ["Lat Pulldown", "Pull-Ups", "Assisted Pull-Ups"],
  // Back — horizontal pull
  ["Seated Row", "Cable Row", "Single Arm DB Row", "T-Bar Row"],
  // Rear delt
  ["Face Pull", "Rear Delt Fly", "Cable Rear Delt Row"],
  // Biceps
  ["Bicep Curl", "Hammer Curl", "Preacher Curl", "Cable Curl"],
  // Quads compound
  ["Squat", "Leg Press", "Goblet Squat", "Bulgarian Split Squat"],
  // Hamstrings
  ["Romanian Deadlift", "Hamstring Curl", "Stiff Leg Deadlift"],
  // Quad isolation
  ["Leg Extension", "Sissy Squat"],
  // Calves
  ["Calf Raise", "Seated Calf Raise", "Single Leg Calf Raise"],
  // Glutes
  ["Hip Thrust", "Glute Bridge"],
  // Core
  ["Plank", "Dead Bug", "Ab Wheel"],
];

export function getExerciseAlternatives(exerciseName: string): string[] {
  const key = exerciseName.trim();
  const group = EXERCISE_SWAP_GROUPS.find((g) => g.includes(key));
  if (!group) return [];
  return group.filter((name) => name !== key);
}
