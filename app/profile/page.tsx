"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, saveProfile } from "@/lib/profiles";
import { UserProfile } from "@/types/profile";
import { inputClass, selectClass, Field } from "@/components/Field";

const emptyForm: UserProfile = {
  name: "",
  birth_date: null,
  sex: null,
  height_cm: null,
  bodyweight_kg: null,
  training_goal: null,
  city: null,
};

function clamp(value: number | null, min: number, max: number): number | null {
  if (value === null) return null;
  return Math.min(max, Math.max(min, value));
}

function parseNum(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState<UserProfile>(emptyForm);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);

  // Raw string values for numeric inputs
  const [heightStr, setHeightStr] = useState("");
  const [weightStr, setWeightStr] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? null);
      const profile = await getProfile();
      if (profile) {
        setForm(profile);
        setHeightStr(profile.height_cm !== null ? String(profile.height_cm) : "");
        setWeightStr(profile.bodyweight_kg !== null ? String(profile.bodyweight_kg) : "");
      }
      setLoaded(true);
    }
    load();
  }, [router]);

  const initial = form.name?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";

  async function handleSave() {
    const height_cm = clamp(parseNum(heightStr), 100, 250);
    const bodyweight_kg = clamp(parseNum(weightStr), 30, 200);

    const payload: UserProfile = {
      ...form,
      height_cm,
      bodyweight_kg,
      sex: form.sex || null,
      training_goal: form.training_goal || null,
      city: form.city || null,
    };

    setSaveState("saving");
    try {
      await saveProfile(payload);
      setForm(payload);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!loaded) {
    return (
      <main className="px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-neutral-800 animate-pulse" />
          <div className="h-6 w-32 rounded bg-neutral-800 animate-pulse" />
        </div>
      </main>
    );
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" :
    saveState === "saved"  ? "Saved ✓" :
    saveState === "error"  ? "Error — try again" :
    "Save Changes";

  return (
    <main className="px-6 pt-8 flex flex-col gap-6" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      {/* Avatar + display name */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center
                        text-2xl font-bold text-white select-none">
          {initial}
        </div>
        <h1 className="text-xl font-bold text-white">
          {form.name ? `Hi, ${form.name}` : "Hi there"}
        </h1>
        <p className="text-sm text-neutral-400">This helps FloForm tailor your training.</p>
      </div>

      {/* Account section */}
      <section className="flex flex-col gap-4">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Account
        </p>
        <Field label="Name">
          <input
            className={inputClass}
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-400">Email</span>
          <div className={`${inputClass} text-neutral-400 cursor-not-allowed`}>
            {email ?? "—"}
          </div>
        </div>
      </section>

      {/* Training Profile section */}
      <section className="flex flex-col gap-4">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Training Profile
        </p>

        <Field label="Birth Date">
          <input
            className={inputClass}
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            value={form.birth_date ?? ""}
            onChange={e => setForm(f => ({ ...f, birth_date: e.target.value || null }))}
          />
        </Field>

        <Field label="Sex">
          <select
            className={selectClass}
            value={form.sex ?? ""}
            onChange={e => setForm(f => ({ ...f, sex: e.target.value || null }))}
          >
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </Field>

        <Field label="Height (cm)">
          <input
            className={inputClass}
            type="number"
            placeholder="e.g. 175"
            min="100"
            max="250"
            value={heightStr}
            onChange={e => setHeightStr(e.target.value)}
          />
        </Field>

        <Field label="Bodyweight (kg)">
          <input
            className={inputClass}
            type="number"
            placeholder="e.g. 75"
            min="30"
            max="200"
            value={weightStr}
            onChange={e => setWeightStr(e.target.value)}
          />
        </Field>

        <Field label="Training Goal">
          <select
            className={selectClass}
            value={form.training_goal ?? ""}
            onChange={e => setForm(f => ({ ...f, training_goal: e.target.value || null }))}
          >
            <option value="">Select…</option>
            <option value="Build Muscle">Build Muscle</option>
            <option value="Lose Fat">Lose Fat</option>
            <option value="Improve Fitness">Improve Fitness</option>
            <option value="Sport Performance">Sport Performance</option>
            <option value="Maintain">Maintain</option>
            <option value="Other">Other</option>
          </select>
        </Field>

        <Field label="City">
          <input
            className={inputClass}
            type="text"
            placeholder="e.g. London"
            value={form.city ?? ""}
            onChange={e => setForm(f => ({ ...f, city: e.target.value || null }))}
          />
        </Field>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saveState === "saving"}
        className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                   disabled:opacity-60 transition-all py-4 text-sm font-semibold text-white text-center"
      >
        {saveLabel}
      </button>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full rounded-2xl bg-neutral-800 hover:bg-red-900/40 active:scale-95
                   transition-all py-4 text-sm font-semibold text-red-400 text-center"
      >
        Sign Out
      </button>
      <p className="text-xs text-neutral-600 text-center">FloForm v1.12.2</p>
    </main>
  );
}
