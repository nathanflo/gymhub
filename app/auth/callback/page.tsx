"use client";

/**
 * Auth callback page – handles magic link and password recovery redirects.
 *
 * Recovery detection problem:
 *   Supabase initializes during module load, processes the URL hash, clears it,
 *   and fires PASSWORD_RECOVERY — all before our useEffect listener is registered.
 *   By the time we subscribe, Supabase re-emits the session as SIGNED_IN (not
 *   PASSWORD_RECOVERY), and the hash is already gone.
 *
 * Fix:
 *   layout.tsx contains an early inline <script> that runs before any JS and
 *   writes sessionStorage.passwordRecovery = "1" if type=recovery is in the hash.
 *   We read that flag here instead of the (already-cleared) hash.
 *
 *   We handle BOTH PASSWORD_RECOVERY and SIGNED_IN as recovery triggers so the
 *   redirect works regardless of which event Supabase actually delivers.
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
    // Set by the early <script> in layout.tsx before Supabase clears the hash.
    const isRecoveryLink = sessionStorage.getItem("passwordRecovery") === "1";
    let handledRecovery = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          handledRecovery = true;
          goToResetPassword(router);
        } else if (event === "SIGNED_IN" && session) {
          if (isRecoveryLink || handledRecovery) {
            // Recovery session delivered as SIGNED_IN — still go to reset page.
            handledRecovery = true;
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
