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

  // Recovery is confirmed when the callback planted ?recovery=1 in the URL
  // (also mirrored in sessionStorage as a fallback).
  const isRecovery =
    searchParams.get("recovery") === "1" ||
    (typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("passwordRecovery") === "1");

  useEffect(() => {
    // If there is no recovery marker this page was reached directly without a
    // valid reset link — send the user somewhere safe.
    if (!isRecovery) {
      router.replace("/login");
    }
  }, [isRecovery, router]);

  // Clear the recovery marker whenever this page unmounts, covering the case
  // where the user exits without completing the form (back navigation, tab
  // close, etc.). On success, handleSubmit removes it first, so this is a
  // safe no-op in that path.
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
      // Clear the recovery marker before navigating away.
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
