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

type DraftData = { session: SessionFormState; startTime: string; activeExIdx?: number };

function LogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");
  const templateId = searchParams.get("template");
  const resumeParam = searchParams.get("resume");

  const [initialState, setInitialState] = useState<SessionFormState | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  // Draft resume state
  const [draftData, setDraftData] = useState<DraftData | null | "unchecked">("unchecked");
  const [resumeStartTime, setResumeStartTime] = useState<string | undefined>(undefined);
  const [overrideInitial, setOverrideInitial] = useState<SessionFormState | undefined>(undefined);
  const [resumeActiveExIdx, setResumeActiveExIdx] = useState<number>(0);

  // Check localStorage for an active draft on mount (synchronous)
  useEffect(() => {
    const raw = localStorage.getItem("activeWorkoutDraft");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.version === 1 && parsed?.startTime) {
          if (resumeParam) {
            // Came from home "Resume" — skip modal, go straight in
            setOverrideInitial(parsed.session);
            setResumeStartTime(parsed.startTime);
            setResumeActiveExIdx(parsed.activeExIdx ?? 0);
            setDraftData(null);
          } else {
            setDraftData(parsed);  // show modal
          }
          return;
        }
        localStorage.removeItem("activeWorkoutDraft");
      } catch {}
    }
    setDraftData(null);
  }, [resumeParam]);

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
    localStorage.removeItem("activeWorkoutDraft");
    router.push(`/session/${session.id}/summary`);
  }

  // Show skeleton while checking draft or loading initial state
  if (!loaded || draftData === "unchecked") return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div className="h-8 w-40 rounded-lg bg-neutral-800/60 animate-pulse" />
    </main>
  );

  const headerDate = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-6">
      {/* Resume modal */}
      {draftData && typeof draftData !== "string" && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 flex items-center justify-center px-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div>
              <h2 className="text-white font-bold text-lg">Resume your workout?</h2>
              <p className="text-neutral-400 text-sm mt-1">You have an unfinished session.</p>
              {draftData.session.title && (
                <p className="text-neutral-500 text-xs mt-1">&quot;{draftData.session.title}&quot;</p>
              )}
            </div>
            <button
              onClick={() => {
                setOverrideInitial(draftData.session);
                setResumeStartTime(draftData.startTime);
                setResumeActiveExIdx(draftData.activeExIdx ?? 0);
                setDraftData(null);
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold"
            >
              Resume
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("activeWorkoutDraft");
                setOverrideInitial(undefined);
                setResumeStartTime(undefined);
                setDraftData(null);
              }}
              className="w-full py-3 rounded-xl bg-neutral-800 text-neutral-300"
            >
              Start New
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white">Log Session — {headerDate}</h1>

      <SessionForm
        initialState={overrideInitial ?? initialState}
        initialStartTime={resumeStartTime}
        initialActiveExIdx={resumeActiveExIdx}
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
