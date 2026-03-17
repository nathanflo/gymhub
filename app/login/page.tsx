"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
        <div className="w-full max-w-sm flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-sm text-neutral-400">
            We sent a magic link to{" "}
            <span className="text-white font-medium">{email}</span>.
            Click it to sign in.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">GymHub</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Sign in to sync your data across devices
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       disabled:opacity-50 transition-all py-3 text-sm font-semibold text-white"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
      </div>
    </main>
  );
}
