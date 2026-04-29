"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, saveProfile } from "@/lib/profiles";
import { UserProfile } from "@/types/profile";
import { inputClass, selectClass, Field } from "@/components/Field";
import { parseLocation, stringifyLocation, searchLocations, formatLocationLabel, LocationSearchResult, getAliasQueries } from "@/lib/location";
import { track, reset } from "@/lib/analytics";

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

  // Location search state
  const [locationSearch,    setLocationSearch]    = useState("");
  const [locationResults,   setLocationResults]   = useState<LocationSearchResult[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationNoResults, setLocationNoResults] = useState(false);
  const [locationFallback,  setLocationFallback]  = useState(false);
  const [locationAliasMatch, setLocationAliasMatch] = useState(false);
  const [locationAliasQuery, setLocationAliasQuery] = useState("");

  useEffect(() => {
    async function load() {
      // getUser() always makes a live network request — fails offline unconditionally.
      // Use getSession() (reads from localStorage storage) with a Preferences backup
      // so previously-authenticated users are not redirected to login while offline.
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user ?? null;
      if (!user) {
        try {
          const { Preferences } = await import("@capacitor/preferences");
          const { value } = await Preferences.get({ key: "gymhub-auth-user" });
          if (value) user = JSON.parse(value);
        } catch {}
      }
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

  async function handleLocationSearch() {
    const raw = locationSearch.trim();
    if (!raw) return;

    // Normalize: collapse spaces, capitalize each word
    const normalized = raw
      .replace(/\s+/g, " ")
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    setLocationSearching(true);
    setLocationNoResults(false);
    setLocationFallback(false);
    setLocationAliasMatch(false);
    setLocationAliasQuery("");
    setLocationResults([]);
    try {
      const results = await searchLocations(normalized);
      if (results.length > 0) {
        setLocationResults(results);
      } else {
        // Step 2: alias fallback for known ambiguous places
        const aliasQueries = getAliasQueries(normalized);
        if (aliasQueries.length > 0) {
          const sets = await Promise.all(aliasQueries.map(q => searchLocations(q)));
          const seen = new Set<string>();
          const aliasResults: LocationSearchResult[] = [];
          for (const set of sets) {
            if (set[0] && !seen.has(set[0].label)) {
              seen.add(set[0].label);
              aliasResults.push(set[0]);
            }
          }
          if (aliasResults.length > 0) {
            setLocationResults(aliasResults);
            setLocationAliasMatch(true);
            setLocationAliasQuery(raw);
            return;
          }
        }
        // Step 3: first-word broad fallback
        const firstWord = normalized.split(" ")[0];
        const fallback = firstWord !== normalized ? await searchLocations(firstWord) : [];
        if (fallback.length > 0) {
          setLocationResults(fallback);
          setLocationFallback(true);
        } else {
          setLocationNoResults(true);
        }
      }
    } catch {
      setLocationNoResults(true);
    } finally {
      setLocationSearching(false);
    }
  }

  function handleLocationSelect(r: LocationSearchResult) {
    setForm(f => ({ ...f, city: stringifyLocation(r) }));
    setLocationSearch("");
    setLocationResults([]);
    setLocationNoResults(false);
    setLocationFallback(false);
    setLocationAliasMatch(false);
    setLocationAliasQuery("");
  }

  async function handleSignOut() {
    track("auth_signout");
    reset();
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

  const parsedCityRaw = parseLocation(form.city).label;
  const parsedCity = parsedCityRaw ? formatLocationLabel(parsedCityRaw) : null;

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

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Location
          </span>
          {parsedCity && (
            <div className="text-sm text-neutral-300 rounded-xl bg-neutral-800/60 px-3 py-2.5">
              {parsedCity}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              type="text"
              placeholder="Search for a place…"
              value={locationSearch}
              onChange={e => { setLocationSearch(e.target.value); setLocationResults([]); setLocationNoResults(false); setLocationFallback(false); setLocationAliasMatch(false); setLocationAliasQuery(""); }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleLocationSearch(); } }}
            />
            <button
              type="button"
              disabled={!locationSearch.trim() || locationSearching}
              onClick={handleLocationSearch}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white
                         disabled:opacity-50 active:scale-95 transition-all duration-150"
            >
              {locationSearching ? "…" : "Search"}
            </button>
          </div>
          {locationResults.length > 0 && (
            <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-700">
              {locationResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleLocationSelect(r)}
                  className="text-left px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-700
                             active:bg-neutral-600 border-b border-neutral-800 last:border-b-0 transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          {locationAliasMatch && locationResults.length > 0 && (
            <p className="text-xs text-neutral-500 px-1">Showing nearby matches for {locationAliasQuery}</p>
          )}
          {locationFallback && locationResults.length > 0 && (
            <p className="text-xs text-neutral-500 px-1">No exact match — showing closest places</p>
          )}
          {locationNoResults && (
            <p className="text-xs text-neutral-500 px-1">No results found — try a different spelling.</p>
          )}
        </div>
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
      <p className="text-xs text-neutral-600 text-center">FloForm v1.15.1</p>
    </main>
  );
}
