"use client";

/**
 * Log Session page.
 * Replaced single-exercise form with SessionForm for multi-exercise sessions.
 *
 * Pass ?from=<sessionId> to pre-fill the form from a previous session (Duplicate flow).
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSession, getSessionById } from "@/lib/sessions";
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
        const session = await getSessionById(fromId);
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
    router.push(`/session/${session.id}/summary`);
  }

  if (!loaded) return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div className="h-8 w-40 rounded-lg bg-neutral-800/60 animate-pulse" />
    </main>
  );

  return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      <h1 className="text-2xl font-bold text-white">Log Session</h1>

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
