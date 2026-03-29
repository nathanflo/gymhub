"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PROGRAMS,
  ProgramId,
  getActiveProgram,
  setActiveProgram,
  clearActiveProgram,
} from "@/lib/programs";

export default function ProgramsPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<ProgramId | null>(null);
  const [activeProgramId, setActiveProgramId] = useState<ProgramId | null>(null);

  useEffect(() => {
    const active = getActiveProgram();
    setActiveProgramId(active?.id ?? null);
  }, []);

  function handleStart(id: ProgramId) {
    setActiveProgram(id);
    setActiveProgramId(id);
    setExpandedId(null);
    router.push("/");
  }

  return (
    <main
      className="flex flex-col flex-1 px-6 pt-8 gap-6"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-sm text-indigo-400 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Programs</h1>
        <p className="text-sm text-neutral-500 mt-1">Add structure to your training.</p>
      </div>

      {/* Program cards */}
      <div className="flex flex-col gap-3">
        {PROGRAMS.map((program) => {
          const isActive = activeProgramId === program.id;
          const isExpanded = expandedId === program.id;

          return (
            <div
              key={program.id}
              className="rounded-2xl bg-neutral-800 border border-neutral-700/60 overflow-hidden"
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : program.id)}
                className="w-full text-left px-4 py-4 flex items-start justify-between gap-2 active:opacity-80 transition-opacity"
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{program.name}</span>
                    {isActive && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-neutral-400">{program.description}</span>
                  <span className="text-xs text-neutral-600 mt-0.5">{program.cadenceLabel}</span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`text-neutral-500 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-neutral-700/50 px-4 pb-4 flex flex-col gap-4">
                  {/* Workout sequence */}
                  <div className="flex items-center gap-2 flex-wrap pt-3">
                    {program.workouts.map((name, i) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-200 bg-neutral-700 rounded-lg px-3 py-1">
                          {name}
                        </span>
                        {i < program.workouts.length - 1 && (
                          <span className="text-neutral-600 text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Start button */}
                  <button
                    type="button"
                    onClick={() => handleStart(program.id)}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.96] active:brightness-110
                               transition-all duration-75 ease-out py-3 text-sm font-semibold text-white text-center"
                  >
                    {isActive ? "Restart Program" : "Start Program"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stop program */}
      {activeProgramId && (
        <button
          type="button"
          onClick={() => {
            clearActiveProgram();
            setActiveProgramId(null);
          }}
          className="self-center text-xs text-neutral-600 hover:text-neutral-400 transition-colors py-2"
        >
          Stop active program
        </button>
      )}
    </main>
  );
}
