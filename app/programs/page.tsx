"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PROGRAMS,
  StarterProgramId,
  CustomProgram,
  ActiveProgram,
  getActiveProgram,
  getCustomPrograms,
  createCustomProgram,
  updateCustomProgram,
  deleteCustomProgram,
  setActiveStarterProgram,
  setActiveCustomProgram,
  clearActiveProgram,
  clampActiveProgramIndex,
} from "@/lib/programs";
import { RECOMMENDED_TEMPLATES } from "@/lib/recommendedTemplates";
import { getTemplates } from "@/lib/templates";
import { inputClass, selectClass } from "@/components/Field";

type WorkoutRow = { id: string; name: string; linkedTemplateId: string };
type Mode = "list" | "create" | { kind: "edit"; program: CustomProgram };

export default function ProgramsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("list");
  const [activeProgram, setActiveProgramState] = useState<ActiveProgram | null>(null);
  const [customPrograms, setCustomProgramsState] = useState<CustomProgram[]>([]);
  const [expandedStarterId, setExpandedStarterId] = useState<string | null>(null);
  const [expandedCustomId, setExpandedCustomId] = useState<string | null>(null);
  const [templateOptions, setTemplateOptions] = useState<Array<{ id: string; name: string }>>([]);
  // Create/edit form
  const [editName, setEditName] = useState("");
  const [editWorkouts, setEditWorkouts] = useState<WorkoutRow[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setActiveProgramState(getActiveProgram());
    setCustomProgramsState(getCustomPrograms());
    const recOpts = RECOMMENDED_TEMPLATES.map(t => ({ id: t.id, name: t.name }));
    getTemplates().then(userTemplates => {
      setTemplateOptions([...recOpts, ...userTemplates.map(t => ({ id: t.id, name: t.name }))]);
    });
  }, []);

  // ── Starter program actions ────────────────────────────────────────────────
  function handleActivateStarter(id: StarterProgramId) {
    setActiveStarterProgram(id);
    setActiveProgramState({ id, kind: "starter", currentIndex: 0 });
    setExpandedStarterId(null);
    router.push("/");
  }

  // ── Custom program actions ─────────────────────────────────────────────────
  function handleActivateCustom(id: string) {
    setActiveCustomProgram(id);
    setActiveProgramState({ id, kind: "custom", currentIndex: 0 });
    setExpandedCustomId(null);
    router.push("/");
  }

  function handleDeleteCustom(id: string) {
    deleteCustomProgram(id);
    setCustomProgramsState(getCustomPrograms());
    if (activeProgram?.id === id) {
      clearActiveProgram();
      setActiveProgramState(null);
    }
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  function enterCreate() {
    setEditName("");
    setEditWorkouts([
      { id: crypto.randomUUID(), name: "", linkedTemplateId: "" },
      { id: crypto.randomUUID(), name: "", linkedTemplateId: "" },
      { id: crypto.randomUUID(), name: "", linkedTemplateId: "" },
    ]);
    setEditError(null);
    setMode("create");
  }

  function enterEdit(program: CustomProgram) {
    setEditName(program.name);
    setEditWorkouts(program.workouts.map(w => ({
      id: w.id,
      name: w.name,
      linkedTemplateId: w.linkedTemplateId ?? "",
    })));
    setEditError(null);
    setMode({ kind: "edit", program });
  }

  function updateRow(rowId: string, field: keyof WorkoutRow, value: string) {
    setEditWorkouts(rows => rows.map(r => r.id === rowId ? { ...r, [field]: value } : r));
  }

  function moveRow(rowId: string, dir: "up" | "down") {
    setEditWorkouts(rows => {
      const idx = rows.findIndex(r => r.id === rowId);
      if (idx < 0) return rows;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= rows.length) return rows;
      const next = [...rows];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  function removeRow(rowId: string) {
    setEditWorkouts(rows => rows.filter(r => r.id !== rowId));
  }

  function addRow() {
    if (editWorkouts.length >= 6) return;
    setEditWorkouts(rows => [...rows, { id: crypto.randomUUID(), name: "", linkedTemplateId: "" }]);
  }

  function handleSave() {
    if (!editName.trim()) { setEditError("Program name is required."); return; }
    if (editWorkouts.length === 0) { setEditError("Add at least one workout day."); return; }
    if (editWorkouts.some(w => !w.name.trim())) { setEditError("All workout names are required."); return; }
    setEditError(null);

    const workouts = editWorkouts.map(w => ({
      id: w.id,
      name: w.name.trim(),
      ...(w.linkedTemplateId ? { linkedTemplateId: w.linkedTemplateId } : {}),
    }));

    if (mode === "create") {
      createCustomProgram({ id: crypto.randomUUID(), kind: "custom", name: editName.trim(), workouts });
    } else if (typeof mode === "object" && mode.kind === "edit") {
      const updated: CustomProgram = { ...mode.program, name: editName.trim(), workouts };
      updateCustomProgram(updated);
      // Preserve currentIndex, clamping if workouts were removed
      clampActiveProgramIndex(updated.id, workouts.length - 1);
      // Re-read in case it was clamped
      setActiveProgramState(getActiveProgram());
    }
    setCustomProgramsState(getCustomPrograms());
    setMode("list");
  }

  function handleDeleteInEdit() {
    if (typeof mode !== "object" || mode.kind !== "edit") return;
    handleDeleteCustom(mode.program.id);
    setMode("list");
  }

  // ── Render: Create / Edit form ─────────────────────────────────────────────
  if (mode !== "list") {
    const isEdit = typeof mode === "object" && mode.kind === "edit";
    return (
      <main
        className="flex flex-col flex-1 px-6 pt-8 gap-6"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div>
          <button
            type="button"
            onClick={() => setMode("list")}
            className="text-sm text-indigo-400 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? "Edit Program" : "Create Program"}
          </h1>
        </div>

        {/* Program name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-400">Program Name</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. FloSplit"
            value={editName}
            onChange={e => setEditName(e.target.value)}
          />
        </div>

        {/* Workout days */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-400">Workout Days</label>
          {editWorkouts.map((row, i) => (
            <div key={row.id} className="flex flex-col gap-2 rounded-xl bg-neutral-800/60 border border-neutral-700 p-3">
              {/* Name + remove */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className={`${inputClass} flex-1 text-sm`}
                  placeholder="e.g. Chest & Back"
                  value={row.name}
                  onChange={e => updateRow(row.id, "name", e.target.value)}
                />
                {editWorkouts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="shrink-0 text-neutral-600 hover:text-red-400 transition-colors text-lg leading-none px-1"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Template link */}
              <select
                className={selectClass}
                value={row.linkedTemplateId}
                onChange={e => updateRow(row.id, "linkedTemplateId", e.target.value)}
              >
                <option value="">No template</option>
                {templateOptions.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              {/* Reorder */}
              {editWorkouts.length > 1 && (
                <div className="flex gap-3 pl-1">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => moveRow(row.id, "up")}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      ↑ Move up
                    </button>
                  )}
                  {i < editWorkouts.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveRow(row.id, "down")}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      ↓ Move down
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            disabled={editWorkouts.length >= 6}
            className="self-start text-sm text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-40"
          >
            + Add Workout Day
          </button>
        </div>

        {editError && (
          <p className="text-sm text-red-400">{editError}</p>
        )}

        {/* Save / Cancel */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.96]
                       transition-all duration-75 ease-out py-4 text-sm font-semibold text-white text-center"
          >
            {isEdit ? "Save Changes" : "Save Program"}
          </button>
          <button
            type="button"
            onClick={() => setMode("list")}
            className="w-full rounded-2xl bg-neutral-800 active:scale-[0.96]
                       transition-all duration-75 ease-out py-4 text-sm font-semibold text-neutral-300 text-center"
          >
            Cancel
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDeleteInEdit}
              className="self-center text-sm text-red-500/70 hover:text-red-400 transition-colors py-2"
            >
              Delete Program
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Render: List ───────────────────────────────────────────────────────────
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

      {/* Starter Programs */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Starter Programs
        </p>
        <div className="flex flex-col gap-3">
          {PROGRAMS.map((program) => {
            const isActive = activeProgram?.kind === "starter" && activeProgram.id === program.id;
            const isExpanded = expandedStarterId === program.id;
            return (
              <div
                key={program.id}
                className="rounded-2xl bg-neutral-800 border border-neutral-700/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedStarterId(isExpanded ? null : program.id)}
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
                  <Chevron expanded={isExpanded} />
                </button>

                {isExpanded && (
                  <div className="border-t border-neutral-700/50 px-4 pb-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 flex-wrap pt-3">
                      {program.workouts.map((w, i) => (
                        <div key={w.name} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-200 bg-neutral-700 rounded-lg px-3 py-1">
                            {w.name}
                          </span>
                          {i < program.workouts.length - 1 && (
                            <span className="text-neutral-600 text-xs">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleActivateStarter(program.id)}
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
      </section>

      {/* Your Programs */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Your Programs
        </p>

        {customPrograms.length === 0 ? (
          <p className="text-sm text-neutral-500">No custom programs yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {customPrograms.map((program) => {
              const isActive = activeProgram?.kind === "custom" && activeProgram.id === program.id;
              const isExpanded = expandedCustomId === program.id;
              return (
                <div
                  key={program.id}
                  className="rounded-2xl bg-neutral-800 border border-neutral-700/60 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCustomId(isExpanded ? null : program.id)}
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
                      <span className="text-xs text-neutral-600 mt-0.5">
                        {program.workouts.length} workout {program.workouts.length === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <Chevron expanded={isExpanded} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-neutral-700/50 px-4 pb-4 flex flex-col gap-4">
                      {/* Workout day list */}
                      <div className="flex flex-col gap-1 pt-3">
                        {program.workouts.map((w, i) => (
                          <p key={w.id} className="text-sm text-neutral-300">
                            <span className="text-neutral-600 text-xs mr-2">{i + 1}.</span>
                            {w.name}
                          </p>
                        ))}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleActivateCustom(program.id)}
                          className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.96] active:brightness-110
                                     transition-all duration-75 ease-out py-2.5 text-sm font-semibold text-white text-center"
                        >
                          {isActive ? "Restart" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => enterEdit(program)}
                          className="flex-1 rounded-xl bg-neutral-700 hover:bg-neutral-600 active:scale-[0.96]
                                     transition-all duration-75 ease-out py-2.5 text-sm font-medium text-neutral-200 text-center"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustom(program.id)}
                          className="rounded-xl bg-neutral-700 hover:bg-red-900/40 active:scale-[0.96]
                                     transition-all duration-75 ease-out py-2.5 px-3 text-sm font-medium text-red-400 text-center"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={enterCreate}
          className="self-start text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + Create Program
        </button>
      </section>

      {/* Stop active program */}
      {activeProgram && (
        <button
          type="button"
          onClick={() => {
            clearActiveProgram();
            setActiveProgramState(null);
          }}
          className="self-center text-xs text-neutral-600 hover:text-neutral-400 transition-colors py-2"
        >
          Stop active program
        </button>
      )}
    </main>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`text-neutral-500 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
