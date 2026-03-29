export type ProgramId = "FULL_BODY" | "PPL";

export interface ProgramDefinition {
  id: ProgramId;
  name: string;
  description: string;
  workouts: string[];     // names matching RECOMMENDED_TEMPLATES[].name
  cadenceLabel: string;
}

export const PROGRAMS: ProgramDefinition[] = [
  {
    id: "FULL_BODY",
    name: "Full Body",
    description: "Simple and balanced",
    workouts: ["Full Body"],
    cadenceLabel: "1 workout · repeat as you go",
  },
  {
    id: "PPL",
    name: "Push / Pull / Legs",
    description: "Focused rotating split",
    workouts: ["Push", "Pull", "Legs"],
    cadenceLabel: "3 workouts · rotating split",
  },
];

export interface ActiveProgram {
  id: ProgramId;
  currentIndex: number;
}

const STORAGE_KEY = "floform_active_program";

export function getActiveProgram(): ActiveProgram | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveProgram) : null;
  } catch { return null; }
}

export function setActiveProgram(id: ProgramId): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, currentIndex: 0 }));
}

export function advanceActiveProgram(): void {
  const active = getActiveProgram();
  if (!active) return;
  const program = PROGRAMS.find(p => p.id === active.id);
  if (!program) return;
  const nextIndex = (active.currentIndex + 1) % program.workouts.length;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: active.id, currentIndex: nextIndex }));
}

export function clearActiveProgram(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getCurrentWorkoutName(active: ActiveProgram): string {
  const program = PROGRAMS.find(p => p.id === active.id);
  if (!program) return "";
  return program.workouts[active.currentIndex % program.workouts.length];
}
