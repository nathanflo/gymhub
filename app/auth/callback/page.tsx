"use client";

/**
 * Auth callback page – handles the magic link redirect.
 * With implicit flow, Supabase parses the access_token from the URL hash
 * automatically and fires a SIGNED_IN event. We catch it here, run migration,
 * and redirect to home.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runMigrationIfNeeded } from "@/lib/migrate";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
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
