"use client";

/**
 * Auth callback page – handles magic link and password recovery redirects.
 * With implicit flow, Supabase parses the access_token from the URL hash
 * automatically and fires an auth event. PASSWORD_RECOVERY goes to the
 * reset-password page; SIGNED_IN runs migration and goes home.
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
        if (event === "PASSWORD_RECOVERY") {
          router.replace("/reset-password");
        } else if (event === "SIGNED_IN" && session) {
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
