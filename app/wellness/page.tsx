"use client";

import { useEffect, useState } from "react";
import { getWellnessEntries, getWellnessForDate, saveWellnessEntry, deleteWellnessEntry } from "@/lib/wellness";
import { WellnessEntry } from "@/types/wellness";
import { inputClass } from "@/components/Field";

const today = new Date().toISOString().slice(0, 10);

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function wellnessSummary(entry: WellnessEntry): string {
  const parts: string[] = [];
  if (entry.sleep != null) parts.push(`💤 ${entry.sleep}h`);
  if (entry.hydration != null) parts.push(`💧 ${entry.hydration}L`);
  if (entry.caffeine != null) parts.push(`☕ ${entry.caffeine}`);
  if (entry.mood != null) parts.push(`Mood ${entry.mood}`);
  if (entry.soreness != null) parts.push(`Soreness ${entry.soreness}`);
  return parts.join(" · ");
}

function PillPicker({
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-full text-sm font-semibold transition-colors
              ${value === n
                ? "bg-indigo-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between w-[232px]">
        <span className="text-xs text-neutral-600">{minLabel}</span>
        <span className="text-xs text-neutral-600">{maxLabel}</span>
      </div>
    </div>
  );
}

export default function WellnessPage() {
  const [sleep, setSleep] = useState("");
  const [hydration, setHydration] = useState("");
  const [caffeine, setCaffeine] = useState("");
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [soreness, setSoreness] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | undefined>(undefined);
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [saved, setSaved] = useState(false);

  function loadData() {
    const todayEntry = getWellnessForDate(today);
    if (todayEntry) {
      setExistingId(todayEntry.id);
      setSleep(todayEntry.sleep != null ? String(todayEntry.sleep) : "");
      setHydration(todayEntry.hydration != null ? String(todayEntry.hydration) : "");
      setCaffeine(todayEntry.caffeine != null ? String(todayEntry.caffeine) : "");
      setMood(todayEntry.mood);
      setSoreness(todayEntry.soreness);
      setNotes(todayEntry.notes ?? "");
    }
    setEntries(getWellnessEntries());
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleSave() {
    const entry: WellnessEntry = {
      id: existingId ?? crypto.randomUUID(),
      date: today,
      ...(sleep !== "" && !isNaN(parseFloat(sleep)) ? { sleep: parseFloat(sleep) } : {}),
      ...(hydration !== "" && !isNaN(parseFloat(hydration)) ? { hydration: parseFloat(hydration) } : {}),
      ...(caffeine !== "" && !isNaN(parseFloat(caffeine)) ? { caffeine: parseFloat(caffeine) } : {}),
      ...(mood != null ? { mood: mood as 1 | 2 | 3 | 4 | 5 } : {}),
      ...(soreness != null ? { soreness: soreness as 1 | 2 | 3 | 4 | 5 } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    saveWellnessEntry(entry);
    setExistingId(entry.id);
    setEntries(getWellnessEntries());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete(id: string) {
    deleteWellnessEntry(id);
    setEntries(getWellnessEntries());
  }

  return (
    <main className="flex flex-col flex-1 px-6 py-8 gap-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Wellness</h1>
        <p className="text-sm text-neutral-500 mt-1">{formatDate(today)}</p>
      </div>

      {/* ── Today's Check-in ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Today's Check-in
        </h2>
        {existingId && (
          <p className="text-xs text-neutral-500 -mt-2">Editing today's check-in</p>
        )}

        {/* Number inputs row */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-neutral-400">Sleep</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 7.5"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                className={inputClass + " flex-1"}
              />
              <span className="text-xs text-neutral-500 shrink-0">hrs</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-neutral-400">Hydration</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 2.5"
                value={hydration}
                onChange={(e) => setHydration(e.target.value)}
                className={inputClass + " flex-1"}
              />
              <span className="text-xs text-neutral-500 shrink-0">L</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-neutral-400">Caffeine</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 2"
                value={caffeine}
                onChange={(e) => setCaffeine(e.target.value)}
                className={inputClass + " flex-1"}
              />
              <span className="text-xs text-neutral-500 shrink-0">cups</span>
            </div>
          </div>
        </div>

        {/* Mood picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-neutral-400">Mood</label>
          <PillPicker
            value={mood}
            onChange={(n) => setMood(mood === n ? undefined : n)}
            minLabel="1 = low"
            maxLabel="5 = great"
          />
        </div>

        {/* Soreness picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-neutral-400">Soreness</label>
          <PillPicker
            value={soreness}
            onChange={(n) => setSoreness(soreness === n ? undefined : n)}
            minLabel="1 = fresh"
            maxLabel="5 = very sore"
          />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">
            Notes <span className="text-neutral-500">optional</span>
          </label>
          <textarea
            rows={2}
            placeholder="How are you feeling?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass + " resize-none"}
          />
        </div>

        <button
          onClick={handleSave}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                     transition-all px-5 py-3 text-sm font-semibold text-white self-start"
        >
          {saved ? "Saved ✓" : existingId ? "Update" : "Save"}
        </button>
      </section>

      {/* ── Recent Entries ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Recent Entries
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-neutral-600">No entries yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-white">{formatDate(entry.date)}</span>
                  <span className="text-xs text-neutral-400">{wellnessSummary(entry)}</span>
                  {entry.notes && (
                    <span className="text-xs text-neutral-500 italic">{entry.notes}</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs text-neutral-600 hover:text-red-400 transition-colors shrink-0 ml-4"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
