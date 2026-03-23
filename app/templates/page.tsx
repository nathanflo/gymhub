"use client";

/**
 * Templates page — list of saved workout templates.
 * Save templates from the Workouts page; start sessions from here.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTemplates, deleteTemplate } from "@/lib/templates";
import { formatExerciseSummary } from "@/lib/progress";
import { WorkoutTemplate } from "@/types/template";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  useEffect(() => {
    getTemplates().then(setTemplates);
  }, []);

  async function handleDelete(id: string) {
    await deleteTemplate(id);
    setTemplates(await getTemplates());
  }

  function handleStart(id: string) {
    router.push(`/log?template=${id}`);
  }

  return (
    <main className="flex flex-col flex-1 px-6 pt-8 gap-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      <div>
        <button onClick={() => router.back()} className="text-sm text-indigo-400 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {templates.length === 0
            ? "No templates saved yet."
            : `${templates.length} saved`}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <p className="text-neutral-500">
            Save a template from any session in Workouts.
          </p>
          <Link
            href="/workouts"
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       transition-all px-8 py-4 text-base font-semibold text-white"
          >
            Go to Workouts
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onDelete={() => handleDelete(t.id)}
              onStart={() => handleStart(t.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onDelete,
  onStart,
}: {
  template: WorkoutTemplate;
  onDelete: () => void;
  onStart: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRun = template.workoutType === "Run";
  const previewExercises = template.exercises.slice(0, 2);
  const extraCount = template.exercises.length - 2;

  return (
    <div className="rounded-2xl bg-neutral-800 border border-neutral-700 p-4 flex flex-col gap-2">
      {/* Clickable header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-start justify-between gap-2 w-full text-left cursor-pointer select-none active:opacity-80"
      >
        <h2 className="text-base font-bold text-white flex-1 min-w-0">{template.name}</h2>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge>{template.workoutType}</Badge>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Collapsed body */}
      {isRun ? (
        <p className="text-sm text-neutral-400">
          {template.distance !== undefined && `${template.distance} km`}
          {template.distance !== undefined && template.duration && " · "}
          {template.duration}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {previewExercises.map((ex, i) => {
            const mode = ex.mode ?? "weight_reps";
            const summary =
              mode === "freeform"
                ? ex.freeformNote?.trim() || ""
                : ex.sets.length > 0
                ? formatExerciseSummary(ex)
                : "";
            return (
              <p key={i} className="text-sm text-neutral-300">
                <span className="font-medium text-white">{ex.name}</span>
                {summary && (
                  <span className="text-neutral-400">
                    {mode === "freeform" ? ` — ${summary}` : ` ${summary}`}
                  </span>
                )}
              </p>
            );
          })}
          {extraCount > 0 && !isExpanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              className="text-xs text-neutral-500 hover:text-neutral-400 active:opacity-70 transition-colors text-left"
            >
              + {extraCount} more
            </button>
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <>
          {/* Remaining exercises (index 2+) */}
          {!isRun && extraCount > 0 && (
            <div className="border-t border-neutral-700/50 pt-3 flex flex-col gap-1">
              {template.exercises.slice(2).map((ex, i) => {
                const mode = ex.mode ?? "weight_reps";
                const summary =
                  mode === "freeform"
                    ? ex.freeformNote?.trim() || ""
                    : ex.sets.length > 0
                    ? formatExerciseSummary(ex)
                    : "";
                return (
                  <p key={i} className="text-sm text-neutral-300">
                    <span className="font-medium text-white">{ex.name}</span>
                    {summary && (
                      <span className="text-neutral-400">
                        {mode === "freeform" ? ` — ${summary}` : ` ${summary}`}
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          )}

          {/* Run: show intervals when expanded */}
          {isRun && template.intervals && (
            <div className="border-t border-neutral-700/50 pt-3">
              <Stat label="Intervals" value={template.intervals} />
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-neutral-700/50 pt-3 flex justify-end gap-5">
            <button onClick={onStart} className="text-sm text-indigo-400 hover:text-indigo-300 active:opacity-70 transition-colors py-1">
              Start Session
            </button>
            <button onClick={onDelete} className="text-sm text-neutral-500 hover:text-red-400 active:opacity-70 transition-colors py-1">
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-300">
      {children}
    </span>
  );
}
