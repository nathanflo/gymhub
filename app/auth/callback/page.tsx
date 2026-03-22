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
  sessionStorage.setItem("passwordRecovery", "1");
  router.replace("/reset-password?recovery=1");
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    // Re-check hash and query params here in case the early layout script
    // missed them (e.g. OTP links use ?type=recovery as a query param).
    const urlIndicatesRecovery =
      hash.includes("type=recovery") ||
      new URLSearchParams(search).get("type") === "recovery";

    if (urlIndicatesRecovery) {
      sessionStorage.setItem("passwordRecovery", "1");
    }

    const isRecoveryLink =
      urlIndicatesRecovery ||
      sessionStorage.getItem("passwordRecovery") === "1";

    // --- DEBUG (temporary — remove after confirming the flow works) ---
    console.log("[auth/callback] hash:", hash);
    console.log("[auth/callback] search:", search);
    console.log("[auth/callback] urlIndicatesRecovery:", urlIndicatesRecovery);
    console.log("[auth/callback] sessionStorage.passwordRecovery:", sessionStorage.getItem("passwordRecovery"));
    console.log("[auth/callback] isRecoveryLink:", isRecoveryLink);
    // ------------------------------------------------------------------

    let handled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // --- DEBUG (temporary) ---
        console.log("[auth/callback] auth event:", event, "| session:", !!session, "| isRecoveryLink:", isRecoveryLink, "| handled:", handled);
        // -------------------------

        if (event === "PASSWORD_RECOVERY") {
          handled = true;
          goToResetPassword(router);
        } else if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          session &&
          !handled
        ) {
          handled = true;
          if (isRecoveryLink) {
            goToResetPassword(router);
          } else {
            await runMigrationIfNeeded(session.user.id);
            router.replace("/");
          }
        }
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
