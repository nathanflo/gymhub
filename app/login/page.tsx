"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runMigrationIfNeeded } from "@/lib/migrate";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      await runMigrationIfNeeded(data.session!.user.id);
      router.push("/");
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      if (!data.session) {
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin");
        return;
      }
      await runMigrationIfNeeded(data.session.user.id);
      router.push("/");
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">GymHub</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {mode === "signin" ? "Sign in to sync your data across devices" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3
                         text-sm text-white placeholder:text-neutral-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3
                         text-sm text-white placeholder:text-neutral-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-indigo-400">{info}</p>}

          {mode === "signup" && password.length > 0 && password.length < 8 && (
            <p className="text-sm text-red-400">Password must be at least 8 characters.</p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "signup" && password.length > 0 && password.length < 8)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       disabled:opacity-50 transition-all py-3 text-sm font-semibold text-white"
          >
            {loading
              ? (mode === "signin" ? "Signing in…" : "Creating account…")
              : (mode === "signin" ? "Sign in" : "Create account")}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors text-center"
        >
          {mode === "signin" ? "No account yet? Create one →" : "Already have an account? Sign in →"}
        </button>
      </div>
    </main>
  );
}
