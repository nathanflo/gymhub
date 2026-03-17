"use client";

/**
 * Log Session page.
 * Replaced single-exercise form with SessionForm for multi-exercise sessions.
 *
 * Pass ?from=<sessionId> to pre-fill the form from a previous session (Duplicate flow).
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSession, getSessions } from "@/lib/sessions";
import { getTemplates } from "@/lib/templates";
import { WorkoutSession } from "@/types/session";
import { SessionForm, SessionFormState, sessionToFormState, templateToFormState } from "@/components/SessionForm";

function LogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");
  const templateId = searchParams.get("template");

  const [initialState, setInitialState] = useState<SessionFormState | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      if (fromId) {
        const sessions = await getSessions();
        const session = sessions.find((s) => s.id === fromId);
        if (session) {
          setInitialState({ ...sessionToFormState(session), notes: "", bodyweight: "" });
        }
      } else if (templateId) {
        const templates = await getTemplates();
        const template = templates.find((t) => t.id === templateId);
        if (template) {
          setInitialState(templateToFormState(template));
        }
      }
      setLoaded(true);
    }
    load();
  }, [fromId, templateId]);

  async function handleSave(session: WorkoutSession) {
    await saveSession(session);
    router.push("/workouts");
  }

  if (!loaded) return null;

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
