"use client";

import { memo } from "react";
import { Field, inputClass, selectClass } from "@/components/Field";
import { SessionFormState } from "./types";

const YOGA_STYLES = ["Flow", "Vinyasa", "Power", "Yin", "Stretch", "Custom"] as const;
const YOGA_INTENTIONS = ["Recovery", "Mobility", "Flexibility", "Relaxation", "Energy", "Mindfulness"] as const;
const YOGA_SOURCES = ["Self-guided", "Guided (App/Video)", "Class (Studio)"] as const;

export const YogaSection = memo(function YogaSection({
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
      {/* Style */}
      <Field label="Style">
        <select name="yogaStyle" value={form.yogaStyle} onChange={onChange} className={selectClass}>
          {YOGA_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {form.yogaStyle === "Custom" && (
        <Field label="Custom style">
          <input name="yogaCustomStyle" type="text" placeholder="e.g. Restorative"
            value={form.yogaCustomStyle} onChange={onChange} className={inputClass} />
        </Field>
      )}

      {/* Duration */}
      <Field label="Duration (min)">
        <input name="yogaDurationMinutes" type="number" inputMode="numeric" placeholder="e.g. 30"
          value={form.yogaDurationMinutes} onChange={onChange} className={inputClass} />
      </Field>

      {/* Intention chips */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Intention (optional)
        </span>
        <div className="flex flex-wrap gap-2">
          {YOGA_INTENTIONS.map(intention => (
            <button key={intention} type="button"
              onClick={() => setForm(f => ({ ...f, yogaIntention: f.yogaIntention === intention ? "" : intention }))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${form.yogaIntention === intention
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-300"}`}>
              {intention}
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Source (optional)
        </span>
        <div className="flex flex-wrap gap-2">
          {YOGA_SOURCES.map(source => (
            <button key={source} type="button"
              onClick={() => setForm(f => ({ ...f, yogaSource: f.yogaSource === source ? "" : source }))}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${form.yogaSource === source
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-300"}`}>
              {source}
            </button>
          ))}
        </div>
      </div>

      {/* Reflection ratings */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Reflection (optional)
        </span>
        {[
          { label: "Mobility",    field: "yogaMobilityRating" as const },
          { label: "Flexibility", field: "yogaFlexibilityRating" as const },
          { label: "Clarity",     field: "yogaClarityRating" as const },
        ].map(({ label, field }) => (
          <div key={field} className="flex items-center justify-between">
            <span className="text-sm text-neutral-400 w-24">{label}</span>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button"
                  onClick={() => setForm(f => ({ ...f, [field]: f[field] === String(n) ? "" : String(n) }))}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                    ${form[field] === String(n)
                      ? "bg-indigo-600 text-white"
                      : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
