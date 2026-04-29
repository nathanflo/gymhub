"use client";

/**
 * Templates page — curated recommended templates + user-saved templates.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTemplates, deleteTemplate } from "@/lib/templates";
import { formatExerciseSummary } from "@/lib/progress";
import { WorkoutTemplate } from "@/types/template";
import { RECOMMENDED_TEMPLATES, RecommendedTemplate } from "@/lib/recommendedTemplates";
import { track } from "@/lib/analytics";

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
    track("template_launched", { template_id: id, template_source: "custom" });
    router.push(`/log?template=${id}`);
  }

  return (
    <main className="flex flex-col flex-1 px-6 pt-8 gap-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-sm text-indigo-400 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <Link
          href="/programs"
          className="inline-block mt-2 text-sm text-neutral-500 hover:text-neutral-400 transition-colors"
        >
          Want structure? <span className="text-indigo-400">Explore Programs</span>
        </Link>
      </div>

      {/* Recommended */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Recommended</p>
        <div className="flex flex-col gap-3">
          {RECOMMENDED_TEMPLATES.filter(t => !t.hidden).map((t) => (
            <RecommendedCard key={t.id} template={t} />
          ))}
        </div>
      </section>

      {/* Your Templates */}
      <section className="flex flex-col gap-3 pb-8">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Your Templates
          {templates.length > 0 && (
            <span className="normal-case font-normal text-neutral-600 ml-2">{templates.length}</span>
          )}
        </p>
        {templates.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Save a template from any session in{" "}
            <Link href="/workouts" className="text-indigo-400 hover:text-indigo-300">
              Workouts
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-4">
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
      </section>
    </main>
  );
}

// ─── Recommended card ─────────────────────────────────────────────────────────

function RecommendedCard({ template }: { template: RecommendedTemplate }) {
  const exerciseCount = template.exercises.length;
  return (
    <Link
      href={`/templates/recommended/${template.id}`}
      className="rounded-2xl bg-neutral-800 border border-neutral-700/60 p-4 flex flex-col gap-2 active:scale-[0.98] active:brightness-110 transition-all duration-75 ease-out"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-white">{template.name}</h2>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-indigo-400/60 font-medium">starter</span>
          <Badge>{template.workoutType}</Badge>
        </div>
      </div>
      <p className="text-sm text-neutral-400">{template.description}</p>
      <p className="text-xs text-neutral-500">
        {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} · {template.estimatedDuration}
      </p>
    </Link>
  );
}

// ─── User template card ────────────────────────────────────────────────────────

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
