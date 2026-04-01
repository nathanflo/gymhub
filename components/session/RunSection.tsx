"use client";

import { memo } from "react";
import { Field, inputClass } from "@/components/Field";
import { SessionFormState } from "./types";

const RUN_SUBTYPE_LABELS = {
  easy: "Easy Run", intervals: "Intervals", incline: "Incline Walk",
  tempo: "Tempo", long: "Long Run", custom: "Custom",
} as const;

export const RunSection = memo(function RunSection({
  form,
  onChange,
  setForm,
}: {
  form: SessionFormState;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setForm: React.Dispatch<React.SetStateAction<SessionFormState>>;
  inputClass: string;
  selectClass: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Run subtype selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Run type</label>
        <div className="flex flex-wrap gap-2">
          {(["easy", "intervals", "incline", "tempo", "long", "custom"] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setForm((f) => ({ ...f, runSubtype: sub }))}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                form.runSubtype === sub
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {RUN_SUBTYPE_LABELS[sub]}
            </button>
          ))}
        </div>
      </div>

      {/* Subtype-specific fields */}
      {form.runSubtype === "easy" && (
        <div className="flex gap-3">
          <Field label="Duration" className="flex-1">
            <input name="duration" type="text" placeholder="e.g. 31:45 or 45 min"
              value={form.duration} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Distance (km) — optional" className="flex-1">
            <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 5"
              value={form.distance} onChange={onChange} className={inputClass} />
          </Field>
        </div>
      )}

      {form.runSubtype === "intervals" && (
        <div className="flex flex-col gap-4">
          {/* Quick presets */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-neutral-500 tracking-wide">Quick presets</span>
            <div className="flex gap-2 flex-wrap">
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, runIntervalWork: "3:00", runIntervalRecover: "1:00", runIntervalRepeat: "6", runIncline: "6" }))}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                3:00 incline + 1:00 run × 6
              </button>
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, runIntervalWork: "1:00", runIntervalRecover: "1:00", runIntervalRepeat: "8", runIncline: "" }))}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                1:00 / 1:00 × 8
              </button>
            </div>
          </div>
          {/* Interval builder */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-neutral-500 tracking-wide">Define your interval pattern</span>
            <div className="bg-neutral-800/50 border border-white/5 rounded-2xl px-4 py-4">
              <div className="flex gap-3">
                <Field label="Work" className="flex-1">
                  <input name="runIntervalWork" type="text" placeholder="e.g. 3:00 (incline walk)"
                    value={form.runIntervalWork} onChange={onChange} className={inputClass} />
                </Field>
                <Field label="Recover" className="flex-1">
                  <input name="runIntervalRecover" type="text" placeholder="e.g. 1:00 (easy jog)"
                    value={form.runIntervalRecover} onChange={onChange} className={inputClass} />
                </Field>
                <Field label="Repeat" className="w-20">
                  <input name="runIntervalRepeat" type="number" inputMode="numeric" placeholder="8"
                    value={form.runIntervalRepeat} onChange={onChange} className={inputClass} />
                </Field>
              </div>
            </div>
          </div>
          {/* Optional: incline + speed */}
          <div className="flex gap-3">
            <Field label="Incline % (optional)" className="flex-1">
              <input name="runIncline" type="number" inputMode="decimal" placeholder="e.g. 6"
                value={form.runIncline} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Speed note (optional)" className="flex-1">
              <input name="runSpeed" type="text" placeholder="e.g. 6.5 km/h"
                value={form.runSpeed} onChange={onChange} className={inputClass} />
            </Field>
          </div>
        </div>
      )}

      {form.runSubtype === "incline" && (
        <div className="flex flex-col gap-3">
          <Field label="Duration">
            <input name="duration" type="text" placeholder="e.g. 30 min"
              value={form.duration} onChange={onChange} className={inputClass} />
          </Field>
          <div className="flex gap-3">
            <Field label="Incline %" className="flex-1">
              <input name="runIncline" type="number" inputMode="decimal" placeholder="e.g. 6"
                value={form.runIncline} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Speed (optional)" className="flex-1">
              <input name="runSpeed" type="text" placeholder="e.g. 6.5 km/h"
                value={form.runSpeed} onChange={onChange} className={inputClass} />
            </Field>
          </div>
        </div>
      )}

      {form.runSubtype === "tempo" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Field label="Duration" className="flex-1">
              <input name="duration" type="text" placeholder="e.g. 25 min"
                value={form.duration} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Distance (km) — optional" className="flex-1">
              <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 5"
                value={form.distance} onChange={onChange} className={inputClass} />
            </Field>
          </div>
          <Field label="Pace / effort note (optional)">
            <input name="runSpeed" type="text" placeholder="e.g. 5:10 /km, threshold effort"
              value={form.runSpeed} onChange={onChange} className={inputClass} />
          </Field>
        </div>
      )}

      {form.runSubtype === "long" && (
        <div className="flex gap-3">
          <Field label="Distance (km)" className="flex-1">
            <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 10"
              value={form.distance} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Duration" className="flex-1">
            <input name="duration" type="text" placeholder="e.g. 58:10"
              value={form.duration} onChange={onChange} className={inputClass} />
          </Field>
        </div>
      )}

      {form.runSubtype === "custom" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Field label="Distance (km)" className="flex-1">
              <input name="distance" type="number" inputMode="decimal" placeholder="e.g. 5"
                value={form.distance} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Duration" className="flex-1">
              <input name="duration" type="text" placeholder="e.g. 31:45 or 45 min"
                value={form.duration} onChange={onChange} className={inputClass} />
            </Field>
          </div>
          <Field label="Intervals (optional)">
            <input name="intervals" type="text" placeholder="e.g. 4 x 400m"
              value={form.intervals} onChange={onChange} className={inputClass} />
          </Field>
        </div>
      )}
    </div>
  );
});
