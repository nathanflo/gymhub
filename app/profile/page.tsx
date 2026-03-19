"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const comingSoonMetrics = [
  { label: "Age" },
  { label: "Sex" },
  { label: "Height" },
  { label: "Weight" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? null);
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.name) setName(data.name);
    }
    load();
  }, [router]);

  const initial = name?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? "?";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="px-6 py-8 flex flex-col gap-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center
                        text-2xl font-bold text-white select-none">
          {initial}
        </div>
        <h1 className="text-xl font-bold text-white">{name ?? email ?? "Profile"}</h1>
      </div>

      {/* Account info */}
      <section>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Account
        </p>
        <dl className="rounded-2xl bg-neutral-800 divide-y divide-neutral-700">
          <div className="flex justify-between px-5 py-3">
            <dt className="text-sm text-neutral-400">Name</dt>
            <dd className="text-sm text-white">{name ?? "—"}</dd>
          </div>
          <div className="flex justify-between px-5 py-3">
            <dt className="text-sm text-neutral-400">Email</dt>
            <dd className="text-sm text-white">{email ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Personal metrics (coming soon) */}
      <section>
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Personal Metrics
        </p>
        <dl className="rounded-2xl bg-neutral-800 divide-y divide-neutral-700">
          {comingSoonMetrics.map(({ label }) => (
            <div key={label} className="flex justify-between px-5 py-3">
              <dt className="text-sm text-neutral-400">{label}</dt>
              <dd className="text-sm text-neutral-600 italic">Coming soon</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full rounded-2xl bg-neutral-800 hover:bg-red-900/40 active:scale-95
                   transition-all py-4 text-sm font-semibold text-red-400 text-center"
      >
        Sign Out
      </button>
    </main>
  );
}
