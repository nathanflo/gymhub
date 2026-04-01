const compoundKeywords = [
  "bench", "squat", "deadlift", "press", "row",
  "pull up", "chin up", "pulldown", "leg press",
];
const accessoryKeywords = [
  "curl", "extension", "fly", "raise", "pushdown",
  "calf", "leg curl", "leg extension", "lateral raise", "tricep", "bicep",
];
const coreKeywords = [
  "plank", "crunch", "sit up", "core",
  "yoga", "stretch", "stretching", "mobility",
];

export function getRestTarget(exerciseName: string): number {
  const name = exerciseName.toLowerCase();
  if (compoundKeywords.some(k => name.includes(k))) return 120;
  if (accessoryKeywords.some(k => name.includes(k))) return 60;
  if (coreKeywords.some(k => name.includes(k))) return 45;
  return 75;
}
