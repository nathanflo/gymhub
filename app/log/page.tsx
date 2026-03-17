"use client";

/**
 * Log Session page.
 * Replaced single-exercise form with SessionForm for multi-exercise sessions.
 *
 * Pass ?from=<sessionId> to pre-fill the form from a previous session (Duplicate flow).
 */

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSession, getSessions } from "@/lib/sessions";
import { getTemplates } from "@/lib/templates";
import { WorkoutSession } from "@/types/session";
import { SessionForm, sessionToFormState, templateToFormState } from "@/components/SessionForm";

function LogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");
  const templateId = searchParams.get("template");

  const initialState = useMemo(() => {
    if (fromId) {
      const session = getSessions().find((s) => s.id === fromId);
      if (!session) return undefined;
      return { ...sessionToFormState(session), notes: "", bodyweight: "" };
    }
    if (templateId) {
      const template = getTemplates().find((t) => t.id === templateId);
      if (!template) return undefined;
      return templateToFormState(template);
    }
    return undefined;
  }, [fromId, templateId]);

  function handleSave(session: WorkoutSession) {
    saveSession(session);
    router.push("/workouts");
  }

  return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-indigo-400 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Log Session</h1>
      </div>

      <SessionForm
        initialState={initialState}
        submitLabel="Save Session"
        onSave={handleSave}
        onCancel={() => router.back()}
      />
    </main>
  );
}

export default function LogWorkoutPage() {
  return (
    <Suspense>
      <LogPageInner />
    </Suspense>
  );
}
