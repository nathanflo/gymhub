"use client";

/**
 * Auth callback page – handles email confirmation (signup) redirects.
 *
 * Password recovery links now go directly to /reset-password (PKCE flow),
 * so this page only needs to handle SIGNED_IN / INITIAL_SESSION for
 * email confirmation and then send the user home.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runMigrationIfNeeded } from "@/lib/migrate";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let handled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          session &&
          !handled
        ) {
          handled = true;
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
