"use client";

/**
 * Auth callback page – handles magic link and password recovery redirects.
 * With implicit flow, Supabase parses the access_token from the URL hash
 * automatically and fires an auth event.
 *
 * Recovery detection uses two layers:
 * 1. `isRecoveryLink` — read from the URL hash before any events fire, so
 *    an early SIGNED_IN event (fired for an existing cookie session) is
 *    skipped even if it arrives before PASSWORD_RECOVERY.
 * 2. `handledRecovery` flag — blocks any subsequent SIGNED_IN after
 *    PASSWORD_RECOVERY fires, covering the case where there is no prior
 *    session and the events fire in the expected order.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runMigrationIfNeeded } from "@/lib/migrate";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Read the hash before subscribing so we know immediately if this is a
    // recovery link, regardless of which auth event fires first.
    const isRecoveryLink =
      typeof window !== "undefined" &&
      window.location.hash.includes("type=recovery");

    let handledRecovery = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          handledRecovery = true;
          sessionStorage.setItem("passwordRecovery", "1");
          router.replace("/reset-password?recovery=1");
        } else if (
          event === "SIGNED_IN" &&
          session &&
          !isRecoveryLink &&
          !handledRecovery
        ) {
          await runMigrationIfNeeded(session.user.id);
          router.replace("/");
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
