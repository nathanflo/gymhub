"use client";

/**
 * Auth callback page – handles magic link and password recovery redirects.
 *
 * Recovery detection layers (most → least reliable):
 *  1. layout.tsx early <script> sets sessionStorage.passwordRecovery before
 *     any JS runs — survives Supabase clearing the hash.
 *  2. useEffect re-checks the hash AND query params at mount time, in case
 *     the project uses OTP-style (?type=recovery) instead of hash fragments,
 *     or in case the early script ran after Supabase already cleared the hash.
 *  3. PASSWORD_RECOVERY auth event — ideal path, but only fires if a listener
 *     is registered before Supabase processes the URL.
 *  4. SIGNED_IN / INITIAL_SESSION with recovery flag — fallback when the
 *     session is established before our listener subscribes.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runMigrationIfNeeded } from "@/lib/migrate";

function goToResetPassword(router: ReturnType<typeof useRouter>) {
  console.log("[auth/callback] → DECISION: going to /reset-password");
  sessionStorage.setItem("passwordRecovery", "1");
  console.log("[auth/callback] sessionStorage.passwordRecovery after set:", sessionStorage.getItem("passwordRecovery"));
  router.replace("/reset-password?recovery=1");
}

function goHome(router: ReturnType<typeof useRouter>) {
  console.log("[auth/callback] → DECISION: going to / (home)");
  router.replace("/");
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // ── URL snapshot ──────────────────────────────────────────────────────
    console.log("[auth/callback] ── useEffect fired ──────────────────────");
    console.log("[auth/callback] pathname  :", window.location.pathname);
    console.log("[auth/callback] full href :", window.location.href);
    console.log("[auth/callback] search    :", window.location.search);
    console.log("[auth/callback] hash      :", window.location.hash);

    const hash = window.location.hash;
    const search = window.location.search;

    // ── Recovery detection from URL ───────────────────────────────────────
    const recoveryInHash = hash.includes("type=recovery");
    const recoveryInSearch = new URLSearchParams(search).get("type") === "recovery";
    const urlIndicatesRecovery = recoveryInHash || recoveryInSearch;

    console.log("[auth/callback] type=recovery in hash?  ", recoveryInHash);
    console.log("[auth/callback] type=recovery in search?", recoveryInSearch);
    console.log("[auth/callback] urlIndicatesRecovery    :", urlIndicatesRecovery);

    // ── sessionStorage BEFORE any changes ─────────────────────────────────
    console.log("[auth/callback] sessionStorage.passwordRecovery (before):", sessionStorage.getItem("passwordRecovery"));

    if (urlIndicatesRecovery) {
      sessionStorage.setItem("passwordRecovery", "1");
      console.log("[auth/callback] sessionStorage.passwordRecovery (after url set):", sessionStorage.getItem("passwordRecovery"));
    }

    const isRecoveryLink =
      urlIndicatesRecovery ||
      sessionStorage.getItem("passwordRecovery") === "1";

    console.log("[auth/callback] isRecoveryLink (final)  :", isRecoveryLink);
    console.log("[auth/callback] ─────────────────────────────────────────");

    let handled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[auth/callback] ── auth event fired ─────────────────");
        console.log("[auth/callback] event          :", event);
        console.log("[auth/callback] session exists :", !!session);
        console.log("[auth/callback] isRecoveryLink :", isRecoveryLink);
        console.log("[auth/callback] handled        :", handled);

        if (event === "PASSWORD_RECOVERY") {
          console.log("[auth/callback] matched: PASSWORD_RECOVERY");
          handled = true;
          goToResetPassword(router);

        } else if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          session &&
          !handled
        ) {
          console.log("[auth/callback] matched:", event, "— checking recovery flag");
          handled = true;
          if (isRecoveryLink) {
            goToResetPassword(router);
          } else {
            await runMigrationIfNeeded(session.user.id);
            goHome(router);
          }

        } else {
          console.log("[auth/callback] event not acted on (handled:", handled, ")");
        }

        console.log("[auth/callback] handled (after):", handled);
        console.log("[auth/callback] ─────────────────────────────────────");
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-neutral-400 text-sm">Signing in…</p>
    </main>
  );
}
