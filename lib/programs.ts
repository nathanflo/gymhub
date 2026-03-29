export type StarterProgramId = "FULL_BODY" | "PPL" | "ARNOLD";

export interface ProgramDefinition {
  id: StarterProgramId;
  name: string;
  description: string;
  workouts: string[];
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
  {
    id: "ARNOLD",
    name: "Arnold Split",
    description: "Classic high-volume bodybuilding split",
    workouts: ["Chest & Back", "Shoulders & Arms", "Legs"],
    cadenceLabel: "3 workouts · rotating split",
  },
];

export interface CustomProgramWorkout {
  id: string;
  name: string;
  linkedTemplateId?: string;  // rec or user template ID; undefined = no link
}

export interface CustomProgram {
  id: string;
  kind: "custom";
  name: string;
  workouts: CustomProgramWorkout[];
}

export interface ActiveProgram {
  id: string;                     // StarterProgramId or custom program UUID
  kind: "starter" | "custom";
  currentIndex: number;
}

const STORAGE_KEY = "floform_active_program";
const STORAGE_KEY_CUSTOM = "floform_custom_programs";

// ─── Custom program CRUD ──────────────────────────────────────────────────────

export function getCustomPrograms(): CustomProgram[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    return raw ? (JSON.parse(raw) as CustomProgram[]) : [];
  } catch { return []; }
}

export function saveCustomPrograms(programs: CustomProgram[]): void {
  localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(programs));
}

export function createCustomProgram(program: CustomProgram): void {
  saveCustomPrograms([...getCustomPrograms(), program]);
}

export function updateCustomProgram(updated: CustomProgram): void {
  saveCustomPrograms(getCustomPrograms().map(p => p.id === updated.id ? updated : p));
}

export function deleteCustomProgram(id: string): void {
  saveCustomPrograms(getCustomPrograms().filter(p => p.id !== id));
}

// ─── Active program ───────────────────────────────────────────────────────────

export function getActiveProgram(): ActiveProgram | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveProgram>;
    // Backwards compat: records without `kind` are starter programs
    if (!parsed.kind) parsed.kind = "starter";
    return parsed as ActiveProgram;
  } catch { return null; }
}

export function setActiveStarterProgram(id: StarterProgramId): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, kind: "starter", currentIndex: 0 }));
}

export function setActiveCustomProgram(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, kind: "custom", currentIndex: 0 }));
}

export function clearActiveProgram(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Clamp active program's currentIndex to maxIndex when workouts are removed. */
export function clampActiveProgramIndex(programId: string, maxIndex: number): void {
  const active = getActiveProgram();
  if (!active || active.id !== programId) return;
  if (active.currentIndex > maxIndex) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...active, currentIndex: maxIndex }));
  }
}

export function advanceActiveProgram(): void {
  const active = getActiveProgram();
  if (!active) return;
  let total: number;
  if (active.kind === "starter") {
    const program = PROGRAMS.find(p => p.id === active.id);
    if (!program) return;
    total = program.workouts.length;
  } else {
    const program = getCustomPrograms().find(p => p.id === active.id);
    if (!program || program.workouts.length === 0) return;
    total = program.workouts.length;
  }
  const nextIndex = (active.currentIndex + 1) % total;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...active, currentIndex: nextIndex }));
}

export function getCurrentWorkoutInfo(
  active: ActiveProgram
): { name: string; linkedTemplateId?: string } | null {
  if (active.kind === "starter") {
    const program = PROGRAMS.find(p => p.id === active.id);
    if (!program) return null;
    const idx = active.currentIndex % program.workouts.length;
    return { name: program.workouts[idx] };
  } else {
    const program = getCustomPrograms().find(p => p.id === active.id);
    if (!program || program.workouts.length === 0) return null;
    const idx = active.currentIndex % program.workouts.length;
    const workout = program.workouts[idx];
    if (!workout) return null;
    return { name: workout.name, linkedTemplateId: workout.linkedTemplateId };
  }
}
