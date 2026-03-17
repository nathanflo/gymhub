import { WorkoutTemplate } from "@/types/template";

const TEMPLATES_KEY = "gymhub_templates";

export function getTemplates(): WorkoutTemplate[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(TEMPLATES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveTemplate(template: WorkoutTemplate): void {
  if (typeof window === "undefined") return;
  const existing = getTemplates();
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify([...existing, template]));
}

export function deleteTemplate(id: string): void {
  if (typeof window === "undefined") return;
  const updated = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
}
