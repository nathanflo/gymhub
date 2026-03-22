"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Three sources, in order of reliability:
  //  1. ?code=  — PKCE recovery link landing here directly (may be cleared by
  //               Supabase before React renders, hence the layout early-script)
  //  2. ?recovery=1 — redirected here by auth/callback (legacy / implicit flow)
  //  3. sessionStorage — set by the layout early-script before Supabase runs,
  //                      survives URL cleanup by Supabase
  const isRecovery =
    searchParams.get("code") !== null ||
    searchParams.get("recovery") === "1" ||
    (typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("passwordRecovery") === "1");

  useEffect(() => {
    // Solidify the flag into sessionStorage the moment we confirm recovery,
    // so it survives any subsequent URL cleanup by Supabase.
    if (searchParams.get("code") !== null || searchParams.get("recovery") === "1") {
      sessionStorage.setItem("passwordRecovery", "1");
    }
    if (!isRecovery) {
      router.replace("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear the flag on unmount — covers abandonment (back nav, etc.).
  // On success, handleSubmit removes it first so this is a safe no-op.
  useEffect(() => {
    return () => {
      sessionStorage.removeItem("passwordRecovery");
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      sessionStorage.removeItem("passwordRecovery");
      setInfo("Password updated. Redirecting…");
      setTimeout(() => router.replace("/"), 1500);
    }
  }

  if (!isRecovery) return null;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">FloForm</h1>
          <p className="text-sm text-neutral-400 mt-1">Choose a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3
                         text-sm text-white placeholder:text-neutral-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Confirm password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-3
                         text-sm text-white placeholder:text-neutral-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {password.length > 0 && password.length < 8 && (
            <p className="text-sm text-red-400">Password must be at least 8 characters.</p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-indigo-400">{info}</p>}

          <button
            type="submit"
            disabled={loading || password.length < 8}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95
                       disabled:opacity-50 transition-all py-3 text-sm font-semibold text-white"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
