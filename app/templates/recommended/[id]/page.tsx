"use client";

import { useParams, useRouter } from "next/navigation";
import { RECOMMENDED_TEMPLATES } from "@/lib/recommendedTemplates";

export default function RecommendedTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const template = RECOMMENDED_TEMPLATES.find((t) => t.id === id);

  if (!template) {
    return (
      <main className="flex flex-col flex-1 px-6 pt-8 gap-6">
        <button onClick={() => router.back()} className="text-sm text-indigo-400">
          ← Back
        </button>
        <p className="text-neutral-500">Template not found.</p>
      </main>
    );
  }

  return (
    <main
      className="flex flex-col flex-1 px-6 pt-8 gap-6"
      style={{ paddingBottom: "max(6rem, env(safe-area-inset-bottom))" }}
    >
      {/* Back */}
      <button onClick={() => router.back()} className="text-sm text-indigo-400 self-start">
        ← Back
      </button>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white">{template.name}</h1>
        <p className="text-sm text-neutral-500">
          {template.exercises.length} exercise{template.exercises.length !== 1 ? "s" : ""} · {template.estimatedDuration}
        </p>
      </div>

      {/* Description + coaching note */}
      <div className="flex flex-col gap-2">
        <p className="text-base text-neutral-300">{template.description}</p>
        <p className="text-sm text-neutral-500 italic">{template.coachingNote}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-800" />

      {/* Exercise list */}
      <div className="flex flex-col gap-4">
        {template.exercises.map((ex, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <p className="text-base font-semibold text-white">{ex.name}</p>
            <p className="text-sm text-neutral-500">
              {ex.sets} set{ex.sets !== 1 ? "s" : ""} · {ex.suggestedRepRange}
            </p>
          </div>
        ))}
      </div>

      {/* Start Session — sticky at bottom */}
      <div
        className="fixed bottom-0 inset-x-0 px-6 bg-neutral-950/95 backdrop-blur-sm border-t border-neutral-800"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))", paddingTop: "1rem" }}
      >
        <button
          onClick={() => router.push(`/log?rec=${template.id}`)}
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all py-4 text-base font-semibold text-white text-center"
        >
          Start Session
        </button>
      </div>
    </main>
  );
}
